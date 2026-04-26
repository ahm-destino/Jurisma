from flask import Blueprint, jsonify, request, send_from_directory
import os
import sys

# Ensure the project root is in sys.path for direct script execution or certain IDE runners
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from db.connection import supabase
from utils.responses import _json_success, bad_request, error_response, forbidden, not_found
from utils.auth_helpers import decode_token, token_required
from utils.notifications import create_notification
from werkzeug.utils import secure_filename
import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

social_bp = Blueprint("social", __name__)


DEFAULT_LIMIT = 20
MAX_LIMIT = 100
MAX_POST_CONTENT_LENGTH = 5000
MAX_COMMENT_CONTENT_LENGTH = 2000
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
UPLOAD_ROOT = os.path.join(os.getcwd(), "uploads", "social")

CATEGORY_INPUT_MAP = {
    "all": "all",
    "discussion": "discussion",
    "case-insight": "case-insights",
    "case-insights": "case-insights",
    "legal-news": "legal-news",
    "networking": "networking",
}

CATEGORY_OUTPUT_MAP = {
    "case-insights": "case-insight",
    "discussion": "discussion",
    "legal-news": "legal-news",
    "networking": "networking",
    "all": "all",
}

REPORT_REASONS = {
    "spam",
    "harassment",
    "misinformation",
    "inappropriate_content",
    "other",
}


NOTIFICATION_PUBLIC_TYPE_MAP = {
    "post_like": "like",
    "post_comment": "comment",
    "comment_reply": "reply",
    "comment_like": "like",
    "reply_like": "like",
    "new_follower": "follow",
    "mention": "mention",
}



def _count_from_response(response):
    count = getattr(response, "count", None)
    if count is None:
        return len(getattr(response, "data", []) or [])
    try:
        return int(count)
    except Exception:
        return 0


def _coerce_int(value, default, minimum=1, maximum=MAX_LIMIT):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    if parsed < minimum:
        parsed = minimum
    if parsed > maximum:
        parsed = maximum
    return parsed


def _parse_pagination(default_limit=DEFAULT_LIMIT):
    page = _coerce_int(request.args.get("page", 1), 1, minimum=1, maximum=1_000_000)
    limit = _coerce_int(request.args.get("limit", default_limit), default_limit, minimum=1, maximum=MAX_LIMIT)
    offset = (page - 1) * limit
    return page, limit, offset


def _build_pagination(page, limit, total):
    total_pages = (total + limit - 1) // limit if total else 0
    return {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }


def _parse_bool(value):
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _extract_bearer_token():
    auth_header = request.headers.get("Authorization", "").strip()
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:].strip()
    return token if token else None


def _optional_user_id():
    token = _extract_bearer_token()
    if not token:
        return None
    decoded = decode_token(token)
    if not decoded:
        return None
    return decoded.get("sub")


def _unique_ids(values):
    seen = set()
    ordered = []
    for value in values or []:
        if value and value not in seen:
            seen.add(value)
            ordered.append(value)
    return ordered


def _to_iso(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _normalize_category_input(value):
    if value is None:
        return None
    normalized = str(value).strip().lower()
    return CATEGORY_INPUT_MAP.get(normalized)


def _normalize_category_output(value):
    if value is None:
        return None
    return CATEGORY_OUTPUT_MAP.get(value, value)


def _clean_tags(value):
    if value is None:
        return []
    if not isinstance(value, list):
        return None
    cleaned = []
    seen = set()
    for tag in value:
        text = str(tag or "").strip().lower()
        if not text:
            continue
        if len(text) > 40:
            return None
        if text not in seen:
            cleaned.append(text)
            seen.add(text)
    if len(cleaned) > 10:
        return None
    return cleaned


def _clean_image_urls(value):
    if value is None:
        return []
    if not isinstance(value, list):
        return None
    cleaned = []
    for image_url in value:
        text = str(image_url or "").strip()
        if not text:
            continue
        cleaned.append(text)
    return cleaned


def _fetch_users_map(user_ids):
    user_ids = _unique_ids(user_ids)
    if not user_ids:
        return {}
    try:
        response = (
            supabase.table("users")
            .select("id,name,email,avatar,role,bio,location,created_at,status")
            .in_("id", user_ids)
            .execute()
        )
        return {row["id"]: row for row in (response.data or [])}
    except Exception as e:
        logger.exception(f"Error fetching users map: {e}")
        return {}


def _fetch_social_profiles_map(user_ids):
    user_ids = _unique_ids(user_ids)
    if not user_ids:
        return {}
    try:
        response = (
            supabase.table("social_user_profiles")
            .select(
                "user_id,headline,credentials,cover_image,company,position,experience,education,is_verified"
            )
            .in_("user_id", user_ids)
            .execute()
        )
        return {row["user_id"]: row for row in (response.data or [])}
    except Exception as e:
        logger.exception(f"Error fetching social profiles map: {e}")
        return {}


def _fetch_lawyer_profiles_map(user_ids):
    user_ids = _unique_ids(user_ids)
    if not user_ids:
        return {}
    try:
        response = (
            supabase.table("lawyer_profiles")
            .select("user_id,firm,job_title,verified,call_to_bar_year")
            .in_("user_id", user_ids)
            .execute()
        )
        return {row["user_id"]: row for row in (response.data or [])}
    except Exception as e:
        logger.exception(f"Error fetching lawyer profiles: {e}")
        return {}


def _fetch_student_profiles_map(user_ids):
    user_ids = _unique_ids(user_ids)
    if not user_ids:
        return {}
    try:
        response = (
            supabase.table("student_profiles")
            .select("user_id,institution,level")
            .in_("user_id", user_ids)
            .execute()
        )
        return {row["user_id"]: row for row in (response.data or [])}
    except Exception as e:
        logger.exception(f"Error fetching student profiles: {e}")
        return {}


def _build_user_summary(user_row, social_profile=None, lawyer_profile=None, student_profile=None):
    user_row = user_row or {}
    social_profile = social_profile or {}
    lawyer_profile = lawyer_profile or {}
    student_profile = student_profile or {}

    headline = social_profile.get("headline")
    if not headline:
        if lawyer_profile.get("job_title"):
            headline = lawyer_profile["job_title"]
        elif student_profile.get("institution"):
            headline = student_profile["institution"]
        elif user_row.get("bio"):
            headline = user_row["bio"]
        else:
            headline = "Legal Professional"

    return {
        "id": user_row.get("id"),
        "name": user_row.get("name"),
        "avatar": user_row.get("avatar") or "",
        "role": user_row.get("role"),
        "headline": headline,
        "is_connected": False, # Default, override in callers if viewer is known
    }


def _fetch_post_interaction_sets(user_id, post_ids):
    post_ids = _unique_ids(post_ids)
    liked_post_ids = set()
    bookmarked_post_ids = set()
    user_votes = {}

    if not user_id or not post_ids:
        return liked_post_ids, bookmarked_post_ids, user_votes

    try:
        likes_res = (
            supabase.table("post_likes")
            .select("post_id")
            .eq("user_id", user_id)
            .in_("post_id", post_ids)
            .execute()
        )
        liked_post_ids = {row["post_id"] for row in (likes_res.data or [])}
    except Exception:
        liked_post_ids = set()

    try:
        bookmarks_res = (
            supabase.table("post_bookmarks")
            .select("post_id")
            .eq("user_id", user_id)
            .in_("post_id", post_ids)
            .execute()
        )
        bookmarked_post_ids = {row["post_id"] for row in (bookmarks_res.data or [])}
    except Exception:
        bookmarked_post_ids = set()

    try:
        votes_res = (
            supabase.table("post_votes")
            .select("post_id,vote_type")
            .eq("user_id", user_id)
            .in_("post_id", post_ids)
            .execute()
        )
        for row in votes_res.data or []:
            user_votes[row["post_id"]] = row.get("vote_type")
    except Exception:
        user_votes = {}

    return liked_post_ids, bookmarked_post_ids, user_votes


def _fetch_vote_counts(post_ids):
    post_ids = _unique_ids(post_ids)
    vote_counts = {}
    if not post_ids:
        return vote_counts
    try:
        response = (
            supabase.table("post_votes")
            .select("post_id,vote_type")
            .in_("post_id", post_ids)
            .execute()
        )
    except Exception:
        return vote_counts

    for row in response.data or []:
        post_id = row["post_id"]
        vote_type = row.get("vote_type")
        if post_id not in vote_counts:
            vote_counts[post_id] = {"upvote": 0, "downvote": 0}
        if vote_type == "upvote":
            vote_counts[post_id]["upvote"] += 1
        elif vote_type == "downvote":
            vote_counts[post_id]["downvote"] += 1
    return vote_counts


def _normalize_post(
    post_row,
    liked_post_ids=None,
    bookmarked_post_ids=None,
    user_votes=None,
    vote_counts=None,
):
    liked_post_ids = liked_post_ids or set()
    bookmarked_post_ids = bookmarked_post_ids or set()
    user_votes = user_votes or {}
    vote_counts = vote_counts or {}

    post_id = post_row.get("id")
    tags = post_row.get("tags") or []
    if not isinstance(tags, list):
        tags = []
    images = post_row.get("attachments") or post_row.get("images") or []
    if not isinstance(images, list):
        images = []

    created_at = _to_iso(post_row.get("created_at"))
    updated_at = _to_iso(post_row.get("updated_at"))

    author_role = post_row.get("author_role")
    if isinstance(author_role, str):
        author_role = author_role.replace("_", " ").replace("-", " ").title()

    payload = {
        "id": post_id,
        "author_id": post_row.get("author_id") or post_row.get("author_user_id"),
        "author_name": post_row.get("author_name"),
        "author_avatar": post_row.get("author_avatar"),
        "author_role": author_role,
        "content": post_row.get("content"),
        "category": _normalize_category_output(post_row.get("category")),
        "tags": tags,
        "images": images,
        "likes_count": int(post_row.get("likes_count") or 0),
        "comments_count": int(post_row.get("comments_count") or 0),
        "is_liked": post_id in liked_post_ids,
        "is_bookmarked": post_id in bookmarked_post_ids,
        "is_edited": bool(created_at and updated_at and created_at != updated_at),
        "created_at": created_at,
        "updated_at": updated_at,
    }

    vote = vote_counts.get(post_id, {"upvote": 0, "downvote": 0})
    payload["upvotes_count"] = vote.get("upvote", 0)
    payload["downvotes_count"] = vote.get("downvote", 0)
    payload["user_vote"] = user_votes.get(post_id)
    return payload


def _normalize_comment(comment_row, user_map=None, liked_comment_ids=None):
    user_map = user_map or {}
    liked_comment_ids = liked_comment_ids or set()

    author_id = comment_row.get("author_id")
    author = user_map.get(author_id, {})
    created_at = _to_iso(comment_row.get("created_at"))
    updated_at = _to_iso(comment_row.get("updated_at"))
    comment_id = comment_row.get("id")

    return {
        "id": comment_id,
        "post_id": comment_row.get("post_id"),
        "parent_comment_id": comment_row.get("parent_comment_id"),
        "author_id": author_id,
        "author_name": author.get("name") or comment_row.get("author_name"),
        "author_avatar": author.get("avatar") or comment_row.get("author_avatar") or "",
        "content": comment_row.get("content"),
        "likes_count": int(comment_row.get("likes_count") or 0),
        "is_liked": comment_id in liked_comment_ids,
        "created_at": created_at,
        "updated_at": updated_at,
    }


def _ensure_post_exists(post_id, include_non_active=False):
    try:
        response = (
            supabase.table("social_posts")
            .select("id,author_id,status,likes_count,comments_count")
            .eq("id", post_id)
            .execute()
        )
        if not response.data:
            return None
        post = response.data[0]
        if not include_non_active and post.get("status") != "active":
            return None
        return post


    except Exception as e:
        logger.error(f'Error in _ensure_post_exists: {e}')
        return None
def _ensure_comment_exists(comment_id):
    try:
        response = (
            supabase.table("post_comments")
            .select("id,post_id,author_id,content,likes_count,parent_comment_id,created_at,updated_at")
            .eq("id", comment_id)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0]


    except Exception as e:
        logger.error(f'Error in _ensure_comment_exists: {e}')
        return None
def _get_post_likes_count(post_id):
    try:
        response = supabase.table("social_posts").select("likes_count").eq("id", post_id).execute()
        if not response.data:
            return 0
        return int(response.data[0].get("likes_count") or 0)


    except Exception as e:
        logger.error(f'Error in _get_post_likes_count: {e}')
        return 0
def _refresh_comment_likes_count(comment_id):
    try:
        likes_res = (
            supabase.table("comment_likes")
            .select("id", count="exact")
            .eq("comment_id", comment_id)
            .execute()
        )
        likes_count = _count_from_response(likes_res)
        supabase.table("post_comments").update({"likes_count": likes_count}).eq("id", comment_id).execute()
        return likes_count


    except Exception as e:
        logger.error(f'Error in _refresh_comment_likes_count: {e}')
        return 0

def _connections_count(user_id):
    try:
        # Fetch IDs of everyone the user follows
        following_res = supabase.table("user_follows").select("following_id").eq("follower_id", user_id).execute()
        following_ids = [row["following_id"] for row in following_res.data or []]
        if not following_ids:
            return 0
        
        # Count how many of those people follow the user back
        mutual_res = (
            supabase.table("user_follows")
            .select("id", count="exact")
            .eq("following_id", user_id)
            .in_("follower_id", following_ids)
            .execute()
        )
        return _count_from_response(mutual_res)
    except Exception as e:
        logger.error(f"Error in _connections_count for user {user_id}: {e}")
        return 0

def _followers_count(user_id):
    try:
        total_res = (
            supabase.table("user_follows")
            .select("id", count="exact")
            .eq("following_id", user_id)
            .execute()
        )
        total = _count_from_response(total_res)
        logger.info(f"Followers for {user_id}: total={total}")
        return max(0, total)
    except Exception as e:
        logger.error(f'Error in _followers_count: {e}')
        return 0

def _following_count(user_id):
    try:
        total_res = (
            supabase.table("user_follows")
            .select("id", count="exact")
            .eq("follower_id", user_id)
            .execute()
        )
        total = _count_from_response(total_res)
        mutuals = _connections_count(user_id)
        result = max(0, total - mutuals)
        logger.info(f"Following for {user_id}: total={total}, mutuals={mutuals}, result={result}")
        return result
    except Exception as e:
        logger.error(f'Error in _following_count: {e}')
        return 0
def _posts_count(user_id):
    try:
        response = (
            supabase.table("social_posts")
            .select("id", count="exact")
            .eq("author_id", user_id)
            .eq("status", "active")
            .execute()
        )
        return _count_from_response(response)


    except Exception as e:
        logger.error(f'Error in _posts_count: {e}')
        return 0
def _is_following(viewer_user_id, target_user_id):
    try:
        if not viewer_user_id or viewer_user_id == target_user_id:
            return False
        response = (
            supabase.table("user_follows")
            .select("id")
            .eq("follower_id", viewer_user_id)
            .eq("following_id", target_user_id)
            .execute()
        )
        return bool(response.data)


    except Exception as e:
        logger.error(f'Error in _is_following: {e}')
        return False


def _fetch_relationship_status(viewer_id, target_id):
    if not viewer_id or not target_id or viewer_id == target_id:
        return "none"
    try:
        is_following = _is_following(viewer_id, target_id)
        follows_viewer = _is_following(target_id, viewer_id)
        if is_following and follows_viewer:
            return "connected"
        if is_following:
            return "following"
        if follows_viewer:
            return "follower"
        return "none"
    except Exception:
        return "none"


def _bulk_fetch_relationship_maps(viewer_id, other_ids):
    following_ids = set()
    follower_ids = set()
    if not viewer_id or not other_ids:
        return following_ids, follower_ids
    try:
        following_res = (
            supabase.table("user_follows")
            .select("following_id")
            .eq("follower_id", viewer_id)
            .in_("following_id", other_ids)
            .execute()
        )
        following_ids = {row["following_id"] for row in (following_res.data or [])}

        follower_res = (
            supabase.table("user_follows")
            .select("follower_id")
            .eq("following_id", viewer_id)
            .in_("follower_id", other_ids)
            .execute()
        )
        follower_ids = {row["follower_id"] for row in (follower_res.data or [])}
    except Exception:
        pass
    return following_ids, follower_ids
def _build_profile_payload(target_user_id, viewer_user_id=None):
    try:
        user_res = (
            supabase.table("users")
            .select("id,name,email,role,avatar,bio,location,created_at,status")
            .eq("id", target_user_id)
            .execute()
        )
        if not user_res.data:
            return None
    except Exception as e:
        logger.error(f"Error fetching base user for profile: {e}")
        return None

    user_row = user_res.data[0]
    social_profiles = _fetch_social_profiles_map([target_user_id])
    lawyer_profiles = _fetch_lawyer_profiles_map([target_user_id])
    student_profiles = _fetch_student_profiles_map([target_user_id])

    social_profile = social_profiles.get(target_user_id, {})
    lawyer_profile = lawyer_profiles.get(target_user_id, {})
    student_profile = student_profiles.get(target_user_id, {})

    experience = social_profile.get("experience") or []
    if not isinstance(experience, list):
        experience = []
    education = social_profile.get("education") or []
    if not isinstance(education, list):
        education = []

    credentials = social_profile.get("credentials")
    if not credentials and lawyer_profile.get("call_to_bar_year"):
        credentials = f"Called to Bar ({lawyer_profile['call_to_bar_year']})"

    company = social_profile.get("company") or lawyer_profile.get("firm")
    position = social_profile.get("position") or lawyer_profile.get("job_title")

    is_following = _is_following(viewer_user_id, target_user_id)
    follows_viewer = _is_following(target_user_id, viewer_user_id)
    relationship = "none"
    if is_following and follows_viewer:
        relationship = "connected"
    elif is_following:
        relationship = "following"
    elif follows_viewer:
        relationship = "follower"

    return {
        "id": user_row.get("id"),
        "name": user_row.get("name"),
        "email": user_row.get("email"),
        "role": user_row.get("role"),
        "credentials": credentials,
        "avatar": user_row.get("avatar"),
        "cover_image": social_profile.get("cover_image"),
        "bio": user_row.get("bio"),
        "location": user_row.get("location"),
        "company": company,
        "position": position,
        "experience": experience,
        "education": education,
        "followers_count": _followers_count(target_user_id),
        "following_count": _following_count(target_user_id),
        "posts_count": _posts_count(target_user_id),
        "is_following": is_following,
        "follows_viewer": follows_viewer,
        "is_connected": is_following and follows_viewer,
        "relationship": relationship,
        "is_verified": bool(social_profile.get("is_verified") or lawyer_profile.get("verified")),
        "created_at": _to_iso(user_row.get("created_at")),
    }


def _create_notification(user_id, notif_type, message, actor_id=None, post_id=None, comment_id=None, title="Social Hub"):
    payload = {"post_id": post_id, "comment_id": comment_id}
    create_notification(
        user_id,
        notif_type,
        message,
        title=title,
        actor_id=actor_id,
        data=payload,
    )


def _public_notification_type(notif_type):
    return NOTIFICATION_PUBLIC_TYPE_MAP.get(notif_type, notif_type)


def _infer_extension(mimetype):
    if mimetype == "image/jpeg":
        return ".jpg"
    if mimetype == "image/png":
        return ".png"
    if mimetype == "image/webp":
        return ".webp"
    return ""


def _save_image_file(file_obj, folder):
    os.makedirs(os.path.join(UPLOAD_ROOT, folder), exist_ok=True)
    original = secure_filename(file_obj.filename or "upload")
    ext = os.path.splitext(original)[1].lower() or _infer_extension(file_obj.mimetype)
    stored = f"{uuid.uuid4().hex}{ext}"
    destination = os.path.join(UPLOAD_ROOT, folder, stored)
    file_obj.save(destination)
    return f"{folder}/{stored}"


def _build_media_url(relative_path):
    clean = relative_path.replace("\\", "/").lstrip("/")
    return f"{request.host_url.rstrip('/')}/api/social/media/{clean}"


def _get_vote_summary(post_id, user_id=None):
    upvotes_count = 0
    downvotes_count = 0
    user_vote = None

    try:
        response = supabase.table("post_votes").select("user_id,vote_type").eq("post_id", post_id).execute()
    except Exception:
        return {"upvotes_count": 0, "downvotes_count": 0, "user_vote": None}

    for row in response.data or []:
        vote_type = row.get("vote_type")
        if vote_type == "upvote":
            upvotes_count += 1
        elif vote_type == "downvote":
            downvotes_count += 1
        if user_id and row.get("user_id") == user_id:
            user_vote = vote_type

    return {
        "upvotes_count": upvotes_count,
        "downvotes_count": downvotes_count,
        "user_vote": user_vote,
    }


def _list_user_posts(user_id, viewer_user_id=None, tag_filter=None):
    page, limit, offset = _parse_pagination()
    query = (
        supabase.table("v_social_posts_with_authors")
        .select("*", count="exact")
        .eq("author_id", user_id)
        .order("created_at", desc=True)
    )
    if tag_filter:
        query = query.contains("tags", [tag_filter])

    response = query.range(offset, offset + limit - 1).execute()
    rows = response.data or []
    post_ids = [row.get("id") for row in rows if row.get("id")]
    liked_post_ids, bookmarked_post_ids, user_votes = _fetch_post_interaction_sets(viewer_user_id, post_ids)
    vote_counts = _fetch_vote_counts(post_ids)

    posts = [
        _normalize_post(row, liked_post_ids, bookmarked_post_ids, user_votes, vote_counts)
        for row in rows
    ]
    return posts, _build_pagination(page, limit, _count_from_response(response))


def _is_conversation_participant(conversation_id, user_id):
    response = (
        supabase.table("social_conversation_participants")
        .select("id")
        .eq("conversation_id", conversation_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(response.data)


def _find_existing_direct_conversation(user_id, participant_id):
    mine = (
        supabase.table("social_conversation_participants")
        .select("conversation_id")
        .eq("user_id", user_id)
        .execute()
    )
    my_conversation_ids = [row["conversation_id"] for row in (mine.data or [])]
    if not my_conversation_ids:
        return None

    theirs = (
        supabase.table("social_conversation_participants")
        .select("conversation_id")
        .eq("user_id", participant_id)
        .in_("conversation_id", my_conversation_ids)
        .execute()
    )
    common_ids = [row["conversation_id"] for row in (theirs.data or [])]
    if not common_ids:
        return None

    conv = (
        supabase.table("social_conversations")
        .select("id")
        .in_("id", common_ids)
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )
    if conv.data:
        return conv.data[0]["id"]
    return common_ids[0]


def _build_conversation_payloads(conversation_ids):
    conversation_ids = _unique_ids(conversation_ids)
    if not conversation_ids:
        return []

    conversations_res = (
        supabase.table("social_conversations")
        .select("id,created_by,created_at,updated_at")
        .in_("id", conversation_ids)
        .order("updated_at", desc=True)
        .execute()
    )
    conversations = conversations_res.data or []
    if not conversations:
        return []

    participants_res = (
        supabase.table("social_conversation_participants")
        .select("conversation_id,user_id")
        .in_("conversation_id", conversation_ids)
        .execute()
    )
    conversation_to_user_ids = {}
    all_user_ids = []
    for row in participants_res.data or []:
        conv_id = row.get("conversation_id")
        uid = row.get("user_id")
        if not conv_id or not uid:
            continue
        if conv_id not in conversation_to_user_ids:
            conversation_to_user_ids[conv_id] = []
        conversation_to_user_ids[conv_id].append(uid)
        all_user_ids.append(uid)

    users_map = _fetch_users_map(all_user_ids)
    social_profiles_map = _fetch_social_profiles_map(all_user_ids)
    lawyer_profiles_map = _fetch_lawyer_profiles_map(all_user_ids)
    student_profiles_map = _fetch_student_profiles_map(all_user_ids)

    last_messages_res = (
        supabase.table("social_messages")
        .select("conversation_id,content,created_at")
        .in_("conversation_id", conversation_ids)
        .order("created_at", desc=True)
        .execute()
    )
    last_message_map = {}
    for row in last_messages_res.data or []:
        conv_id = row.get("conversation_id")
        if conv_id and conv_id not in last_message_map:
            last_message_map[conv_id] = row

    payloads = []
    for conversation in conversations:
        conv_id = conversation.get("id")
        participant_payloads = []
        for uid in conversation_to_user_ids.get(conv_id, []):
            user_row = users_map.get(uid)
            if not user_row:
                continue
            participant_payloads.append(
                _build_user_summary(
                    user_row,
                    social_profiles_map.get(uid),
                    lawyer_profiles_map.get(uid),
                    student_profiles_map.get(uid),
                )
            )

        last_message = last_message_map.get(conv_id, {})
        payloads.append(
            {
                "id": conv_id,
                "participants": participant_payloads,
                "last_message": last_message.get("content"),
                "updated_at": _to_iso(conversation.get("updated_at") or last_message.get("created_at")),
            }
        )
    return payloads


@social_bp.route("/", methods=["GET"])
def social_index():
    return _json_success(message="Jurisma Social Hub API is active.")


@social_bp.route("/media/<path:asset_path>", methods=["GET"])
def get_social_media(asset_path):
    safe_root = os.path.abspath(UPLOAD_ROOT)
    requested_path = os.path.abspath(os.path.join(safe_root, asset_path))
    if not requested_path.startswith(safe_root):
        return not_found("Media not found")
    if not os.path.exists(requested_path):
        return not_found("Media not found")
    directory, filename = os.path.split(requested_path)
    return send_from_directory(directory, filename)


@social_bp.route("/feed", methods=["GET"])
def get_feed():
    viewer_user_id = _optional_user_id()
    page, limit, offset = _parse_pagination()
    sort_by = str(request.args.get("sort", "recent")).strip().lower()
    if sort_by not in {"recent", "top"}:
        sort_by = "recent"

    try:
        query = supabase.table("v_social_posts_with_authors").select("*", count="exact")
        if sort_by == "top":
            query = (
                query.order("likes_count", desc=True)
                .order("comments_count", desc=True)
                .order("created_at", desc=True)
            )
        else:
            query = query.order("created_at", desc=True)

        response = query.range(offset, offset + limit - 1).execute()
        rows = response.data or []
        post_ids = [row.get("id") for row in rows if row.get("id")]
        liked_post_ids, bookmarked_post_ids, user_votes = _fetch_post_interaction_sets(viewer_user_id, post_ids)
        vote_counts = _fetch_vote_counts(post_ids)

        posts = [
            _normalize_post(row, liked_post_ids, bookmarked_post_ids, user_votes, vote_counts)
            for row in rows
        ]

        return _json_success(
            data=posts,
            pagination=_build_pagination(page, limit, _count_from_response(response)),
            sort_by=sort_by,
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts", methods=["GET"])
def get_posts():
    viewer_user_id = _optional_user_id()
    page, limit, offset = _parse_pagination()
    requested_category = request.args.get("category", "all")
    category = _normalize_category_input(requested_category)
    if category is None:
        return bad_request("Invalid category. Use all, case-insight, legal-news, discussion, or networking")

    try:
        query = supabase.table("v_social_posts_with_authors").select("*", count="exact")
        if category != "all":
            query = query.eq("category", category)

        response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        rows = response.data or []
        post_ids = [row.get("id") for row in rows if row.get("id")]
        liked_post_ids, bookmarked_post_ids, user_votes = _fetch_post_interaction_sets(viewer_user_id, post_ids)
        vote_counts = _fetch_vote_counts(post_ids)

        posts = [
            _normalize_post(row, liked_post_ids, bookmarked_post_ids, user_votes, vote_counts)
            for row in rows
        ]
        return _json_success(
            data=posts,
            pagination=_build_pagination(page, limit, _count_from_response(response)),
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>", methods=["GET"])
def get_post(post_id):
    viewer_user_id = _optional_user_id()
    try:
        response = supabase.table("v_social_posts_with_authors").select("*").eq("id", post_id).execute()
        if not response.data:
            return not_found("Post not found")

        row = response.data[0]
        liked_post_ids, bookmarked_post_ids, user_votes = _fetch_post_interaction_sets(viewer_user_id, [post_id])
        vote_counts = _fetch_vote_counts([post_id])

        return _json_success(
            data=_normalize_post(row, liked_post_ids, bookmarked_post_ids, user_votes, vote_counts)
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts", methods=["POST"])
@token_required
def create_post():
    user_id = request.user["sub"]
    data = request.get_json(silent=True) or {}

    content_raw = data.get("content")
    content = str(content_raw or "").strip()
    category = _normalize_category_input(data.get("category", "discussion"))
    tags = _clean_tags(data.get("tags"))
    images = _clean_image_urls(data.get("images", data.get("attachments")))

    if category is None:
        return bad_request("Invalid category")
    if tags is None:
        return bad_request("Tags must be an array with at most 10 items and 40 characters each")
    if images is None:
        return bad_request("Images must be an array of URLs")
    if not content and not images:
        return bad_request("Post content is required unless images are provided")
    if content and len(content) > MAX_POST_CONTENT_LENGTH:
        return bad_request(f"Post content cannot exceed {MAX_POST_CONTENT_LENGTH} characters")

    try:
        post_id = str(uuid.uuid4())
        supabase.table("social_posts").insert(
            {
                "id": post_id,
                "author_id": user_id,
                "content": content,
                "category": category,
                "tags": tags,
                "attachments": images,
            }
        ).execute()

        response = supabase.table("v_social_posts_with_authors").select("*").eq("id", post_id).execute()
        row = response.data[0] if response.data else {
            "id": post_id,
            "author_id": user_id,
            "content": content,
            "category": category,
            "tags": tags,
            "attachments": images,
            "likes_count": 0,
            "comments_count": 0,
            "created_at": datetime.datetime.utcnow().isoformat(),
            "updated_at": datetime.datetime.utcnow().isoformat(),
        }

        liked_post_ids, bookmarked_post_ids, user_votes = _fetch_post_interaction_sets(user_id, [post_id])
        vote_counts = _fetch_vote_counts([post_id])

        return _json_success(
            message="Post created",
            data=_normalize_post(row, liked_post_ids, bookmarked_post_ids, user_votes, vote_counts),
            status_code=201,
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>", methods=["PUT", "PATCH"])
@token_required
def update_post(post_id):
    user_id = request.user["sub"]
    data = request.get_json(silent=True) or {}

    try:
        post = _ensure_post_exists(post_id, include_non_active=True)
        if not post:
            return not_found("Post not found")
        if post.get("author_id") != user_id:
            return forbidden("You cannot update a post that is not yours")

        update_data = {}
        if "content" in data:
            content = str(data.get("content") or "").strip()
            if not content:
                return bad_request("Content cannot be empty")
            if len(content) > MAX_POST_CONTENT_LENGTH:
                return bad_request(f"Post content cannot exceed {MAX_POST_CONTENT_LENGTH} characters")
            update_data["content"] = content

        if "category" in data:
            category = _normalize_category_input(data.get("category"))
            if category is None:
                return bad_request("Invalid category")
            update_data["category"] = category

        if "tags" in data:
            tags = _clean_tags(data.get("tags"))
            if tags is None:
                return bad_request("Tags must be an array with at most 10 items and 40 characters each")
            update_data["tags"] = tags

        if "images" in data or "attachments" in data:
            images = _clean_image_urls(data.get("images", data.get("attachments")))
            if images is None:
                return bad_request("Images must be an array of URLs")
            update_data["attachments"] = images

        if not update_data:
            return bad_request("Nothing to update")

        update_data["updated_at"] = datetime.datetime.utcnow().isoformat()
        supabase.table("social_posts").update(update_data).eq("id", post_id).execute()

        updated_post = supabase.table("v_social_posts_with_authors").select("*").eq("id", post_id).execute()
        row = updated_post.data[0] if updated_post.data else None
        if not row:
            return not_found("Post not found after update")

        liked_post_ids, bookmarked_post_ids, user_votes = _fetch_post_interaction_sets(user_id, [post_id])
        vote_counts = _fetch_vote_counts([post_id])

        return _json_success(
            message="Post updated",
            data=_normalize_post(row, liked_post_ids, bookmarked_post_ids, user_votes, vote_counts),
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>", methods=["DELETE"])
@token_required
def delete_post(post_id):
    user_id = request.user["sub"]
    user_role = request.user.get("role")

    try:
        post = _ensure_post_exists(post_id, include_non_active=True)
        if not post:
            return not_found("Post not found")

        if post.get("author_id") != user_id and user_role != "admin":
            return forbidden("You cannot delete this post")

        supabase.table("social_posts").update(
            {"status": "deleted", "updated_at": datetime.datetime.utcnow().isoformat()}
        ).eq("id", post_id).execute()
        return _json_success(message="Post deleted successfully")
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>/report", methods=["POST"])
@token_required
def report_post(post_id):
    user_id = request.user["sub"]
    data = request.get_json(silent=True) or {}
    reason = str(data.get("reason") or "").strip().lower()
    description = str(data.get("description") or "").strip() or None

    if reason not in REPORT_REASONS:
        return bad_request("Invalid report reason")

    try:
        post = _ensure_post_exists(post_id)
        if not post:
            return not_found("Post not found")

        supabase.table("post_reports").upsert(
            {
                "post_id": post_id,
                "reporter_id": user_id,
                "reason": reason,
                "description": description,
                "status": "pending",
            },
            on_conflict="post_id,reporter_id",
        ).execute()

        return _json_success(message="Report submitted")
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/upload-image", methods=["POST"])
@token_required
def upload_post_image():
    if "image" not in request.files:
        return bad_request("Image file is required")

    image = request.files["image"]
    if not image or not image.filename:
        return bad_request("Image file is required")
    if image.mimetype not in ALLOWED_IMAGE_MIME_TYPES:
        return bad_request("Invalid image type. Allowed: jpeg, png, webp")

    try:
        image.stream.seek(0, os.SEEK_END)
        file_size = image.stream.tell()
        image.stream.seek(0)
    except Exception:
        file_size = 0

    if file_size > MAX_IMAGE_SIZE_BYTES:
        return bad_request("Image size exceeds 10MB limit")

    try:
        relative_path = _save_image_file(image, "posts")
        url = _build_media_url(relative_path)
        return _json_success(data={"url": url, "thumbnail_url": url})
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>/like", methods=["POST"])
@token_required
def like_post(post_id):
    user_id = request.user["sub"]
    try:
        post = _ensure_post_exists(post_id)
        if not post:
            return not_found("Post not found")

        existing = (
            supabase.table("post_likes")
            .select("id")
            .eq("post_id", post_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not existing.data:
            supabase.table("post_likes").insert({"post_id": post_id, "user_id": user_id}).execute()
            if post.get("author_id") != user_id:
                _create_notification(
                    post.get("author_id"),
                    "post_like",
                    "Someone liked your post",
                    actor_id=user_id,
                    post_id=post_id,
                    title="New Post Like",
                )

        return _json_success(
            data={"is_liked": True, "likes_count": _get_post_likes_count(post_id)}
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>/like", methods=["DELETE"])
@token_required
def unlike_post(post_id):
    user_id = request.user["sub"]
    try:
        post = _ensure_post_exists(post_id)
        if not post:
            return not_found("Post not found")

        supabase.table("post_likes").delete().eq("post_id", post_id).eq("user_id", user_id).execute()
        return _json_success(
            data={"is_liked": False, "likes_count": _get_post_likes_count(post_id)}
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>/likes", methods=["GET"])
def get_post_likes(post_id):
    page, limit, offset = _parse_pagination()
    try:
        post = _ensure_post_exists(post_id)
        if not post:
            return not_found("Post not found")

        likes_res = (
            supabase.table("post_likes")
            .select("user_id,created_at", count="exact")
            .eq("post_id", post_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = likes_res.data or []
        user_ids = [row.get("user_id") for row in rows if row.get("user_id")]

        users_map = _fetch_users_map(user_ids)
        social_profiles_map = _fetch_social_profiles_map(user_ids)
        lawyer_profiles_map = _fetch_lawyer_profiles_map(user_ids)
        student_profiles_map = _fetch_student_profiles_map(user_ids)

        data = []
        for row in rows:
            user_row = users_map.get(row.get("user_id"))
            if not user_row:
                continue
            data.append(
                _build_user_summary(
                    user_row,
                    social_profiles_map.get(user_row["id"]),
                    lawyer_profiles_map.get(user_row["id"]),
                    student_profiles_map.get(user_row["id"]),
                )
            )

        return _json_success(
            data=data,
            pagination=_build_pagination(page, limit, _count_from_response(likes_res)),
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>/bookmark", methods=["POST"])
@token_required
def bookmark_post(post_id):
    user_id = request.user["sub"]
    try:
        post = _ensure_post_exists(post_id)
        if not post:
            return not_found("Post not found")

        existing = (
            supabase.table("post_bookmarks")
            .select("id")
            .eq("post_id", post_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not existing.data:
            supabase.table("post_bookmarks").insert({"post_id": post_id, "user_id": user_id}).execute()

        return _json_success(data={"is_bookmarked": True})
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>/bookmark", methods=["DELETE"])
@token_required
def unbookmark_post(post_id):
    user_id = request.user["sub"]
    try:
        post = _ensure_post_exists(post_id)
        if not post:
            return not_found("Post not found")

        supabase.table("post_bookmarks").delete().eq("post_id", post_id).eq("user_id", user_id).execute()
        return _json_success(data={"is_bookmarked": False})
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/profile/me/bookmarks", methods=["GET"])
@token_required
def get_my_bookmarks():
    user_id = request.user["sub"]
    page, limit, offset = _parse_pagination()
    try:
        bookmarks = (
            supabase.table("post_bookmarks")
            .select("post_id,created_at", count="exact")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = bookmarks.data or []
        post_ids = [row.get("post_id") for row in rows if row.get("post_id")]
        if not post_ids:
            return _json_success(
                data=[],
                pagination=_build_pagination(page, limit, _count_from_response(bookmarks)),
            )

        posts_res = (
            supabase.table("v_social_posts_with_authors")
            .select("*")
            .in_("id", post_ids)
            .execute()
        )
        row_map = {row["id"]: row for row in (posts_res.data or [])}
        liked_post_ids, bookmarked_post_ids, user_votes = _fetch_post_interaction_sets(user_id, post_ids)
        vote_counts = _fetch_vote_counts(post_ids)

        posts = []
        for bookmark_row in rows:
            post_id = bookmark_row.get("post_id")
            row = row_map.get(post_id)
            if row:
                posts.append(
                    _normalize_post(row, liked_post_ids, bookmarked_post_ids, user_votes, vote_counts)
                )

        return _json_success(
            data=posts,
            pagination=_build_pagination(page, limit, _count_from_response(bookmarks)),
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>/upvote", methods=["POST"])
@token_required
def upvote_post(post_id):
    user_id = request.user["sub"]
    try:
        post = _ensure_post_exists(post_id)
        if not post:
            return not_found("Post not found")

        existing = (
            supabase.table("post_votes")
            .select("id,vote_type")
            .eq("post_id", post_id)
            .eq("user_id", user_id)
            .execute()
        )
        if existing.data:
            if existing.data[0].get("vote_type") != "upvote":
                supabase.table("post_votes").update({"vote_type": "upvote"}).eq("post_id", post_id).eq(
                    "user_id", user_id
                ).execute()
        else:
            supabase.table("post_votes").insert(
                {"post_id": post_id, "user_id": user_id, "vote_type": "upvote"}
            ).execute()
        return _json_success(data=_get_vote_summary(post_id, user_id))
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>/upvote", methods=["DELETE"])
@token_required
def remove_upvote(post_id):
    user_id = request.user["sub"]
    try:
        post = _ensure_post_exists(post_id)
        if not post:
            return not_found("Post not found")

        supabase.table("post_votes").delete().eq("post_id", post_id).eq("user_id", user_id).eq(
            "vote_type", "upvote"
        ).execute()
        return _json_success(data=_get_vote_summary(post_id, user_id))
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>/downvote", methods=["POST"])
@token_required
def downvote_post(post_id):
    user_id = request.user["sub"]
    try:
        post = _ensure_post_exists(post_id)
        if not post:
            return not_found("Post not found")

        existing = (
            supabase.table("post_votes")
            .select("id,vote_type")
            .eq("post_id", post_id)
            .eq("user_id", user_id)
            .execute()
        )
        if existing.data:
            if existing.data[0].get("vote_type") != "downvote":
                supabase.table("post_votes").update({"vote_type": "downvote"}).eq("post_id", post_id).eq(
                    "user_id", user_id
                ).execute()
        else:
            supabase.table("post_votes").insert(
                {"post_id": post_id, "user_id": user_id, "vote_type": "downvote"}
            ).execute()
        return _json_success(data=_get_vote_summary(post_id, user_id))
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>/downvote", methods=["DELETE"])
@token_required
def remove_downvote(post_id):
    user_id = request.user["sub"]
    try:
        post = _ensure_post_exists(post_id)
        if not post:
            return not_found("Post not found")

        supabase.table("post_votes").delete().eq("post_id", post_id).eq("user_id", user_id).eq(
            "vote_type", "downvote"
        ).execute()
        return _json_success(data=_get_vote_summary(post_id, user_id))
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>/comments", methods=["GET"])
def get_comments(post_id):
    viewer_user_id = _optional_user_id()
    page, limit, offset = _parse_pagination()
    try:
        post = _ensure_post_exists(post_id)
        if not post:
            return not_found("Post not found")

        comments_res = (
            supabase.table("post_comments")
            .select("*", count="exact")
            .eq("post_id", post_id)
            .order("created_at", desc=False)
            .range(offset, offset + limit - 1)
            .execute()
        )
        comments = comments_res.data or []
        author_ids = [row.get("author_id") for row in comments if row.get("author_id")]
        users_map = _fetch_users_map(author_ids)

        liked_comment_ids = set()
        if viewer_user_id:
            comment_ids = [row.get("id") for row in comments if row.get("id")]
            if comment_ids:
                likes_res = (
                    supabase.table("comment_likes")
                    .select("comment_id")
                    .eq("user_id", viewer_user_id)
                    .in_("comment_id", comment_ids)
                    .execute()
                )
                liked_comment_ids = {row["comment_id"] for row in (likes_res.data or [])}

        data = [
            _normalize_comment(comment_row, users_map, liked_comment_ids)
            for comment_row in comments
        ]
        return _json_success(
            data=data,
            pagination=_build_pagination(page, limit, _count_from_response(comments_res)),
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/comments/<comment_id>", methods=["GET"])
def get_comment(comment_id):
    viewer_user_id = _optional_user_id()
    try:
        comment = _ensure_comment_exists(comment_id)
        if not comment:
            return not_found("Comment not found")

        post = _ensure_post_exists(comment.get("post_id"))
        if not post:
            return not_found("Post not found")

        users_map = _fetch_users_map([comment.get("author_id")])

        liked_comment_ids = set()
        if viewer_user_id:
            likes_res = (
                supabase.table("comment_likes")
                .select("comment_id")
                .eq("user_id", viewer_user_id)
                .eq("comment_id", comment_id)
                .execute()
            )
            liked_comment_ids = {row["comment_id"] for row in (likes_res.data or [])}

        return _json_success(
            data=_normalize_comment(comment, users_map, liked_comment_ids)
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/posts/<post_id>/comments", methods=["POST"])
@token_required
def create_comment(post_id):
    user_id = request.user["sub"]
    data = request.get_json(silent=True) or {}
    content = str(data.get("content") or "").strip()
    parent_comment_id = data.get("parent_comment_id")

    if not content:
        return bad_request("Comment content is required")
    if len(content) > MAX_COMMENT_CONTENT_LENGTH:
        return bad_request(f"Comment cannot exceed {MAX_COMMENT_CONTENT_LENGTH} characters")

    try:
        post = _ensure_post_exists(post_id)
        if not post:
            return not_found("Post not found")

        parent_comment = None
        if parent_comment_id:
            parent_comment = _ensure_comment_exists(parent_comment_id)
            if not parent_comment:
                return not_found("Parent comment not found")
            if parent_comment.get("post_id") != post_id:
                return bad_request("Parent comment does not belong to this post")

        comment_id = str(uuid.uuid4())
        supabase.table("post_comments").insert(
            {
                "id": comment_id,
                "post_id": post_id,
                "author_id": user_id,
                "content": content,
                "parent_comment_id": parent_comment_id,
            }
        ).execute()

        comment_res = supabase.table("post_comments").select("*").eq("id", comment_id).execute()
        row = comment_res.data[0] if comment_res.data else {
            "id": comment_id,
            "post_id": post_id,
            "author_id": user_id,
            "content": content,
            "parent_comment_id": parent_comment_id,
            "likes_count": 0,
            "created_at": datetime.datetime.utcnow().isoformat(),
            "updated_at": datetime.datetime.utcnow().isoformat(),
        }
        users_map = _fetch_users_map([user_id])

        notified_users = set()
        if parent_comment and parent_comment.get("author_id") and parent_comment.get("author_id") != user_id:
            target_id = parent_comment.get("author_id")
            _create_notification(
                target_id,
                "comment_reply",
                "Someone replied to your comment",
                actor_id=user_id,
                post_id=post_id,
                comment_id=comment_id,
                title="New Reply",
            )
            notified_users.add(target_id)

        post_author_id = post.get("author_id")
        if post_author_id and post_author_id != user_id and post_author_id not in notified_users:
            _create_notification(
                post_author_id,
                "post_comment",
                "Someone commented on your post",
                actor_id=user_id,
                post_id=post_id,
                comment_id=comment_id,
                title="New Comment",
            )

        return _json_success(
            message="Comment created",
            data=_normalize_comment(row, users_map, set()),
            status_code=201,
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/comments/<comment_id>", methods=["PUT", "PATCH"])
@token_required
def update_comment(comment_id):
    user_id = request.user["sub"]
    data = request.get_json(silent=True) or {}
    content = str(data.get("content") or "").strip()

    if not content:
        return bad_request("Comment content is required")
    if len(content) > MAX_COMMENT_CONTENT_LENGTH:
        return bad_request(f"Comment cannot exceed {MAX_COMMENT_CONTENT_LENGTH} characters")

    try:
        comment = _ensure_comment_exists(comment_id)
        if not comment:
            return not_found("Comment not found")
        if comment.get("author_id") != user_id:
            return forbidden("You cannot edit this comment")

        supabase.table("post_comments").update(
            {"content": content, "updated_at": datetime.datetime.utcnow().isoformat()}
        ).eq("id", comment_id).execute()

        updated = _ensure_comment_exists(comment_id)
        users_map = _fetch_users_map([user_id])
        return _json_success(
            message="Comment updated",
            data=_normalize_comment(updated, users_map, set()),
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/comments/<comment_id>", methods=["DELETE"])
@token_required
def delete_comment(comment_id):
    user_id = request.user["sub"]
    user_role = request.user.get("role")
    try:
        comment = _ensure_comment_exists(comment_id)
        if not comment:
            return not_found("Comment not found")

        post = _ensure_post_exists(comment.get("post_id"), include_non_active=True)
        post_author_id = post.get("author_id") if post else None

        can_delete = comment.get("author_id") == user_id or post_author_id == user_id or user_role == "admin"
        if not can_delete:
            return forbidden("You cannot delete this comment")

        supabase.table("post_comments").delete().eq("id", comment_id).execute()
        return _json_success(message="Comment deleted successfully")
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/comments/<comment_id>/like", methods=["POST"])
@token_required
def like_comment(comment_id):
    user_id = request.user["sub"]
    try:
        comment = _ensure_comment_exists(comment_id)
        if not comment:
            return not_found("Comment not found")

        existing = (
            supabase.table("comment_likes")
            .select("id")
            .eq("comment_id", comment_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not existing.data:
            supabase.table("comment_likes").insert({"comment_id": comment_id, "user_id": user_id}).execute()
            if comment.get("author_id") != user_id:
                notif_type = "comment_like"
                if comment.get("parent_comment_id"):
                    notif_type = "reply_like"
                _create_notification(
                    comment.get("author_id"),
                    notif_type,
                    "Someone liked your comment",
                    actor_id=user_id,
                    post_id=comment.get("post_id"),
                    comment_id=comment_id,
                    title="New Comment Like",
                )

        likes_count = _refresh_comment_likes_count(comment_id)
        return _json_success(data={"is_liked": True, "likes_count": likes_count})
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/comments/<comment_id>/like", methods=["DELETE"])
@token_required
def unlike_comment(comment_id):
    user_id = request.user["sub"]
    try:
        comment = _ensure_comment_exists(comment_id)
        if not comment:
            return not_found("Comment not found")

        supabase.table("comment_likes").delete().eq("comment_id", comment_id).eq("user_id", user_id).execute()
        likes_count = _refresh_comment_likes_count(comment_id)
        return _json_success(data={"is_liked": False, "likes_count": likes_count})
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/comments/<comment_id>/likes", methods=["GET"])
def get_comment_likes(comment_id):
    page, limit, offset = _parse_pagination()
    try:
        comment = _ensure_comment_exists(comment_id)
        if not comment:
            return not_found("Comment not found")

        likes_res = (
            supabase.table("comment_likes")
            .select("user_id,created_at", count="exact")
            .eq("comment_id", comment_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = likes_res.data or []
        user_ids = [row.get("user_id") for row in rows if row.get("user_id")]
        users_map = _fetch_users_map(user_ids)
        social_profiles_map = _fetch_social_profiles_map(user_ids)
        lawyer_profiles_map = _fetch_lawyer_profiles_map(user_ids)
        student_profiles_map = _fetch_student_profiles_map(user_ids)

        data = []
        for row in rows:
            user_row = users_map.get(row.get("user_id"))
            if not user_row:
                continue
            data.append(
                _build_user_summary(
                    user_row,
                    social_profiles_map.get(user_row["id"]),
                    lawyer_profiles_map.get(user_row["id"]),
                    student_profiles_map.get(user_row["id"]),
                )
            )

        return _json_success(
            data=data,
            pagination=_build_pagination(page, limit, _count_from_response(likes_res)),
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/users/suggestions", methods=["GET"])
@token_required
def get_user_suggestions():
    user_id = request.user["sub"]
    page, limit, offset = _parse_pagination()
    try:
        follows_res = (
            supabase.table("user_follows")
            .select("following_id")
            .eq("follower_id", user_id)
            .execute()
        )
        excluded = {user_id}
        excluded.update(row.get("following_id") for row in (follows_res.data or []) if row.get("following_id"))

        users_res = (
            supabase.table("users")
            .select("id,name,avatar,role,bio,created_at,status")
            .eq("status", "active")
            .order("created_at", desc=True)
            .limit(1000)
            .execute()
        )
        candidates = [row for row in (users_res.data or []) if row.get("id") not in excluded]
        total = len(candidates)
        paged = candidates[offset : offset + limit]

        user_ids = [row.get("id") for row in paged if row.get("id")]
        social_profiles_map = _fetch_social_profiles_map(user_ids)
        lawyer_profiles_map = _fetch_lawyer_profiles_map(user_ids)
        student_profiles_map = _fetch_student_profiles_map(user_ids)

        data = [
            _build_user_summary(
                row,
                social_profiles_map.get(row["id"]),
                lawyer_profiles_map.get(row["id"]),
                student_profiles_map.get(row["id"]),
            )
            for row in paged
        ]
        return _json_success(data=data, pagination=_build_pagination(page, limit, total))
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/users/<user_id>", methods=["GET"])
def get_user_profile(user_id):
    viewer_user_id = _optional_user_id()
    try:
        profile = _build_profile_payload(user_id, viewer_user_id)
        if not profile:
            return not_found("User not found")
        return _json_success(data=profile)
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/profile/me", methods=["GET"])
@token_required
def get_my_profile():
    user_id = request.user["sub"]
    try:
        profile = _build_profile_payload(user_id, user_id)
        if not profile:
            return not_found("User not found")
        return _json_success(data=profile)
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/profile/me", methods=["PUT", "PATCH"])
@token_required
def update_my_profile():
    user_id = request.user["sub"]
    data = request.get_json(silent=True) or {}

    user_updates = {}
    for key in ["name", "bio", "location"]:
        if key in data:
            value = str(data.get(key) or "").strip()
            if key == "name" and not value:
                return bad_request("Name cannot be empty")
            user_updates[key] = value

    social_updates = {}
    for key in ["headline", "credentials", "cover_image", "company", "position"]:
        if key in data:
            social_updates[key] = str(data.get(key) or "").strip() or None

    if "experience" in data:
        if not isinstance(data.get("experience"), list):
            return bad_request("Experience must be an array")
        social_updates["experience"] = data.get("experience")

    if "education" in data:
        if not isinstance(data.get("education"), list):
            return bad_request("Education must be an array")
        social_updates["education"] = data.get("education")

    if not user_updates and not social_updates:
        return bad_request("Nothing to update")

    try:
        if user_updates:
            user_updates["updated_at"] = datetime.datetime.utcnow().isoformat()
            supabase.table("users").update(user_updates).eq("id", user_id).execute()

        if social_updates:
            social_updates["user_id"] = user_id
            supabase.table("social_user_profiles").upsert(social_updates, on_conflict="user_id").execute()

        if "company" in social_updates or "position" in social_updates:
            lawyer_update = {}
            if "company" in social_updates:
                lawyer_update["firm"] = social_updates.get("company")
            if "position" in social_updates:
                lawyer_update["job_title"] = social_updates.get("position")
            if lawyer_update:
                supabase.table("lawyer_profiles").update(lawyer_update).eq("user_id", user_id).execute()

        profile = _build_profile_payload(user_id, user_id)
        return _json_success(message="Profile updated", data=profile)
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/profile/me/avatar", methods=["POST"])
@token_required
def upload_my_avatar():
    user_id = request.user["sub"]
    if "avatar" not in request.files:
        return bad_request("Avatar file is required")
    avatar = request.files["avatar"]
    if not avatar or not avatar.filename:
        return bad_request("Avatar file is required")
    if avatar.mimetype not in ALLOWED_IMAGE_MIME_TYPES:
        return bad_request("Invalid image type")

    try:
        avatar.stream.seek(0, os.SEEK_END)
        size = avatar.stream.tell()
        avatar.stream.seek(0)
    except Exception:
        size = 0
    if size > MAX_IMAGE_SIZE_BYTES:
        return bad_request("Image size exceeds 10MB limit")

    try:
        relative_path = _save_image_file(avatar, "avatars")
        avatar_url = _build_media_url(relative_path)
        supabase.table("users").update({"avatar": avatar_url}).eq("id", user_id).execute()
        return _json_success(data={"url": avatar_url})
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/profile/me/cover", methods=["POST"])
@token_required
def upload_my_cover():
    user_id = request.user["sub"]
    if "cover" not in request.files:
        return bad_request("Cover file is required")
    cover = request.files["cover"]
    if not cover or not cover.filename:
        return bad_request("Cover file is required")
    if cover.mimetype not in ALLOWED_IMAGE_MIME_TYPES:
        return bad_request("Invalid image type")

    try:
        cover.stream.seek(0, os.SEEK_END)
        size = cover.stream.tell()
        cover.stream.seek(0)
    except Exception:
        size = 0
    if size > MAX_IMAGE_SIZE_BYTES:
        return bad_request("Image size exceeds 10MB limit")

    try:
        relative_path = _save_image_file(cover, "covers")
        cover_url = _build_media_url(relative_path)
        supabase.table("social_user_profiles").upsert(
            {"user_id": user_id, "cover_image": cover_url},
            on_conflict="user_id",
        ).execute()
        return _json_success(data={"url": cover_url})
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/users/<target_user_id>/follow", methods=["POST"])
@token_required
def follow_user(target_user_id):
    follower_id = request.user["sub"]
    if follower_id == target_user_id:
        return bad_request("You cannot follow yourself")

    try:
        target_res = supabase.table("users").select("id").eq("id", target_user_id).eq("status", "active").execute()
        if not target_res.data:
            return not_found("User not found")

        existing = (
            supabase.table("user_follows")
            .select("id")
            .eq("follower_id", follower_id)
            .eq("following_id", target_user_id)
            .execute()
        )
        if not existing.data:
            supabase.table("user_follows").insert(
                {"follower_id": follower_id, "following_id": target_user_id}
            ).execute()
            _create_notification(
                target_user_id,
                "new_follower",
                "You have a new follower",
                actor_id=follower_id,
                title="New Follower",
            )

        return _json_success(
            data={"is_following": True, "followers_count": _followers_count(target_user_id)}
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/users/<target_user_id>/follow", methods=["DELETE"])
@token_required
def unfollow_user(target_user_id):
    follower_id = request.user["sub"]
    if follower_id == target_user_id:
        return bad_request("You cannot unfollow yourself")

    try:
        target_res = supabase.table("users").select("id").eq("id", target_user_id).eq("status", "active").execute()
        if not target_res.data:
            return not_found("User not found")

        supabase.table("user_follows").delete().eq("follower_id", follower_id).eq(
            "following_id", target_user_id
        ).execute()

        return _json_success(
            data={"is_following": False, "followers_count": _followers_count(target_user_id)}
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/users/<user_id>/followers", methods=["GET"])
def get_followers(user_id):
    page, limit, offset = _parse_pagination()
    viewer_id = _optional_user_id()
    try:
        followers = (
            supabase.table("user_follows")
            .select("follower_id,created_at", count="exact")
            .eq("following_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = followers.data or []
        user_ids = [row.get("follower_id") for row in rows if row.get("follower_id")]
        
        users_map = _fetch_users_map(user_ids)
        social_profiles_map = _fetch_social_profiles_map(user_ids)
        lawyer_profiles_map = _fetch_lawyer_profiles_map(user_ids)
        student_profiles_map = _fetch_student_profiles_map(user_ids)

        # Determine relationship for THE VIEWER (to show buttons)
        viewer_following, viewer_followers = _bulk_fetch_relationship_maps(viewer_id, user_ids)

        data = []
        for row in rows:
            uid = row.get("follower_id")
            user_row = users_map.get(uid)
            if not user_row:
                continue

            summary = _build_user_summary(
                user_row,
                social_profiles_map.get(uid),
                lawyer_profiles_map.get(uid),
                student_profiles_map.get(uid),
            )
            summary["is_connected"] = uid in viewer_following and uid in viewer_followers
            summary["relationship"] = "connected" if summary["is_connected"] else ("following" if uid in viewer_following else ("follower" if uid in viewer_followers else "none"))
            data.append(summary)

        return _json_success(
            data=data,
            pagination=_build_pagination(page, limit, _count_from_response(followers)),
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/users/<user_id>/following", methods=["GET"])
def get_following(user_id):
    page, limit, offset = _parse_pagination()
    viewer_id = _optional_user_id()
    try:
        following = (
            supabase.table("user_follows")
            .select("following_id,created_at", count="exact")
            .eq("follower_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = following.data or []
        user_ids = [row.get("following_id") for row in rows if row.get("following_id")]
        
        users_map = _fetch_users_map(user_ids)
        social_profiles_map = _fetch_social_profiles_map(user_ids)
        lawyer_profiles_map = _fetch_lawyer_profiles_map(user_ids)
        student_profiles_map = _fetch_student_profiles_map(user_ids)
        
        # Determine mutual connections for THE LIST OWNER
        owner_following, owner_followers = _bulk_fetch_relationship_maps(user_id, user_ids)
        
        # Determine relationship for THE VIEWER
        viewer_following, viewer_followers = _bulk_fetch_relationship_maps(viewer_id, user_ids)

        data = []
        for row in rows:
            uid = row.get("following_id")
            user_row = users_map.get(uid)
            if not user_row:
                continue
            
            # Following list should ONLY show one-way follows for the owner
            if uid in owner_following and uid in owner_followers:
                continue

            summary = _build_user_summary(
                user_row,
                social_profiles_map.get(uid),
                lawyer_profiles_map.get(uid),
                student_profiles_map.get(uid),
            )
            summary["is_connected"] = uid in viewer_following and uid in viewer_followers
            summary["relationship"] = "connected" if summary["is_connected"] else ("following" if uid in viewer_following else ("follower" if uid in viewer_followers else "none"))
            data.append(summary)

        return _json_success(
            data=data,
            pagination=_build_pagination(page, limit, _count_from_response(following)),
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/users/<user_id>/posts", methods=["GET"])
def get_user_posts(user_id):
    viewer_user_id = _optional_user_id()
    try:
        posts, pagination = _list_user_posts(user_id, viewer_user_id, tag_filter=None)
        return _json_success(data=posts, pagination=pagination)
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/users/<user_id>/answers", methods=["GET"])
def get_user_answers(user_id):
    viewer_user_id = _optional_user_id()
    try:
        posts, pagination = _list_user_posts(user_id, viewer_user_id, tag_filter="answer")
        return _json_success(data=posts, pagination=pagination)
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/users/<user_id>/questions", methods=["GET"])
def get_user_questions(user_id):
    viewer_user_id = _optional_user_id()
    try:
        posts, pagination = _list_user_posts(user_id, viewer_user_id, tag_filter="question")
        return _json_success(data=posts, pagination=pagination)
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/users/<user_id>/activity", methods=["GET"])
def get_user_activity(user_id):
    page, limit, offset = _parse_pagination()
    activity_type = str(request.args.get("type", "all")).strip().lower()
    if activity_type not in {"all", "posts", "comments", "likes"}:
        return bad_request("Invalid activity type")

    try:
        actor_map = _fetch_users_map([user_id])
        actor_user = actor_map.get(user_id)
        if not actor_user:
            return not_found("User not found")
        actor_summary = _build_user_summary(actor_user)

        items = []
        if activity_type in {"all", "posts"}:
            posts_res = (
                supabase.table("social_posts")
                .select("id,created_at")
                .eq("author_id", user_id)
                .eq("status", "active")
                .order("created_at", desc=True)
                .limit(300)
                .execute()
            )
            for row in posts_res.data or []:
                items.append(
                    {
                        "id": f"act_post_{row['id']}",
                        "type": "post",
                        "actor": actor_summary,
                        "post_id": row.get("id"),
                        "comment_id": None,
                        "created_at": _to_iso(row.get("created_at")),
                    }
                )

        if activity_type in {"all", "comments"}:
            comments_res = (
                supabase.table("post_comments")
                .select("id,post_id,created_at")
                .eq("author_id", user_id)
                .order("created_at", desc=True)
                .limit(300)
                .execute()
            )
            for row in comments_res.data or []:
                items.append(
                    {
                        "id": f"act_comment_{row['id']}",
                        "type": "comment",
                        "actor": actor_summary,
                        "post_id": row.get("post_id"),
                        "comment_id": row.get("id"),
                        "created_at": _to_iso(row.get("created_at")),
                    }
                )

        if activity_type in {"all", "likes"}:
            likes_res = (
                supabase.table("post_likes")
                .select("id,post_id,created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(300)
                .execute()
            )
            for row in likes_res.data or []:
                items.append(
                    {
                        "id": f"act_like_{row['id']}",
                        "type": "like",
                        "actor": actor_summary,
                        "post_id": row.get("post_id"),
                        "comment_id": None,
                        "created_at": _to_iso(row.get("created_at")),
                    }
                )

        items.sort(key=lambda item: item.get("created_at") or "", reverse=True)
        total = len(items)
        paged = items[offset : offset + limit]
        return _json_success(data=paged, pagination=_build_pagination(page, limit, total))
    except Exception as exc:
        logger.exception(f"Error in get_social_notifications: {exc}")
        return error_response(str(exc))


@social_bp.route("/notifications", methods=["GET"])
@token_required
def get_social_notifications():
    user_id = request.user["sub"]
    page, limit, offset = _parse_pagination()
    unread_only = _parse_bool(request.args.get("unread_only"))
    try:
        query = supabase.table("notifications").select("*", count="exact").eq("user_id", user_id)
        if unread_only:
            query = query.eq("read", False)
        notifications_res = (
            query.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = notifications_res.data or []

        unread_count_res = (
            supabase.table("notifications")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("read", False)
            .execute()
        )
        unread_count = _count_from_response(unread_count_res)

        actor_ids = []
        for row in rows:
            data_blob = row.get("data")
            if isinstance(data_blob, dict) and data_blob.get("actor_id"):
                actor_ids.append(data_blob.get("actor_id"))

        users_map = _fetch_users_map(actor_ids)
        social_profiles_map = _fetch_social_profiles_map(actor_ids)
        lawyer_profiles_map = _fetch_lawyer_profiles_map(actor_ids)
        student_profiles_map = _fetch_student_profiles_map(actor_ids)

        data = []
        for row in rows:
            data_blob = row.get("data") if isinstance(row.get("data"), dict) else {}
            actor_id = data_blob.get("actor_id")
            actor = {"id": "", "name": "", "avatar": ""}
            if actor_id and actor_id in users_map:
                actor = _build_user_summary(
                    users_map[actor_id],
                    social_profiles_map.get(actor_id),
                    lawyer_profiles_map.get(actor_id),
                    student_profiles_map.get(actor_id),
                )

            data.append(
                {
                    "id": row.get("id"),
                    "type": _public_notification_type(row.get("type")),
                    "title": row.get("title"),
                    "message": row.get("message"),
                    "is_read": bool(row.get("read")),
                    "actor": actor,
                    "post_id": data_blob.get("post_id"),
                    "comment_id": data_blob.get("comment_id"),
                    "data": data_blob,
                    "created_at": _to_iso(row.get("created_at")),
                }
            )

        return _json_success(
            data=data,
            unread_count=unread_count,
            pagination=_build_pagination(page, limit, _count_from_response(notifications_res)),
        )
    except Exception as exc:
        logger.exception(f"Error in get_social_notifications: {exc}")
        return error_response(str(exc))


@social_bp.route("/notifications/<notification_id>/read", methods=["PUT"])
@token_required
def mark_notification_read(notification_id):
    user_id = request.user["sub"]
    try:
        supabase.table("notifications").update({"read": True}).eq("id", notification_id).eq(
            "user_id", user_id
        ).execute()
        return _json_success(message="Notification marked as read")
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/notifications/read-all", methods=["PUT"])
@token_required
def mark_all_notifications_read():
    user_id = request.user["sub"]
    try:
        supabase.table("notifications").update({"read": True}).eq("user_id", user_id).execute()
        return _json_success(message="All notifications marked as read")
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/search/users", methods=["GET"])
def search_users():
    page, limit, offset = _parse_pagination()
    query_text = str(request.args.get("q") or "").strip()
    if not query_text:
        return _json_success(data=[], pagination=_build_pagination(page, limit, 0))

    viewer_id = _optional_user_id()
    try:
        users_res = (
            supabase.table("users")
            .select("id,name,avatar,role,bio,status", count="exact")
            .eq("status", "active")
            .ilike("name", f"%{query_text}%")
            .order("name")
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = users_res.data or []
        user_ids = [row.get("id") for row in rows if row.get("id")]
        
        social_profiles_map = _fetch_social_profiles_map(user_ids)
        lawyer_profiles_map = _fetch_lawyer_profiles_map(user_ids)
        student_profiles_map = _fetch_student_profiles_map(user_ids)
        following_set, follower_set = _bulk_fetch_relationship_maps(viewer_id, user_ids)

        data = []
        for row in rows:
            uid = row["id"]
            summary = _build_user_summary(
                row,
                social_profiles_map.get(uid),
                lawyer_profiles_map.get(uid),
                student_profiles_map.get(uid),
            )
            summary["is_connected"] = uid in following_set and uid in follower_set
            summary["relationship"] = "connected" if summary["is_connected"] else ("following" if uid in following_set else ("follower" if uid in follower_set else "none"))
            data.append(summary)

        return _json_success(
            data=data,
            pagination=_build_pagination(page, limit, _count_from_response(users_res)),
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/search/posts", methods=["GET"])
def search_posts():
    viewer_user_id = _optional_user_id()
    page, limit, offset = _parse_pagination()
    query_text = str(request.args.get("q") or "").strip()
    if not query_text:
        return _json_success(data=[], pagination=_build_pagination(page, limit, 0))

    try:
        posts_res = (
            supabase.table("v_social_posts_with_authors")
            .select("*", count="exact")
            .ilike("content", f"%{query_text}%")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = posts_res.data or []
        post_ids = [row.get("id") for row in rows if row.get("id")]
        liked_post_ids, bookmarked_post_ids, user_votes = _fetch_post_interaction_sets(viewer_user_id, post_ids)
        vote_counts = _fetch_vote_counts(post_ids)

        data = [
            _normalize_post(row, liked_post_ids, bookmarked_post_ids, user_votes, vote_counts)
            for row in rows
        ]
        return _json_success(
            data=data,
            pagination=_build_pagination(page, limit, _count_from_response(posts_res)),
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/messages/conversations", methods=["POST"])
@token_required
def create_conversation():
    user_id = request.user["sub"]
    data = request.get_json(silent=True) or {}
    participant_id = str(data.get("participant_id") or "").strip()
    if not participant_id:
        return bad_request("participant_id is required")
    if participant_id == user_id:
        return bad_request("You cannot create a conversation with yourself")

    try:
        participant_exists = (
            supabase.table("users")
            .select("id")
            .eq("id", participant_id)
            .eq("status", "active")
            .execute()
        )
        if not participant_exists.data:
            return not_found("Participant not found")

        conversation_id = _find_existing_direct_conversation(user_id, participant_id)
        status_code = 200
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            now = datetime.datetime.utcnow().isoformat()
            supabase.table("social_conversations").insert(
                {"id": conversation_id, "created_by": user_id, "created_at": now, "updated_at": now}
            ).execute()
            supabase.table("social_conversation_participants").insert(
                {"conversation_id": conversation_id, "user_id": user_id}
            ).execute()
            supabase.table("social_conversation_participants").insert(
                {"conversation_id": conversation_id, "user_id": participant_id}
            ).execute()
            status_code = 201

        payloads = _build_conversation_payloads([conversation_id])
        payload = payloads[0] if payloads else {"id": conversation_id, "participants": [], "last_message": None}
        return _json_success(data=payload, status_code=status_code)
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/messages/conversations", methods=["GET"])
@token_required
def get_conversations():
    user_id = request.user["sub"]
    try:
        participants_res = (
            supabase.table("social_conversation_participants")
            .select("conversation_id")
            .eq("user_id", user_id)
            .execute()
        )
        conversation_ids = [row.get("conversation_id") for row in (participants_res.data or []) if row.get("conversation_id")]
        if not conversation_ids:
            return _json_success(data=[])
        payloads = _build_conversation_payloads(conversation_ids)
        return _json_success(data=payloads)
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/messages/conversations/<conversation_id>/messages", methods=["GET"])
@token_required
def get_conversation_messages(conversation_id):
    user_id = request.user["sub"]
    page, limit, offset = _parse_pagination()
    try:
        if not _is_conversation_participant(conversation_id, user_id):
            return forbidden("You are not a participant in this conversation")

        messages_res = (
            supabase.table("social_messages")
            .select("id,conversation_id,sender_id,content,created_at", count="exact")
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = list(reversed(messages_res.data or []))
        data = [
            {
                "id": row.get("id"),
                "conversation_id": row.get("conversation_id"),
                "sender_id": row.get("sender_id"),
                "content": row.get("content"),
                "created_at": _to_iso(row.get("created_at")),
            }
            for row in rows
        ]
        return _json_success(
            data=data,
            pagination=_build_pagination(page, limit, _count_from_response(messages_res)),
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/messages/conversations/<conversation_id>/messages", methods=["POST"])
@token_required
def send_conversation_message(conversation_id):
    user_id = request.user["sub"]
    data = request.get_json(silent=True) or {}
    content = str(data.get("content") or "").strip()
    if not content:
        return bad_request("Message content is required")
    if len(content) > 5000:
        return bad_request("Message content cannot exceed 5000 characters")

    try:
        if not _is_conversation_participant(conversation_id, user_id):
            return forbidden("You are not a participant in this conversation")

        message_id = str(uuid.uuid4())
        created_at = datetime.datetime.utcnow().isoformat()
        supabase.table("social_messages").insert(
            {
                "id": message_id,
                "conversation_id": conversation_id,
                "sender_id": user_id,
                "content": content,
                "created_at": created_at,
            }
        ).execute()
        supabase.table("social_conversations").update({"updated_at": created_at}).eq("id", conversation_id).execute()

        participants_res = (
            supabase.table("social_conversation_participants")
            .select("user_id")
            .eq("conversation_id", conversation_id)
            .execute()
        )
        for row in participants_res.data or []:
            target_id = row.get("user_id")
            if target_id and target_id != user_id:
                _create_notification(
                    target_id,
                    "mention",
                    "You have a new message",
                    actor_id=user_id,
                    title="New Message",
                )

        return _json_success(
            data={
                "id": message_id,
                "conversation_id": conversation_id,
                "sender_id": user_id,
                "content": content,
                "created_at": created_at,
            },
            status_code=201,
        )
    except Exception as exc:
        return error_response(str(exc))


@social_bp.route("/trending", methods=["GET"])
def get_trending():
    try:
        response = (
            supabase.table("trending_topics")
            .select("*")
            .order("trending_score", desc=True)
            .limit(10)
            .execute()
        )
        return _json_success(data=response.data or [])
    except Exception as exc:
        return error_response(str(exc))
