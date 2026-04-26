import logging
from typing import Iterable, Optional

from db.connection import supabase

logger = logging.getLogger(__name__)


def create_notification(
    user_id: Optional[str],
    notif_type: str,
    message: str,
    *,
    title: str = "Notification",
    actor_id: Optional[str] = None,
    data: Optional[dict] = None,
) -> None:
    if not user_id:
        return

    payload = dict(data or {})
    if actor_id:
        payload.setdefault("actor_id", actor_id)

    try:
        supabase.table("notifications").insert(
            {
                "user_id": user_id,
                "type": notif_type,
                "title": title,
                "message": message,
                "data": payload,
            }
        ).execute()
    except Exception:
        logger.exception("Failed to create notification")


def notify_users(
    user_ids: Iterable[str],
    notif_type: str,
    message: str,
    *,
    title: str = "Notification",
    actor_id: Optional[str] = None,
    data: Optional[dict] = None,
) -> None:
    seen = set()
    for uid in user_ids:
        if not uid or uid in seen:
            continue
        if actor_id and uid == actor_id:
            continue
        seen.add(uid)
        create_notification(
            uid,
            notif_type,
            message,
            title=title,
            actor_id=actor_id,
            data=data,
        )


def get_case_participants(case_id: str) -> set[str]:
    participants: set[str] = set()
    try:
        case_res = supabase.table("cases").select("created_by").eq("id", case_id).execute()
        if case_res.data:
            participants.add(case_res.data[0].get("created_by"))

        lawyer_res = (
            supabase.table("case_lawyers")
            .select("lawyer_id")
            .eq("case_id", case_id)
            .execute()
        )
        for row in lawyer_res.data or []:
            if row.get("lawyer_id"):
                participants.add(row["lawyer_id"])
    except Exception:
        logger.exception("Failed to fetch case participants")

    return participants


def notify_case_participants(
    case_id: str,
    notif_type: str,
    message: str,
    *,
    title: str = "Case Update",
    actor_id: Optional[str] = None,
    data: Optional[dict] = None,
) -> None:
    participants = get_case_participants(case_id)
    payload = dict(data or {})
    payload.setdefault("case_id", case_id)
    notify_users(
        participants,
        notif_type,
        message,
        title=title,
        actor_id=actor_id,
        data=payload,
    )
