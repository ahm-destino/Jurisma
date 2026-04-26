from flask import Blueprint, request
from db.connection import supabase
from utils.responses import success_response, error_response, bad_request, not_found, unauthorized
from utils.auth_helpers import token_required, roles_required
import uuid
import json

student_bp = Blueprint('student', __name__)

# --- Student Hub Index ---

@student_bp.route('/', methods=['GET'])
def student_index():
    return success_response(message="Jurisma Student Hub API is active. Use /notes, /quizzes, etc.")

# --- Dashboard & Stats ---

@student_bp.route('/dashboard', methods=['GET'])
@token_required
def get_dashboard():
    user_id = request.user['sub']
    try:
        user = supabase.table("users").select("current_streak, longest_streak, streak_freeze_count, last_activity_at, league, hearts, daily_goal_xp, current_daily_xp, last_activity_date, gems").eq("id", user_id).single().execute()
        
        # Fallback for missing columns if migration not run yet
        data = user.data or {}
        
        # Verify Streak Validity
        from datetime import date, datetime, timedelta
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        last_activity_str = data.get('last_activity_date')
        current_streak = data.get('current_streak', 0)
        
        if last_activity_str:
            try:
                # Handle potential +00:00 or Z in isoformat
                last_activity = datetime.fromisoformat(last_activity_str.replace('Z', '+00:00')).date()
                if last_activity < today:
                    # It's a new day! Refill hearts to 5.
                    supabase.table("users").update({"hearts": 5}).eq("id", user_id).execute()
                    data['hearts'] = 5

                if current_streak > 0 and last_activity < yesterday:
                    # User missed yesterday! Reset streak to 0
                    current_streak = 0
                    supabase.table("users").update({"current_streak": 0}).eq("id", user_id).execute()
                    data['current_streak'] = 0
            except ValueError:
                pass

        return success_response(data={
            "streak": current_streak,
            "longest_streak": data.get("longest_streak", 0),
            "freezes": data.get("streak_freeze_count", 0),
            "last_activity": data.get("last_activity_at"),
            "league": data.get("league", "Wood"),
            "hearts": data.get("hearts", 5),
            "daily_goal": data.get("daily_goal_xp", 50),
            "current_daily_xp": data.get("current_daily_xp", 0),
            "gems": data.get("gems", 0),
            "rank": data.get("league", "Wood")
        })
    except Exception as e:
        print(f"Dashboard error: {e}")
        return success_response(data={"streak": 0, "hearts": 5, "league": "Wood", "daily_goal": 50, "current_daily_xp": 0})

@student_bp.route('/streak-insights', methods=['GET'])
@token_required
def get_streak_insights():
    user_id = request.user['sub']
    try:
        # Get user streak data
        user = supabase.table("users").select("current_streak, longest_streak, streak_freeze_count, created_at, league, current_daily_xp, gems").eq("id", user_id).single().execute()
        
        # Get activity logs for the last 90 days
        from datetime import datetime, timedelta
        ninety_days_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
        
        logs = supabase.table("user_activity_logs")\
            .select("activity_date, activity_type, points_earned")\
            .eq("user_id", user_id)\
            .gte("activity_date", ninety_days_ago)\
            .order("activity_date", desc=True)\
            .execute()

        # Calculate consistency score (Active days in last 30 days)
        thirty_days_ago = (datetime.now() - timedelta(days=30)).date()
        active_days_count = len(set(l['activity_date'] for l in logs.data if datetime.fromisoformat(l['activity_date']).date() >= thirty_days_ago))
        consistency_score = int((active_days_count / 30) * 100)
            
        return success_response(data={
            "stats": {**(user.data or {}), "consistency_score": consistency_score},
            "history": logs.data
        })
    except Exception as e:
        return error_response(str(e))

@student_bp.route('/log-activity', methods=['POST'])
@token_required
def log_activity():
    user_id = request.user['sub']
    data = request.get_json()
    activity_type = data.get('activity_type', 'study')
    points = data.get('points', 10)
    is_perfect = data.get('is_perfect', False)
    
    # Perfect Lesson Bonus (+50% points)
    if is_perfect:
        points = int(points * 1.5)
    
    from datetime import datetime, date, timedelta
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    try:
        # 1. Fetch user's current gamification info
        user_res = supabase.table("users").select("current_streak, longest_streak, last_activity_at, current_daily_xp, last_activity_date").eq("id", user_id).single().execute()
        user = user_res.data or {}
        
        current_streak = user.get('current_streak', 0)
        longest_streak = user.get('longest_streak', 0)
        last_activity_str = user.get('last_activity_at')
        last_daily_xp = user.get('current_daily_xp', 0)
        last_activity_date_str = user.get('last_activity_date')
        current_gems = user.get('gems', 0)
        
        last_activity_date = None
        if last_activity_str:
            last_activity_date = datetime.fromisoformat(last_activity_str.replace('Z', '+00:00')).date()
            
        # 2. Determine new streak and daily XP
        new_streak = current_streak
        new_daily_xp = last_daily_xp + points
        
        # Reset daily XP if it's a new day
        if last_activity_date_str and last_activity_date_str != today.isoformat():
            new_daily_xp = points

        if last_activity_date == today:
            pass # Streak stays the same
        elif last_activity_date == yesterday:
            new_streak += 1
        else:
            new_streak = 1 # Reset streak
            
        if new_streak > longest_streak:
            longest_streak = new_streak
            
        # 3. Update User Table
        supabase.table("users").update({
            "current_streak": new_streak,
            "longest_streak": longest_streak,
            "current_daily_xp": new_daily_xp,
            "gems": current_gems + points,
            "last_activity_date": today.isoformat(),
            "last_activity_at": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        # 3.5 Check and award Streak Achievements
        try:
            earned_badge = None
            if new_streak == 3: earned_badge = "STREAK_3"
            elif new_streak == 7: earned_badge = "STREAK_7"
            elif new_streak == 14: earned_badge = "STREAK_14"
            elif new_streak == 30: earned_badge = "STREAK_30"
            
            if earned_badge:
                # Upsert to prevent duplicate errors
                supabase.table("user_badges").upsert({
                    "user_id": user_id,
                    "badge_id": earned_badge
                }, on_conflict="user_id, badge_id").execute()
        except Exception as badge_err:
            print(f"Badge award error: {badge_err}")
        
        # 4. Log Activity (Daily idempotent log)
        try:
            # Try to get existing log for today/type
            existing_log = supabase.table("user_activity_logs")\
                .select("id, points_earned")\
                .eq("user_id", user_id)\
                .eq("activity_date", today.isoformat())\
                .eq("activity_type", activity_type)\
                .execute()
            
            if existing_log.data:
                # Update existing log (Add points)
                log_id = existing_log.data[0]['id']
                current_points = existing_log.data[0]['points_earned']
                supabase.table("user_activity_logs").update({
                    "points_earned": current_points + points
                }).eq("id", log_id).execute()
            else:
                # Create new log
                supabase.table("user_activity_logs").insert({
                    "user_id": user_id,
                    "activity_date": today.isoformat(),
                    "activity_type": activity_type,
                    "points_earned": points
                }).execute()
        except Exception as log_err:
            print(f"Log activity error: {log_err}")
            # Non-critical, don't fail the whole request
        
        return success_response(data={
            "streak": new_streak,
            "points_earned": points,
            "gems_earned": points,
            "current_daily_xp": new_daily_xp,
            "is_perfect": is_perfect,
            "message": "Progress saved!"
        })
        
    except Exception as e:
        return error_response(str(e))

@student_bp.route('/hearts/deduct', methods=['POST'])
@token_required
def deduct_heart():
    user_id = request.user['sub']
    try:
        user = supabase.table("users").select("hearts").eq("id", user_id).single().execute()
        current_hearts = user.data.get("hearts", 5)
        
        if current_hearts > 0:
            new_hearts = current_hearts - 1
            supabase.table("users").update({"hearts": new_hearts}).eq("id", user_id).execute()
            return success_response(data={"hearts": new_hearts})
        else:
            return success_response(data={"hearts": 0, "message": "No hearts remaining"})
    except Exception as e:
        return error_response(str(e))

@student_bp.route('/leaderboard', methods=['GET'])
@token_required
def get_leaderboard():
    try:
        # Get all activity logs and sum points per user
        logs = supabase.table("user_activity_logs").select("user_id, points_earned").execute()
        
        user_points = {}
        for entry in logs.data:
            uid = entry['user_id']
            user_points[uid] = user_points.get(uid, 0) + entry['points_earned']
            
        user_ids = list(user_points.keys())
        if not user_ids:
            return success_response(data=[])
            
        users_res = supabase.table("users").select("id, name, avatar, league").in_("id", user_ids).execute()
        
        user_id = request.user['sub']
        leaderboard = []
        for u in users_res.data:
            leaderboard.append({
                "id": u['id'],
                "name": u['name'],
                "avatar": u['avatar'],
                "league": u.get('league', 'Wood'),
                "points": user_points.get(u['id'], 0),
                "is_me": str(u['id']) == str(user_id)
            })
            
        leaderboard.sort(key=lambda x: x['points'], reverse=True)
        
        # Add ranking metadata (Promotion/Demotion Zones)
        for i, entry in enumerate(leaderboard):
            entry['rank'] = i + 1
            # Promotion/Demotion zones for 5-league system
            if i < 10:
                entry['zone'] = 'promotion'
            elif i >= len(leaderboard) - 5 and len(leaderboard) > 15:
                entry['zone'] = 'demotion'
            else:
                entry['zone'] = 'safe'
        
        return success_response(data=leaderboard[:30]) # Top 30 for the league view
        
    except Exception as e:
        return error_response(str(e))

# --- Lecture Notes ---

@student_bp.route('/notes', methods=['GET'])
@token_required
def get_notes():
    subject = request.args.get('subject')
    level = request.args.get('level')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    offset = (page - 1) * limit
    
    try:
        query = supabase.table("lecture_notes").select("*").eq("status", "active")
        
        if subject:
            query = query.eq("subject", subject)
        if level:
            query = query.eq("level", level)
            
        res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return success_response(data=res.data, pagination={"page": page, "limit": limit})
    except Exception as e:
        return error_response(str(e))

@student_bp.route('/notes', methods=['POST'])
@token_required
def upload_note():
    user_id = request.user['sub']
    data = request.get_json()
    
    title = data.get('title')
    subject = data.get('subject')
    file_url = data.get('file_url')
    
    if not title or not subject or not file_url:
        return bad_request("Title, subject, and file_url are required")
        
    note_id = str(uuid.uuid4())
    try:
        supabase.table("lecture_notes").insert({
            "id": note_id,
            "title": title,
            "subject": subject,
            "level": data.get('level'),
            "description": data.get('description'),
            "file_url": file_url,
            "author_id": user_id
        }).execute()
        return success_response(data={"note_id": note_id}, status_code=201)
    except Exception as e:
        return error_response(str(e))

# --- Trending Materials & Lessons ---

@student_bp.route('/materials/trending', methods=['GET'])
@token_required
def get_trending_materials():
    limit = int(request.args.get('limit', 10))
    try:
        # Fetch notes as materials
        res = supabase.table("lecture_notes").select("*, users(name)").eq("status", "active").limit(limit).execute()
        
        materials = []
        for item in res.data:
            materials.append({
                "id": item['id'],
                "type": "Note",
                "title": item['title'],
                "author": item.get('users', {}).get('name', 'Senior Counsel'),
                "views": item.get('views', 0),
                "is_completed": False # Logic for completion could be added via a join
            })
        return success_response(data=materials)
    except Exception as e:
        return error_response(str(e))

@student_bp.route('/lessons/<lesson_id>/complete', methods=['POST'])
@token_required
def complete_lesson(lesson_id):
    user_id = request.user['sub']
    from datetime import date
    today = date.today().isoformat()
    try:
        # 1. Log in user_activity_logs (Aggregate points)
        existing = supabase.table("user_activity_logs")\
            .select("id, points_earned")\
            .eq("user_id", user_id)\
            .eq("activity_date", today)\
            .eq("activity_type", "lesson_complete")\
            .execute()
            
        if existing.data:
            log_id = existing.data[0]['id']
            curr_pts = existing.data[0]['points_earned']
            supabase.table("user_activity_logs").update({
                "points_earned": curr_pts + 20
            }).eq("id", log_id).execute()
        else:
            supabase.table("user_activity_logs").insert({
                "user_id": user_id,
                "activity_date": today,
                "activity_type": "lesson_complete",
                "points_earned": 20
            }).execute()
            
        return success_response(message="Lesson marked as complete")
    except Exception as e:
        return error_response(str(e))

# --- Quizzes ---

@student_bp.route('/quizzes', methods=['GET'])
@token_required
def get_quizzes():
    subject = request.args.get('subject')
    difficulty = request.args.get('difficulty')
    
    try:
        query = supabase.table("quizzes").select("*").eq("status", "active")
        if subject:
            query = query.eq("subject", subject)
        if difficulty:
            query = query.eq("difficulty", difficulty)
            
        res = query.execute()
        return success_response(data=res.data)
    except Exception as e:
        return error_response(str(e))

@student_bp.route('/quizzes/<quiz_id>', methods=['GET'])
@token_required
def get_quiz(quiz_id):
    try:
        quiz_res = supabase.table("quizzes").select("*").eq("id", quiz_id).execute()
        if not quiz_res.data:
            return not_found("Quiz not found")
            
        quiz = quiz_res.data[0]
        q_res = supabase.table("quiz_questions").select("*").eq("quiz_id", quiz_id).order("order_number").execute()
        quiz['questions'] = q_res.data
        return success_response(data=quiz)
    except Exception as e:
        return error_response(str(e))

@student_bp.route('/quizzes/<quiz_id>/attempt', methods=['POST'])
@token_required
def submit_quiz(quiz_id):
    user_id = request.user['sub']
    data = request.get_json()
    answers = data.get('answers') # List of {question_id, selected_option}
    
    if not answers:
        return bad_request("Answers are required")
        
    try:
        # Fetch correct answers
        correct_res = supabase.table("quiz_questions").select("id, correct_option").eq("quiz_id", quiz_id).execute()
        correct_map = {str(q['id']): q['correct_option'] for q in correct_res.data}
        
        score = 0
        total = len(correct_map)
        for ans in answers:
            if correct_map.get(str(ans['question_id'])) == ans['selected_option']:
                score += 1
                
        percentage = (score / total) * 100 if total > 0 else 0
        passed = percentage >= 70 # passing_score threshold
        
        attempt_id = str(uuid.uuid4())
        supabase.table("quiz_attempts").insert({
            "id": attempt_id,
            "quiz_id": quiz_id,
            "user_id": user_id,
            "score": percentage,
            "correct_answers": score,
            "total_questions": total,
            "passed": passed,
            "answers": answers
        }).execute()
        
        return success_response(data={
            "attempt_id": attempt_id,
            "score": score,
            "total": total,
            "percentage": percentage,
            "passed": passed
        })
    except Exception as e:
        return error_response(str(e))

# --- Study Groups ---

@student_bp.route('/study-groups', methods=['GET'])
@token_required
def get_study_groups():
    subject = request.args.get('subject')
    try:
        query = supabase.table("study_groups").select("*")
        if subject:
            query = query.eq("subject", subject)
            
        res = query.execute()
        return success_response(data=res.data)
    except Exception as e:
        return error_response(str(e))

@student_bp.route('/study-groups', methods=['POST'])
@token_required
def create_study_group():
    user_id = request.user['sub']
    data = request.get_json()
    name = data.get('name')
    subject = data.get('subject')
    
    if not name or not subject:
        return bad_request("Name and subject are required")
        
    group_id = str(uuid.uuid4())
    try:
        supabase.table("study_groups").insert({
            "id": group_id,
            "name": name,
            "subject": subject,
            "description": data.get('description'),
            "created_by": user_id
        }).execute()
        
        # Add creator as admin member
        supabase.table("study_group_members").insert({
            "group_id": group_id,
            "user_id": user_id,
            "role": 'admin'
        }).execute()
        
        return success_response(data={"group_id": group_id}, status_code=201)
    except Exception as e:
        return error_response(str(e))

# --- Progress ---

@student_bp.route('/progress', methods=['GET'])
@token_required
def get_progress():
    user_id = request.user['sub']
    try:
        res = supabase.table("student_progress").select("*").eq("user_id", user_id).execute()
        return success_response(data=res.data)
    except Exception as e:
        return error_response(str(e))
