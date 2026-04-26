import jwt
import datetime
from functools import wraps
from flask import request
from config import config
from utils.responses import unauthorized, forbidden
import logging

logger = logging.getLogger(__name__)

def generate_token(user_id, role, expires_in=3600):
    """Generate a JWT token."""
    payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=expires_in),
        'iat': datetime.datetime.utcnow(),
        'sub': str(user_id),
        'role': role
    }
    return jwt.encode(payload, config.SECRET_KEY, algorithm='HS256')

def decode_token(token):
    """Decode a JWT token."""
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        logger.error("Token expired")
        return None
    except jwt.InvalidTokenError:
        logger.error("Invalid token")
        return None

def token_required(f):
    """Decorator to require a valid JWT token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            logger.info(f"Auth header present: {auth_header[:15]}...")
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
            else:
                logger.warning("Auth header missing Bearer prefix")
        else:
            logger.warning("No Authorization header found")
        
        if not token:
            logger.warning("Authentication failed: Access token is missing")
            return unauthorized("Access token is missing")
        
        data = decode_token(token)
        if not data:
            logger.warning("Authentication failed: Invalid or expired token")
            return unauthorized("Invalid or expired token")
            
        request.user = data
        return f(*args, **kwargs)
    
    return decorated

def roles_required(*roles):
    """Decorator to require specific roles."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'user'):
                return unauthorized("Authentication required")
                
            if request.user.get('role') not in roles:
                return forbidden("Permission denied for this role")
                
            return f(*args, **kwargs)
        return decorated
    return decorator
