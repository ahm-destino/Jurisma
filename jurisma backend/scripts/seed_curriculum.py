"""
Jurisma Curriculum Seeder
Seeds structured_curriculum.json into Supabase tables.

Run: python scripts/seed_curriculum.py
"""

import json
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

input_filename = sys.argv[1] if len(sys.argv) > 1 else "structured_curriculum.json"
# Resolve from data/curriculum/ by default
BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # jurisma backend/
INPUT_FILE = os.path.join(BASE_DIR, "data", "curriculum", input_filename)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def seed():
    print("=" * 60)
    print("Jurisma Curriculum Seeder")
    print("=" * 60)

    if not os.path.exists(INPUT_FILE):
        print(f"ERROR: {INPUT_FILE} not found. Check data/curriculum/ folder.")
        sys.exit(1)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        curriculum = json.load(f)

    print(f"\nSeeding {len(curriculum)} subjects...")

    total_subjects = 0
    total_sections = 0
    total_slides = 0

    for subject in curriculum:
        subject_id = subject["id"]
        subject_name = subject["subject"]
        print(f"\nSubject: {subject_name} ({subject['level']})")

        # ── 1. Upsert Subject ───────────────────────────────────────────────
        try:
            supabase.table("curriculum_subjects").upsert({
                "id": subject_id,
                "name": subject_name,
                "slug": subject["slug"],
                "description": subject.get("description", ""),
                "level": subject["level"],
                "icon": subject.get("icon", "📜"),
                "color": subject.get("color", "from-jurisma-900 to-slate-800"),
                "total_sections": subject.get("total_sections", 0),
                "total_slides": subject.get("total_slides", 0),
            }).execute()
            total_subjects += 1
        except Exception as e:
            print(f"  ❌ Subject insert error: {e}")
            continue

        for section in subject.get("sections", []):
            section_id = section["id"]
            section_title = section["title"]
            slides = section.get("slides", [])

            # ── 2. Upsert Section ───────────────────────────────────────────
            try:
                supabase.table("curriculum_sections").upsert({
                    "id": section_id,
                    "subject_id": subject_id,
                    "section_number": section.get("section_number", 1),
                    "title": section_title,
                    "description": section.get("description", ""),
                    "total_slides": len(slides),
                    "has_quiz": False,
                }).execute()
                total_sections += 1
            except Exception as e:
                print(f"  ❌ Section insert error: {e}")
                continue

            # ── 3. Upsert Slides ────────────────────────────────────────────
            for slide in slides:
                content = slide.get("content", {})
                try:
                    supabase.table("curriculum_slides").upsert({
                        "id": slide["id"],
                        "section_id": section_id,
                        "slide_number": slide.get("slide_number", 1),
                        "title": slide.get("title", ""),
                        "content_simple": content.get("simple", ""),
                        "content_academic": content.get("academic", ""),
                        "content_exam": content.get("exam", ""),
                        "key_concepts": slide.get("key_concepts", []),
                        "case_references": slide.get("case_references", []),
                        "statute_references": slide.get("statute_references", []),
                        "estimated_read_minutes": slide.get("estimated_read_minutes", 3),
                    }).execute()
                    total_slides += 1
                except Exception as e:
                    print(f"    ERROR Slide insert error: {e}")

            print(f"  OK {section_title}: {len(slides)} slides seeded")

    print("\n" + "=" * 60)
    print(f"SEEDING COMPLETE!")
    print(f"   Subjects: {total_subjects}")
    print(f"   Sections: {total_sections}")
    print(f"   Slides:   {total_slides}")
    print("=" * 60)
    print("\nNext step: Run python scripts/quiz_generator.py")


if __name__ == "__main__":
    seed()
