from flask import Blueprint, request
from db.connection import supabase
from utils.responses import success_response, error_response
from utils.auth_helpers import token_required

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/', methods=['GET'])
@token_required
def get_notifications():
    user_id = request.user['sub']
    unread_only = request.args.get('unread') == 'true'
    
    try:
        query = supabase.table("notifications").select("*").eq("user_id", user_id)
        
        if unread_only:
            query = query.eq("read", False)
            
        res = query.order("created_at", desc=True).execute()
        return success_response(data=res.data)
    except Exception as e:
        return error_response(str(e))

@notifications_bp.route('/<notif_id>/read', methods=['POST'])
@token_required
def mark_read(notif_id):
    user_id = request.user['sub']
    try:
        supabase.table("notifications").update({"read": True}).eq("id", notif_id).eq("user_id", user_id).execute()
        return success_response(message="Notification marked as read")
    except Exception as e:
        return error_response(str(e))

@notifications_bp.route('/read-all', methods=['POST'])
@token_required
def mark_all_read():
    user_id = request.user['sub']
    try:
        supabase.table("notifications").update({"read": True}).eq("user_id", user_id).execute()
        return success_response(message="All notifications marked as read")
    except Exception as e:
        return error_response(str(e))
