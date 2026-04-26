from flask import Blueprint, request
import uuid
from datetime import datetime, timezone
from db.connection import supabase
from utils.auth_helpers import token_required
from utils.responses import success_response, error_response

gamification_bp = Blueprint('gamification', __name__)

# ─────────────────────────────────────────────────────────────────────────────
# GAMIFICATION CONFIG & ITEMS
# ─────────────────────────────────────────────────────────────────────────────

SHOP_ITEMS = [
    {
        "id": "STREAK_FREEZE",
        "name": "Streak Freeze",
        "description": "Protects your streak if you miss one day of study. Equips automatically.",
        "cost": 200,
        "icon": "❄️",
        "max_quantity": 2,
        "category": "power-up"
    },
    {
        "id": "WEEKEND_AMULET",
        "name": "Weekend Amulet",
        "description": "Protects your streak over the entire weekend. Equips automatically.",
        "cost": 300,
        "icon": "🛡️",
        "max_quantity": 1,
        "category": "power-up"
    },
    {
        "id": "XP_BOOST",
        "name": "Double XP Multiplier",
        "description": "Double all XP earned from lessons for the next 15 minutes.",
        "cost": 100,
        "icon": "🚀",
        "max_quantity": 5,
        "category": "boost"
    },
    {
        "id": "HEART_REFILL",
        "name": "Heart Refill",
        "description": "Out of lives? Instantly restore all 5 of your hearts to keep studying.",
        "cost": 350,
        "icon": "❤️",
        "max_quantity": 1,
        "category": "power-up"
    },
    {
        "id": "THEME_OBSIDIAN",
        "name": "Obsidian Profile Theme",
        "description": "Unlock a premium dark, sleek theme for your Social Hub profile.",
        "cost": 1000,
        "icon": "🖤",
        "max_quantity": 1,
        "category": "cosmetic"
    },
    {
        "id": "THEME_GOLD",
        "name": "Gold VIP Theme",
        "description": "Unlock the prestigious Gold theme for your profile, showing everyone your dedication.",
        "cost": 5000,
        "icon": "🌟",
        "max_quantity": 1,
        "category": "cosmetic"
    }
]

# Hardcoded achievement definitions (in a real app, these might be in a DB)
ACHIEVEMENTS = {
    "STREAK_3": {"name": "Consistent Starter", "description": "Reach a 3-day streak", "icon": "🔥", "color": "orange", "roles": ["student", "lawyer"]},
    "STREAK_7": {"name": "Weekly Warrior", "description": "Reach a 7-day streak", "icon": "📅", "color": "blue", "roles": ["student", "lawyer"]},
    "STREAK_14": {"name": "Advocate's Resolve", "description": "Reach a 14-day streak", "icon": "⚖️", "color": "jurisma", "roles": ["student", "lawyer"]},
    "STREAK_30": {"name": "Unbreakable", "description": "Reach a 30-day streak", "icon": "💎", "color": "purple", "roles": ["student", "lawyer"]},
    "SENIOR_COUNSEL": {"name": "Senior Counsel", "description": "Answer 10 student questions", "icon": "🎓", "color": "jurisma", "roles": ["lawyer"]},
    "PRO_BONO": {"name": "Pro Bono Champion", "description": "Receive 50 upvotes on answers", "icon": "🤝", "color": "emerald", "roles": ["lawyer"]},
}

# ─────────────────────────────────────────────────────────────────────────────
# SHOP ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@gamification_bp.route('/shop', methods=['GET'])
@token_required
def get_shop_items():
    """GET /api/gamification/shop — Returns available items to buy."""
    return success_response(data=SHOP_ITEMS)

@gamification_bp.route('/shop/buy', methods=['POST'])
@token_required
def buy_shop_item():
    """POST /api/gamification/shop/buy — Purchases an item using gems."""
    user_id = request.user['sub']
    data = request.get_json()
    item_id = data.get('item_id')
    
    item = next((i for i in SHOP_ITEMS if i['id'] == item_id), None)
    if not item:
        return error_response("Item not found", 404)
        
    try:
        user_res = supabase.table("users").select("gems, streak_freeze_count").eq("id", user_id).single().execute()
        user_data = user_res.data or {}
        
        current_gems = user_data.get('gems', 0)
        current_freezes = user_data.get('streak_freeze_count', 0)
        
        if current_gems < item['cost']:
            return error_response("Not enough gems", 400)
            
        if item_id == "STREAK_FREEZE":
            if current_freezes >= item['max_quantity']:
                return error_response(f"You can only hold {item['max_quantity']} Streak Freezes at a time.", 400)
                
            # Deduct gems and add freeze
            supabase.table("users").update({
                "gems": current_gems - item['cost'],
                "streak_freeze_count": current_freezes + 1
            }).eq("id", user_id).execute()
            
            return success_response(data={"message": "Streak Freeze purchased successfully!", "new_balance": current_gems - item['cost'], "new_freezes": current_freezes + 1})
            
        elif item_id == "WEEKEND_AMULET":
            # Just an example, maybe deduct gems and add a flag to user table or a separate active_items table
            return error_response("Weekend Amulet functionality coming soon!", 501)
            
        elif item_id == "HEART_REFILL":
            # Check if hearts are already full
            current_hearts = user_data.get('hearts', 5)
            if current_hearts >= 5:
                return error_response("Your hearts are already full!", 400)
                
            # Refill hearts
            supabase.table("users").update({
                "gems": current_gems - item['cost'],
                "hearts": 5
            }).eq("id", user_id).execute()
            
            return success_response(data={"message": "Hearts fully restored!", "new_balance": current_gems - item['cost']})
            
        else:
            # Generic purchase for cosmetics/boosts
            supabase.table("users").update({
                "gems": current_gems - item['cost']
            }).eq("id", user_id).execute()
            
            return success_response(data={"message": f"{item['name']} purchased successfully!", "new_balance": current_gems - item['cost']})
            
        return error_response("Invalid item", 400)
    except Exception as e:
        return error_response(str(e))

# ─────────────────────────────────────────────────────────────────────────────
# PROFILE & BADGES ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@gamification_bp.route('/profile', methods=['GET'])
@token_required
def get_user_profile():
    """GET /api/gamification/profile — Get full gamification profile including badges."""
    user_id = request.user['sub']
    # If a specific user is requested, fetch theirs. Otherwise fetch current user's.
    target_user_id = request.args.get('user_id', user_id)
    is_own_profile = str(user_id) == str(target_user_id)
    
    try:
        # 1. Fetch user stats
        user_res = supabase.table("users").select(
            "name, avatar, league, gems, role, created_at"
        ).eq("id", target_user_id).single().execute()
        
        user_data = user_res.data or {}
        user_role = user_data.get('role', 'student')
        
        # 2. Fetch earned badges (If not own profile, only fetch public badges)
        if is_own_profile:
            badges_res = supabase.table("user_badges").select("id, badge_id, earned_at, is_public").eq("user_id", target_user_id).execute()
        else:
            badges_res = supabase.table("user_badges").select("id, badge_id, earned_at, is_public").eq("user_id", target_user_id).eq("is_public", True).execute()
            
        earned_badges = {b["badge_id"]: b for b in badges_res.data} if badges_res.data else {}
        
        # 3. Construct complete badges list
        all_badges = []
        for b_id, details in ACHIEVEMENTS.items():
            # If viewing someone else, only show badges they've earned (and made public) OR if we want to show grayed out badges, 
            # we should only show grayed out badges that match THEIR role.
            if user_role not in details.get('roles', ['student', 'lawyer']):
                continue # Skip badges not meant for this user's role
                
            earned_data = earned_badges.get(b_id)
            if not is_own_profile and not earned_data:
                # Decide if we want to show unearned badges on public profiles. Let's show them.
                pass
                
            all_badges.append({
                "id": b_id,
                "db_id": earned_data["id"] if earned_data else None,
                **details,
                "is_earned": bool(earned_data),
                "is_public": earned_data["is_public"] if earned_data else True,
                "earned_at": earned_data["earned_at"] if earned_data else None
            })
            
        return success_response(data={
            "user": user_data,
            "badges": all_badges
        })
    except Exception as e:
        return error_response(str(e))

@gamification_bp.route('/badges/visibility', methods=['POST'])
@token_required
def toggle_badge_visibility():
    """POST /api/gamification/badges/visibility — Toggle a specific badge's visibility."""
    user_id = request.user['sub']
    data = request.get_json()
    badge_db_id = data.get('badge_db_id')
    is_public = data.get('is_public')
    
    if not badge_db_id:
        return error_response("Missing badge ID", 400)
        
    try:
        # Update visibility (RLS ensures users can only update their own)
        supabase.table("user_badges").update({
            "is_public": is_public
        }).eq("id", badge_db_id).eq("user_id", user_id).execute()
        
        return success_response(data={"message": "Badge visibility updated"})
    except Exception as e:
        return error_response(str(e))
