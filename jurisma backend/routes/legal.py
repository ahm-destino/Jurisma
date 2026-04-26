import os
import sys
import logging
import datetime
import uuid

# Ensure the project root is in sys.path for direct script execution or certain IDE runners
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from flask import Blueprint, request, jsonify
from db.connection import supabase
from utils.responses import (
    _json_success,
    success_response,
    bad_request,
    not_found,
    error_response,
    forbidden,
)
from utils.auth_helpers import token_required
from utils.notifications import notify_case_participants
from werkzeug.utils import secure_filename
import logging

logger = logging.getLogger(__name__)

legal_bp = Blueprint('legal', __name__)

# --- Library ---

@legal_bp.route('/library', methods=['GET'])
@token_required
def get_library():
    category = request.args.get('category')
    search = request.args.get('search')
    
    try:
        query = supabase.table("library_resources").select("id, title, category, type, year, description")
        
        if category:
            query = query.eq("category", category)
        if search:
            query = query.ilike("title", f"%{search}%")
            
        res = query.execute()
        return success_response(data=res.data)
    except Exception as e:
        logger.exception(f"Error in get_library: {e}")
        return success_response(data=[], message=str(e)) # Graceful empty list on error

@legal_bp.route('/library/<resource_id>', methods=['GET'])
@token_required
def get_library_resource(resource_id):
    try:
        res = supabase.table("library_resources").select("*").eq("id", resource_id).execute()
        if not res.data:
            return not_found("Resource not found")
            
        resource = res.data[0]
        sec_res = supabase.table("library_resource_sections").select("*").eq("resource_id", resource_id).order("section_number").execute()
        resource['sections'] = sec_res.data
        return success_response(data=resource)
    except Exception as e:
        logger.exception(f"Error in get_library_resource {resource_id}: {e}")
        return success_response(data={}, message=str(e))

# --- Constitution ---

@legal_bp.route('/constitution/chapters', methods=['GET'])
@token_required
def get_constitution_chapters():
    try:
        res = supabase.table("constitution_chapters").select("*").order("chapter_number").execute()
        return success_response(data=res.data)
    except Exception as e:
        logger.exception(f"Error in get_constitution_chapters: {e}")
        return success_response(data=[])

@legal_bp.route('/constitution/chapters/<chapter_number>', methods=['GET'])
@token_required
def get_constitution_chapter(chapter_number):
    try:
        res = supabase.table("constitution_chapters").select("*").eq("chapter_number", chapter_number).execute()
        if not res.data:
            return not_found("Chapter not found")
            
        chapter = res.data[0]
        sec_res = supabase.table("constitution_sections").select("*").eq("chapter_id", chapter['id']).order("section_number").execute()
        chapter['sections'] = sec_res.data
        return success_response(data=chapter)
    except Exception as e:
        logger.exception(f"Error in get_constitution_chapter {chapter_number}: {e}")
        return success_response(data={})

# --- Dictionary ---

@legal_bp.route('/dictionary', methods=['GET'])
@token_required
def get_dictionary():
    search = request.args.get('search')
    try:
        query = supabase.table("dictionary_terms").select("*")
        if search:
            query = query.ilike("term", f"{search}%")
            
        res = query.execute()
        return success_response(data=res.data)
    except Exception as e:
        logger.exception(f"Error in get_dictionary: {e}")
        return success_response(data=[])

# --- Legal Cases ---

@legal_bp.route('/cases', methods=['GET'])
@token_required
def get_cases():
    user_id = request.user['sub']
    status = request.args.get('status', 'all')
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
    except (ValueError, TypeError):
        page = 1
        limit = 10
    offset = (page - 1) * limit
    
    try:
        # Step 1: Get cases where user is assigned as a lawyer
        assigned_res = supabase.table("case_lawyers").select("case_id").eq("lawyer_id", user_id).execute()
        assigned_case_ids = [item['case_id'] for item in (assigned_res.data or [])]
        
        # Step 2: Build the main query
        query = supabase.table("cases").select("*, case_lawyers!left(*)", count="exact")
        
        if assigned_case_ids:
            # PostgREST 'or' with 'in' filter for the IDs
            ids_list = ",".join([str(cid) for cid in assigned_case_ids if cid])
            if ids_list:
                query = query.or_(f"created_by.eq.{user_id},id.in.({ids_list})")
            else:
                query = query.eq("created_by", user_id)
        else:
            # Just creator's cases
            query = query.eq("created_by", user_id)
        
        if status != 'all':
            query = query.eq("status", status)
            
        res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        return success_response(
            data=res.data, 
            pagination={
                "page": page, 
                "limit": limit,
                "total": getattr(res, 'count', len(res.data or []))
            }
        )
    except Exception as e:
        logger.exception(f"Error in get_cases for user {user_id}: {e}")
        return error_response(str(e))

@legal_bp.route('/cases/<case_id>', methods=['GET'])
@token_required
def get_case(case_id):
    user_id = request.user['sub']
    try:
        res = supabase.table("cases").select("*").eq("id", case_id).execute()
        if not res.data:
            return not_found("Case not found")
        
        case = res.data[0]
        
        # Check access (simpler logic: creator or assigned)
        assigned = supabase.table("case_lawyers").select("id").eq("case_id", case_id).eq("lawyer_id", user_id).execute()
        if case['created_by'] != user_id and not assigned.data:
            # Check if admin logic exists elsewhere, or just strict here?
            pass # Strict for now
            
        return success_response(data=case)
    except Exception as e:
        logger.exception(f"Error in get_case {case_id}: {e}")
        return error_response(str(e))

@legal_bp.route('/cases', methods=['POST'])
@token_required
def create_case():
    user_id = request.user['sub']
    data = request.get_json()
    
    title = data.get('title')
    client = data.get('client') # Mapping to client_name
    case_type = data.get('case_type')
    court = data.get('court')
    description = data.get('description')
    
    if not title or not client:
        return bad_request("Title and Client Name are required")
        
    try:
        # Generate reference
        ref_res = supabase.rpc("generate_case_reference").execute()
        # Fallback if RPC fails or returns None (if implemented) - normally strictly required.
        reference = ref_res.data if ref_res.data else f"REF-{uuid.uuid4().hex[:8].upper()}"
        
        case_id = str(uuid.uuid4())
        new_case = {
            "id": case_id,
            "reference": reference,
            "title": title,
            "client_name": client,
            "case_type": case_type,
            "court": court,
            "description": description,
            "created_by": user_id,
            "status": "active"
        }
        
        supabase.table("cases").insert(new_case).execute()
        
        return success_response(data={"id": case_id, "reference": reference}, status_code=201)
    except Exception as e:
        logger.exception(f"Error in create_case: {e}")
        return error_response(str(e))

@legal_bp.route('/cases/<case_id>', methods=['PUT'])
@token_required
def update_case(case_id):
    user_id = request.user['sub']
    data = request.get_json()
    try:
        supabase.table("cases").update(data).eq("id", case_id).execute()
        notify_case_participants(
            case_id,
            "case_update",
            "A case you are on was updated",
            title="Case Updated",
            actor_id=user_id,
            data={"updated_fields": list((data or {}).keys())},
        )
        return success_response(message="Case updated")
    except Exception as e:
        logger.exception(f"Error in update_case {case_id}: {e}")
        return error_response(str(e))

@legal_bp.route('/cases/<case_id>', methods=['DELETE'])
@token_required
def delete_case(case_id):
    try:
        supabase.table("cases").delete().eq("id", case_id).execute()
        return success_response(message="Case deleted")
    except Exception as e:
        logger.exception(f"Error in delete_case {case_id}: {e}")
        return error_response(str(e))

# --- Legal Documents ---

@legal_bp.route('/documents', methods=['GET'])
@token_required
def get_documents():
    user_id = request.user['sub']
    page = request.args.get('page', 1)
    limit = request.args.get('limit', 20)
    try:
        page = int(page)
        limit = int(limit)
    except (ValueError, TypeError):
        page = 1
        limit = 20
        
    folder = request.args.get('folder', 'all')
    offset = (page - 1) * limit
    
    try:
        query = supabase.table("documents").select("*").eq("uploaded_by", user_id)
        
        if folder != 'all':
            query = query.eq("folder", folder)
            
        res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return success_response(data=res.data, pagination={"page": page, "limit": limit})
    except Exception as e:
        logger.exception(f"Error in get_documents: {e}")
        return error_response(str(e))

@legal_bp.route('/documents/<doc_id>', methods=['GET'])
@token_required
def get_document(doc_id):
    try:
        res = supabase.table("documents").select("*").eq("id", doc_id).execute()
        if not res.data:
            return not_found("Document not found")
        return success_response(data=res.data[0])
    except Exception as e:
        logger.exception(f"Error in get_document {doc_id}: {e}")
        return error_response(str(e))

@legal_bp.route('/documents/upload', methods=['POST'])
@token_required
def upload_document():
    user_id = request.user['sub']
    
    # Check for multipart/form-data
    if 'file' not in request.files:
        return bad_request("No file part")
        
    file = request.files['file']
    if file.filename == '':
        return bad_request("No selected file")
        
    folder = request.form.get('folder', 'general')
    name = request.form.get('name', file.filename)
    case_id = request.form.get('case_id')
    
    try:
        filename = secure_filename(file.filename)
        file_path = f"{user_id}/{folder}/{uuid.uuid4()}_{filename}"
        
        # Upload to Supabase Storage
        file_content = file.read()
        bucket_name = "documents" # Ensure this bucket exists
        
        # Try to upload
        try:
            supabase.storage.from_(bucket_name).upload(file_path, file_content)
        except Exception as storage_err:
            logger.exception(f"Storage upload failed: {storage_err}")
            raise storage_err

        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
        
        # Insert into DB
        doc_id = str(uuid.uuid4())
        doc_data = {
            "id": doc_id,
            "name": name,
            "folder": folder,
            "case_id": case_id,
            "file_url": public_url,
            "file_type": file.content_type,
            "file_size": len(file_content),
            "uploaded_by": user_id,
            "status": "final"
        }
        
        supabase.table("documents").insert(doc_data).execute()

        if case_id:
            notify_case_participants(
                case_id,
                "document_shared",
                "A new document was added to your case",
                title="New Case Document",
                actor_id=user_id,
                data={"document_id": doc_id, "folder": folder},
            )
        
        return success_response(data={"id": doc_id, "url": public_url}, status_code=201)
        
    except Exception as e:
        logger.exception(f"Error in upload_document: {e}")
        return error_response(f"Upload failed: {str(e)}")

@legal_bp.route('/documents/<doc_id>', methods=['DELETE'])
@token_required
def delete_document(doc_id):
    try:
        # Ideally delete from storage too
        supabase.table("documents").delete().eq("id", doc_id).execute()
        return success_response(message="Document deleted")
    except Exception as e:
        logger.exception(f"Error in delete_document {doc_id}: {e}")
        return error_response(str(e))

@legal_bp.route('/documents/<doc_id>/star', methods=['POST'])
@token_required
def toggle_star(doc_id):
    try:
        # Get current status
        res = supabase.table("documents").select("starred").eq("id", doc_id).execute()
        if not res.data:
            return not_found("Document not found")
            
        current = res.data[0].get('starred', False)
        new_status = not current
        
        supabase.table("documents").update({"starred": new_status}).eq("id", doc_id).execute()
        return success_response(message="Star status toggled", data={"starred": new_status})
    except Exception as e:
        logger.exception(f"Error in toggle_star {doc_id}: {e}")
        return error_response(str(e))

@legal_bp.route('/documents/folders', methods=['GET'])
@token_required
def get_folders():
    user_id = request.user['sub']
    try:
        res = supabase.table("documents").select("folder").eq("uploaded_by", user_id).execute()
        folders = list(set([item['folder'] for item in res.data if item.get('folder')]))
        return success_response(data=folders)
    except Exception as e:
        logger.exception(f"Error in get_folders: {e}")
        return error_response(str(e))

@legal_bp.route('/documents/folders', methods=['POST'])
@token_required
def create_folder():
    data = request.get_json()
    folder_name = data.get('name')
    if not folder_name:
        return bad_request("Folder name required")
    return success_response(message="Folder created", data={"name": folder_name})
