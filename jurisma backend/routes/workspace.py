from flask import Blueprint, request
from db.connection import supabase
from utils.responses import success_response, bad_request, not_found, forbidden, error_response
from utils.auth_helpers import token_required, roles_required
from utils.notifications import notify_case_participants
import uuid
import json

workspace_bp = Blueprint('workspace', __name__)

# --- Drafting Templates ---

@workspace_bp.route('/templates', methods=['GET'])
@token_required
def get_templates():
    category = request.args.get('category')
    try:
        query = supabase.table("drafting_templates").select("*").eq("is_public", True)
        
        if category:
            query = query.eq("category", category)
            
        res = query.execute()
        return success_response(data=res.data)
    except Exception as e:
        return success_response(data=[])

@workspace_bp.route('/generated-documents', methods=['POST'])
@token_required
def generate_document():
    user_id = request.user['sub']
    data = request.get_json()
    template_id = data.get('template_id')
    fields_data = data.get('fields_data', {})
    
    if not template_id:
        return bad_request("Template ID is required")
        
    try:
        gen_id = str(uuid.uuid4())
        doc_url = f"https://storage.jurisma.com/generated/{gen_id}.pdf"
        
        supabase.table("generated_documents").insert({
            "id": gen_id,
            "template_id": template_id,
            "user_id": user_id,
            "document_url": doc_url,
            "fields_data": fields_data
        }).execute()
        
        # Increment usage count
        supabase.rpc("increment_template_usage", {"temp_id": template_id}).execute()
        
        return success_response(data={"generated_id": gen_id, "document_url": doc_url}, status_code=201)
    except Exception as e:
        return error_response(str(e))
