"""
Jurisma Curriculum API Routes
Serves structured study content: subjects, sections, slides, progress, quiz linkage.
"""

from flask import Blueprint, request
from db.connection import supabase
from utils.responses import success_response, error_response, bad_request, not_found
from utils.auth_helpers import token_required
import uuid

curriculum_bp = Blueprint('curriculum', __name__)


# ─────────────────────────────────────────────────────────────────────────────
# SUBJECTS
# ─────────────────────────────────────────────────────────────────────────────

@curriculum_bp.route('/subjects', methods=['GET'])
@token_required
def get_subjects():
    """
    GET /api/curriculum/subjects
    Query params: level (100L|200L|300L|400L|500L)
    Returns all subjects, optionally filtered by level.
    """
    level = request.args.get('level')
    try:
        query = supabase.table("curriculum_subjects").select("*").eq("is_published", True)
        if level:
            query = query.eq("level", level)
        res = query.order("level").order("name").execute()
        return success_response(data=res.data)
    except Exception as e:
        return error_response(str(e))


@curriculum_bp.route('/subjects/<slug>', methods=['GET'])
@token_required
def get_subject(slug):
    """
    GET /api/curriculum/subjects/:slug
    Returns a subject with all its sections, including per-section slide completion for the user.
    """
    user_id = request.user['sub']
    # Defensive cleanup for slug (removes trailing symbols like > or spaces)
    slug = slug.strip().rstrip('>').strip()
    try:
        subj_res = supabase.table("curriculum_subjects").select("*").eq("slug", slug).execute()
        if not subj_res.data:
            return not_found("Subject not found")

        subject = subj_res.data[0]
        subject_id = subject["id"]

        sections_res = supabase.table("curriculum_sections").select(
            "id, section_number, title, description, total_slides, has_quiz, quiz_id"
        ).eq("subject_id", subject_id).eq("is_published", True).order("section_number").execute()

        sections = sections_res.data

        # Fetch all completed slides for this user across all sections in this subject
        section_ids = [s["id"] for s in sections]
        if section_ids:
            progress_res = supabase.table("user_slide_progress").select(
                "section_id"
            ).eq("user_id", user_id).in_("section_id", section_ids).execute()

            # Count completed slides per section
            completed_per_section = {}
            for row in progress_res.data:
                sid = row["section_id"]
                completed_per_section[sid] = completed_per_section.get(sid, 0) + 1
        else:
            completed_per_section = {}

        # Annotate each section with completion data
        for sec in sections:
            completed = completed_per_section.get(sec["id"], 0)
            total = sec.get("total_slides") or 0
            sec["completed_slides"] = completed
            sec["is_completed"] = total > 0 and completed >= total

        subject["sections"] = sections
        return success_response(data=subject)
    except Exception as e:
        return error_response(str(e))


# ─────────────────────────────────────────────────────────────────────────────
# SECTIONS
# ─────────────────────────────────────────────────────────────────────────────

@curriculum_bp.route('/sections/<section_id>/slides', methods=['GET'])
@token_required
def get_section_slides(section_id):
    """
    GET /api/curriculum/sections/:section_id/slides
    Returns all slides for a section, plus the user's completion status per slide.
    """
    user_id = request.user['sub']
    try:
        slides_res = supabase.table("curriculum_slides").select("*").eq(
            "section_id", section_id
        ).order("slide_number").execute()

        slides = slides_res.data

        # Get user progress for these slides
        slide_ids = [s["id"] for s in slides]
        if slide_ids:
            prog_res = supabase.table("user_slide_progress").select(
                "slide_id, completed"
            ).eq("user_id", user_id).in_("slide_id", slide_ids).execute()
            completed_map = {p["slide_id"]: p["completed"] for p in prog_res.data}
        else:
            completed_map = {}

        for slide in slides:
            slide["is_completed"] = completed_map.get(slide["id"], False)

        return success_response(data=slides)
    except Exception as e:
        return error_response(str(e))


# ─────────────────────────────────────────────────────────────────────────────
# SLIDE PROGRESS
# ─────────────────────────────────────────────────────────────────────────────

@curriculum_bp.route('/slides/<slide_id>/complete', methods=['POST'])
@token_required
def mark_slide_complete(slide_id):
    """
    POST /api/curriculum/slides/:slide_id/complete
    Marks a slide as completed for the current user.
    """
    user_id = request.user['sub']
    try:
        # Get the slide to find section + subject
        slide_res = supabase.table("curriculum_slides").select(
            "id, section_id"
        ).eq("id", slide_id).execute()
        if not slide_res.data:
            return not_found("Slide not found")

        slide = slide_res.data[0]
        section_id = slide["section_id"]

        # Get section to find subject_id
        sec_res = supabase.table("curriculum_sections").select(
            "subject_id"
        ).eq("id", section_id).execute()
        subject_id = sec_res.data[0]["subject_id"] if sec_res.data else None

        from datetime import datetime, timezone

        supabase.table("user_slide_progress").upsert({
            "user_id": user_id,
            "slide_id": slide_id,
            "section_id": section_id,
            "subject_id": subject_id,
            "completed": True,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        return success_response(data={"slide_id": slide_id, "completed": True})
    except Exception as e:
        return error_response(str(e))


# ─────────────────────────────────────────────────────────────────────────────
# PROGRESS OVERVIEW
# ─────────────────────────────────────────────────────────────────────────────

@curriculum_bp.route('/progress', methods=['GET'])
@token_required
def get_curriculum_progress():
    """
    GET /api/curriculum/progress
    Returns per-subject progress for the current user.
    """
    user_id = request.user['sub']
    try:
        # Count completed slides per subject AND per section
        prog_res = supabase.table("user_slide_progress").select(
            "subject_id, section_id"
        ).eq("user_id", user_id).eq("completed", True).execute()

        # Count per subject (slide-level)
        subject_counts = {}
        # Count per section (slide-level)
        section_counts = {}
        for row in prog_res.data:
            sid = row["subject_id"]
            sec_id = row["section_id"]
            if sid:
                subject_counts[sid] = subject_counts.get(sid, 0) + 1
            if sec_id:
                section_counts[sec_id] = section_counts.get(sec_id, 0) + 1

        # Get all subjects with their totals
        subj_res = supabase.table("curriculum_subjects").select(
            "id, name, slug, level, icon, total_slides, total_sections"
        ).eq("is_published", True).execute()

        # Get all sections with their total_slides counts (to know if a section is fully done)
        all_sections_res = supabase.table("curriculum_sections").select(
            "id, subject_id, total_slides"
        ).eq("is_published", True).execute()

        # Group sections by subject_id
        sections_by_subject = {}
        for sec in all_sections_res.data:
            sub_id = sec["subject_id"]
            if sub_id not in sections_by_subject:
                sections_by_subject[sub_id] = []
            sections_by_subject[sub_id].append(sec)

        progress = []
        for subj in subj_res.data:
            completed = subject_counts.get(subj["id"], 0)
            total = subj.get("total_slides", 1) or 1
            pct = round((completed / total) * 100, 1)

            # Count completed sections: sections where completed_slides >= total_slides
            subj_sections = sections_by_subject.get(subj["id"], [])
            completed_sections = sum(
                1 for sec in subj_sections
                if (sec.get("total_slides") or 0) > 0
                and section_counts.get(sec["id"], 0) >= (sec.get("total_slides") or 1)
            )

            progress.append({
                "subject_id": subj["id"],
                "subject": subj["name"],
                "slug": subj["slug"],
                "level": subj["level"],
                "icon": subj.get("icon", "📜"),
                "completed_slides": completed,
                "total_slides": total,
                "total_sections": subj.get("total_sections", 0),
                "completed_sections": completed_sections,
                "progress_percentage": min(pct, 100),
            })

        return success_response(data=progress)
    except Exception as e:
        return error_response(str(e))


# ─────────────────────────────────────────────────────────────────────────────
# SECTION QUIZ
# ─────────────────────────────────────────────────────────────────────────────

@curriculum_bp.route('/sections/<section_id>/quiz', methods=['GET'])
@token_required
def get_section_quiz(section_id):
    """
    GET /api/curriculum/sections/:section_id/quiz?count=10
    Returns quiz questions for a section. count = 5|10|15|20 (default 10).
    If a quiz exists in DB, returns random subset of its questions.
    If none exists, returns 404 (client should show "coming soon" state).
    """
    count = int(request.args.get('count', 10))
    count = max(5, min(count, 20))  # clamp: 5–20

    try:
        # Find quiz linked to this section
        quiz_res = supabase.table("quizzes").select("*").eq(
            "section_id", section_id
        ).eq("status", "active").limit(1).execute()

        if not quiz_res.data:
            # ON-THE-FLY GENERATION
            # If no quiz exists, we trigger the external AI to create it based on the section content.
            # 1. Fetch section and subject data
            sec_res = supabase.table("curriculum_sections").select("*, curriculum_subjects(*)").eq("id", section_id).execute()
            if not sec_res.data:
                return not_found("Section not found")
                
            section = sec_res.data[0]
            subject = section["curriculum_subjects"]
            
            # 2. Fetch slides for content
            slides_res = supabase.table("curriculum_slides").select("content").eq("section_id", section_id).execute()
            slide_texts = []
            for slide in slides_res.data:
                content = slide.get("content", {})
                academic = content.get("academic", "")
                exam = content.get("exam", "")
                if academic:
                    slide_texts.append(academic)
                if exam:
                    slide_texts.append(exam)
            
            combined_content = "\n\n".join(slide_texts)[:6000]
            
            from routes.ai import genai_client, GEMINI_MODEL
            import json, re
            
            prompt = f"""You are an expert Nigerian law examiner creating multiple-choice questions.
Based on this content from "{section['title']}" in "{subject['name']}" ({subject['level']}):

---
{combined_content}
---

Generate EXACTLY 20 high-quality MCQ questions. Return ONLY a valid JSON array (no markdown):

[
  {{
    "question": "Scenario-based or concept-based question?",
    "difficulty": "easy|medium|hard",
    "options": ["A) opt", "B) opt", "C) opt", "D) opt"],
    "correct_option": "A",
    "explanation": "Explanation here",
    "principle": "Core principle"
  }}
]
"""
            questions = []
            if genai_client:
                try:
                    response = genai_client.models.generate_content(
                        model=GEMINI_MODEL,
                        contents=prompt
                    )
                    text = response.text
                    text = re.sub(r"```json\s*", "", text)
                    text = re.sub(r"```\s*", "", text)
                    text = text.strip()
                    
                    try:
                        questions = json.loads(text)
                    except Exception:
                        match = re.search(r'\[.*\]', text, re.DOTALL)
                        if match:
                            questions = json.loads(match.group())
                except Exception as e:
                    print(f"On-the-fly generation failed: {e}")
            
            if not questions:
                return not_found("AI failed to generate quiz for this section at this time.")
                
            # 3. Save to database for the next user
            quiz_id = str(uuid.uuid4())
            supabase.table("quizzes").insert({
                "id": quiz_id,
                "title": f"{subject['name']}: {section['title']}",
                "subject": subject['name'],
                "difficulty": "medium",
                "duration_minutes": max(5, len(questions) * 1),
                "passing_score": 70,
                "questions_count": len(questions),
                "is_ai_generated": True,
                "section_id": section_id,
                "status": "active",
            }).execute()
            
            for i, q in enumerate(questions, 1):
                correct = q.get("correct_option", "A").upper()
                options = [re.sub(r'^[A-Da-d]\)\s*', '', str(opt)).strip() for opt in q.get("options", [])]
                full_exp = f"{q.get('explanation', '')} (Principle: {q.get('principle', '')})"
                
                supabase.table("quiz_questions").upsert({
                    "id": str(uuid.uuid4()),
                    "quiz_id": quiz_id,
                    "question": q.get("question", ""),
                    "options": options,
                    "correct_option": correct if correct in ["A","B","C","D"] else "A",
                    "explanation": full_exp,
                    "order_number": i,
                    "difficulty": q.get("difficulty", "medium"),
                    "section_id": section_id,
                }).execute()
                
            supabase.table("curriculum_sections").update({"has_quiz": True, "quiz_id": quiz_id}).eq("id", section_id).execute()
            
            # Fetch the newly created quiz
            quiz_res = supabase.table("quizzes").select("*").eq("id", quiz_id).execute()

        quiz = quiz_res.data[0]
        quiz_id = quiz["id"]

        # Fetch questions (random subset via PostgreSQL random ordering)
        q_res = supabase.table("quiz_questions").select("*").eq(
            "quiz_id", quiz_id
        ).limit(count).execute()

        questions = q_res.data

        # Shuffle in Python for randomness
        import random
        random.shuffle(questions)
        questions = questions[:count]

        quiz["questions"] = questions
        quiz["requested_count"] = count
        return success_response(data=quiz)
    except Exception as e:
        return error_response(str(e))


# ─────────────────────────────────────────────────────────────────────────────
# TONE PREFERENCE
# ─────────────────────────────────────────────────────────────────────────────

@curriculum_bp.route('/preferences/tone', methods=['GET'])
@token_required
def get_tone_preference():
    """GET /api/curriculum/preferences/tone — Get user's saved tone."""
    user_id = request.user['sub']
    try:
        res = supabase.table("user_study_preferences").select(
            "tone_preference"
        ).eq("user_id", user_id).execute()
        tone = res.data[0]["tone_preference"] if res.data else "academic"
        return success_response(data={"tone": tone})
    except Exception as e:
        return error_response(str(e))


@curriculum_bp.route('/preferences/tone', methods=['PUT'])
@token_required
def update_tone_preference():
    """PUT /api/curriculum/preferences/tone — Save user's tone preference."""
    user_id = request.user['sub']
    data = request.get_json()
    tone = data.get("tone", "academic")

    if tone not in ["simple", "academic", "exam"]:
        return bad_request("Tone must be: simple, academic, or exam")

    try:
        supabase.table("user_study_preferences").upsert({
            "user_id": user_id,
            "tone_preference": tone,
        }, on_conflict="user_id").execute()
        return success_response(data={"tone": tone})
    except Exception as e:
        return error_response(str(e))
