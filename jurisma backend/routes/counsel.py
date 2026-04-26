from flask import Blueprint, request
from db.connection import supabase
from utils.responses import success_response, bad_request, not_found, error_response
from utils.auth_helpers import token_required, roles_required
from utils.notifications import create_notification
import uuid

counsel_bp = Blueprint('counsel', __name__)

@counsel_bp.route('/lawyers', methods=['GET'])
@token_required
def get_lawyers():
    practice_area = request.args.get('practice_area')
    tier = request.args.get('tier')
    
    try:
        query = supabase.table("v_lawyer_full_profiles").select("*").eq("verified", True)
        
        if practice_area:
            query = query.contains("practice_areas_list", [practice_area])
        if tier:
            query = query.eq("tier", tier)
            
        res = query.execute()
        return success_response(data=res.data)
    except Exception as e:
        return success_response(data=[])

@counsel_bp.route('/questions', methods=['GET'])
@token_required
def get_questions():
    status = request.args.get('status', 'pending')
    try:
        # Use embedding for author info
        res = supabase.table("counsel_questions").select("*, users(name)").eq("status", status).order("created_at", desc=True).execute()
        questions = res.data
        for q in questions:
            if 'users' in q:
                q['author_name'] = q['users'].get('name')
                del q['users']
        return success_response(data=questions)
    except Exception as e:
        return error_response(str(e))

@counsel_bp.route('/questions', methods=['POST'])
@token_required
def ask_question():
    user_id = request.user['sub']
    data = request.get_json()
    content = data.get('content')
    practice_area = data.get('practice_area')
    
    if not content or not practice_area:
        return bad_request("Content and practice_area are required")
        
    question_id = str(uuid.uuid4())
    try:
        supabase.table("counsel_questions").insert({
            "id": question_id,
            "author_id": user_id,
            "content": content,
            "practice_area": practice_area,
            "is_urgent": data.get('is_urgent', False)
        }).execute()
        return success_response(data={"question_id": question_id}, status_code=201)
    except Exception as e:
        return error_response(str(e))

@counsel_bp.route('/questions/<question_id>/answers', methods=['POST'])
@token_required
@roles_required('lawyer', 'admin')
def answer_question(question_id):
    user_id = request.user['sub']
    data = request.get_json()
    content = data.get('content')
    
    if not content:
        return bad_request("Content is required")
        
    try:
        question_res = supabase.table("counsel_questions").select("author_id").eq("id", question_id).execute()
        if not question_res.data:
            return not_found("Question not found")
        question_author_id = question_res.data[0].get("author_id")

        lawyer_res = supabase.table("lawyer_profiles").select("id").eq("user_id", user_id).execute()
        if not lawyer_res.data:
            return error_response("Lawyer profile not found", "NOT_FOUND", 404)
            
        lawyer_id = lawyer_res.data[0]['id']
        answer_id = str(uuid.uuid4())
        
        supabase.table("counsel_answers").insert({
            "id": answer_id,
            "question_id": question_id,
            "lawyer_id": lawyer_id,
            "content": content
        }).execute()
        
        # Update question status (using update with increment might be tricky in SDK, 
        # so we just update status for now or use RPC)
        supabase.table("counsel_questions").update({
            "status": 'answered'
            # Note: answers_count increment would ideally be a DB trigger or RPC
        }).eq("id", question_id).execute()

        create_notification(
            question_author_id,
            "question_answer",
            "Your question has been answered",
            title="New Answer",
            actor_id=user_id,
            data={"question_id": question_id, "answer_id": answer_id},
        )
        
        return success_response(data={"answer_id": answer_id}, status_code=201)
    except Exception as e:
        return error_response(str(e))

@counsel_bp.route('/sessions', methods=['POST'])
@token_required
def book_session():
    student_id = request.user['sub']
    data = request.get_json()
    lawyer_id = data.get('lawyer_id') # This should be the lawyer's profile ID
    scheduled_at = data.get('scheduled_at')
    
    if not lawyer_id or not scheduled_at:
        return bad_request("Lawyer profile ID and scheduled time are required")
        
    session_id = str(uuid.uuid4())
    try:
        lawyer_profile_res = supabase.table("lawyer_profiles").select("user_id").eq("id", lawyer_id).execute()
        if not lawyer_profile_res.data:
            return error_response("Lawyer profile not found", "NOT_FOUND", 404)
        lawyer_user_id = lawyer_profile_res.data[0].get("user_id")

        supabase.table("counsel_sessions").insert({
            "id": session_id,
            "lawyer_id": lawyer_id,
            "student_id": student_id,
            "session_type": data.get('session_type'),
            "topic": data.get('topic'),
            "scheduled_at": scheduled_at
        }).execute()

        create_notification(
            lawyer_user_id,
            "session_confirmed",
            "A new session has been booked with you",
            title="New Session Booking",
            actor_id=student_id,
            data={"session_id": session_id, "lawyer_id": lawyer_id, "scheduled_at": scheduled_at},
        )
        create_notification(
            student_id,
            "session_confirmed",
            "Your session booking was successful",
            title="Session Booked",
            actor_id=lawyer_user_id,
            data={"session_id": session_id, "lawyer_id": lawyer_id, "scheduled_at": scheduled_at},
        )

        return success_response(data={"session_id": session_id}, status_code=201)
    except Exception as e:
        return error_response(str(e))
