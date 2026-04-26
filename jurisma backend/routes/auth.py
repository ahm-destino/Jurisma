from flask import Blueprint, request
import bcrypt
import uuid
import datetime
from db.connection import supabase
from utils.responses import success_response, error_response, bad_request, unauthorized
from utils.auth_helpers import generate_token, token_required
from config import config

auth_bp = Blueprint('auth', __name__)

# --- Auth Index ---

@auth_bp.route('/', methods=['GET'])
def auth_index():
    return success_response(message="Jurisma Auth API is active. Use /login, /register, etc.")

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    role = data.get('role', 'guest')
    phone = data.get('phone')
    location = data.get('location')
    
    if not email or not password or not name:
        return bad_request("Email, password, and name are required")
    
    try:
        # Check if user exists
        existing = supabase.table("users").select("id").eq("email", email).execute()
        if existing.data:
            return error_response("User already exists", "USER_ALREADY_EXISTS", 409)
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user
        user_id = str(uuid.uuid4())
        user_node = {
            "id": user_id,
            "email": email,
            "password_hash": password_hash,
            "name": name,
            "role": role,
            "phone": phone,
            "location": location
        }
        user_insert = supabase.table("users").insert(user_node).execute()
        created_at = user_insert.data[0].get('created_at') if user_insert.data else datetime.datetime.utcnow().isoformat()
        
        # Determine additional profile creation based on role
        if role == 'student':
            supabase.table("student_profiles").insert({
                "user_id": user_id,
                "institution": data.get('institution', 'Unknown')
            }).execute()
        elif role == 'lawyer':
            supabase.table("lawyer_profiles").insert({
                "user_id": user_id,
                "call_to_bar_year": data.get('callToBarYear')
            }).execute()
            # If practiceAreas are provided, we could handle them via junction table, 
            # but for now we'll stick to basic profile creation.
            
        # Generate tokens for immediate login after registration
        access_token = generate_token(user_id, role, config.JWT_ACCESS_TOKEN_EXPIRES)
        refresh_token = generate_token(user_id, role, config.JWT_REFRESH_TOKEN_EXPIRES)
        
        # Store refresh token
        expires_at = (datetime.datetime.utcnow() + datetime.timedelta(days=7)).isoformat()
        supabase.table("refresh_tokens").insert({
            "user_id": user_id,
            "token": refresh_token,
            "expires_at": expires_at
        }).execute()
            
        return success_response(
            data={
                "user": {
                    "id": user_id,
                    "email": email,
                    "name": name,
                    "role": role,
                    "createdAt": created_at
                },
                "accessToken": access_token,
                "refreshToken": refresh_token
            },
            status_code=201
        )
    except Exception as e:
        return error_response(str(e))

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return bad_request("Email and password are required")
    
    try:
        user_res = supabase.table("users").select("*").eq("email", email).execute()
        if not user_res.data:
            return unauthorized("Invalid email or password")
            
        user = user_res.data[0]
        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return unauthorized("Invalid email or password")
        
        # Update last login
        supabase.table("users").update({"last_login_at": "now()"}).eq("id", user['id']).execute()
        
        # Generate tokens
        access_token = generate_token(user['id'], user['role'], config.JWT_ACCESS_TOKEN_EXPIRES)
        refresh_token = generate_token(user['id'], user['role'], config.JWT_REFRESH_TOKEN_EXPIRES)
        
        # Store refresh token
        expires_at = (datetime.datetime.utcnow() + datetime.timedelta(days=7)).isoformat()
        supabase.table("refresh_tokens").insert({
            "user_id": user['id'],
            "token": refresh_token,
            "expires_at": expires_at
        }).execute()
        
        return success_response(data={
            "user": {
                "id": user['id'],
                "email": user['email'],
                "name": user['name'],
                "role": user['role'],
                "createdAt": user.get('created_at')
            },
            "accessToken": access_token,
            "refreshToken": refresh_token
        })
    except Exception as e:
        return error_response(str(e))

@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    user_id = request.user['sub']
    
    try:
        user_res = supabase.table("users").select("id, email, name, role, status, phone, avatar, bio, location, created_at").eq("id", user_id).execute()
        if not user_res.data:
            return error_response("User not found", "NOT_FOUND", 404)
            
        user = user_res.data[0]
        
        # Get profile based on role
        profile_data = {}
        if user['role'] == 'student':
            p_res = supabase.table("student_profiles").select("*").eq("user_id", user_id).execute()
            profile_data = p_res.data[0] if p_res.data else {}
        elif user['role'] == 'lawyer':
            p_res = supabase.table("lawyer_profiles").select("*").eq("user_id", user_id).execute()
            profile_data = p_res.data[0] if p_res.data else {}
            
        user['profile'] = profile_data
        return success_response(data=user)
    except Exception as e:
        return error_response(str(e))

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    data = request.get_json()
    refresh_token = data.get('refreshToken') or data.get('refresh_token')
    if not refresh_token:
        return bad_request("Refresh token is required")
        
    try:
        # Validate refresh token from db
        now = datetime.datetime.utcnow().isoformat()
        stored_res = supabase.table("refresh_tokens").select("*").eq("token", refresh_token).eq("revoked", False).gt("expires_at", now).execute()
        
        if not stored_res.data:
            return unauthorized("Invalid or expired refresh token")
            
        from utils.auth_helpers import decode_token
        decoded_data = decode_token(refresh_token)
        if not decoded_data:
            return unauthorized("Invalid token payload")
            
        # Generate new tokens
        new_access_token = generate_token(decoded_data['sub'], decoded_data['role'], config.JWT_ACCESS_TOKEN_EXPIRES)
        new_refresh_token = generate_token(decoded_data['sub'], decoded_data['role'], config.JWT_REFRESH_TOKEN_EXPIRES)
        
        # Revoke old and store new refresh token (optional but recommended for rotation)
        supabase.table("refresh_tokens").update({"revoked": True}).eq("token", refresh_token).execute()
        expires_at = (datetime.datetime.utcnow() + datetime.timedelta(days=7)).isoformat()
        supabase.table("refresh_tokens").insert({
            "user_id": decoded_data['sub'],
            "token": new_refresh_token,
            "expires_at": expires_at
        }).execute()
        
        return success_response(data={
            "accessToken": new_access_token,
            "refreshToken": new_refresh_token
        })
    except Exception as e:
        return error_response(str(e))

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    data = request.get_json() or {}
    refresh_token = data.get('refreshToken') or data.get('refresh_token')
    if refresh_token:
        try:
            supabase.table("refresh_tokens").update({"revoked": True}).eq("token", refresh_token).execute()
        except:
            pass
    return success_response(message="Logged out successfully")
