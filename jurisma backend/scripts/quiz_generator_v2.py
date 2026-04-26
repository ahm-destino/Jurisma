"""/
Jurisma Quiz Generator V2 — High-Performance MCQ Creation
Generates multiple-choice questions for each curriculum section.

Features:
- Multi-Key Rotation (OpenAI)
- Multi-Model Rotation (Gemini)
- Fallback System
"""

import json
import os
import sys
import time
import uuid
import re
from openai import OpenAI
from google import genai
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# File Paths
SCRIPTS_DIR = os.path.dirname(__file__)
BASE_DIR = os.path.dirname(SCRIPTS_DIR)  # jurisma backend/
input_filename = sys.argv[1] if len(sys.argv) > 1 else "structured_curriculum.json"
INPUT_FILE = os.path.join(BASE_DIR, "data", "curriculum", input_filename)
KEYS_FILE = os.path.join(SCRIPTS_DIR, "openai_keys.txt")

# Load OpenAI Keys
OPENAI_KEYS = []
if os.path.exists(KEYS_FILE):
    with open(KEYS_FILE, "r") as f:
        OPENAI_KEYS = [line.strip() for line in f if line.strip().startswith("sk-")]

# Gemini Setup
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai_client = None
if GEMINI_API_KEY:
    genai_client = genai.Client(api_key=GEMINI_API_KEY)

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Gemini Models for robust rotation
GEMINI_MODELS = [
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-pro-exp-02-05",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-thinking-exp-01-21",
    "gemini-1.5-pro"
]

QUIZ_PROMPT = """You are an expert Nigerian law examiner creating multiple-choice questions for LLB students.

Based on this content from "{section_title}" in "{subject_name}" ({level}):

---
{slide_content}
---

Generate EXACTLY 20 high-quality MCQ questions. Return ONLY a valid JSON array (no markdown, no code blocks):

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

def call_openai(prompt: str, key_index: int) -> tuple[str | None, int]:
    if not OPENAI_KEYS: return None, 0
    idx = key_index % len(OPENAI_KEYS)
    for _ in range(len(OPENAI_KEYS)):
        current_key = OPENAI_KEYS[idx]
        client = OpenAI(api_key=current_key)
        try:
            print(f"      [OpenAI] Using Key #{idx+1}")
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            return response.choices[0].message.content, idx
        except Exception:
            idx = (idx + 1) % len(OPENAI_KEYS)
            continue
    return None, idx

def call_gemini(prompt: str) -> str | None:
    if not genai_client: return None
    for model_name in GEMINI_MODELS:
        try:
            print(f"      [Gemini] Trying {model_name}...")
            response = genai_client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            print(f"      [OK] Success with {model_name}")
            return response.text
        except Exception as e:
            err_str = str(e)
            print(f"      Error ({model_name}): {err_str[:200]}")
            if "429" in err_str or "quota" in err_str.lower() or "503" in err_str:
                time.sleep(10) # Cooldown before trying next model
            continue
    return None

def extract_json(text: str) -> list | None:
    if not text: return None
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    try:
        return json.loads(text.strip())
    except:
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            try: return json.loads(match.group())
            except: pass
    return None

def main():
    print("Starting Quiz Generation V2", flush=True)
    
    if not os.path.exists(INPUT_FILE):
        print(f"Input file {INPUT_FILE} not found", flush=True)
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Loaded {len(data)} subjects", flush=True)

    key_index = 0
    total_q = 0

    for subject_data in data:
        sub_name = subject_data.get("subject", "Unknown Subject").rstrip(">")
        level = subject_data.get("level", "N/A")
        print(f"\nSubject: {sub_name}", flush=True)

        sections = subject_data.get("sections", [])
        print(f"  Found {len(sections)} sections", flush=True)

        for section in sections:
            sec_title = section.get("title", "Untitled Section").rstrip(">")
            print(f"    Section: {sec_title}", flush=True)

            # Check if quiz already exists
            existing = supabase.table("quizzes").select("id").eq("section_id", section["id"]).execute()
            if existing.data:
                print("      Quiz already exists. Skipping.", flush=True)
                continue

            # Combine slide content for context
            context = ""
            for s in section.get("slides", []):
                context += s["content"]["academic"] + "\n"
            
            if not context.strip():
                print("      No content in slides. Skipping.", flush=True)
                continue

            print(f"      Generating 20 questions...", flush=True)
            prompt = QUIZ_PROMPT.format(
                section_title=sec_title,
                subject_name=sub_name,
                level=level,
                slide_content=context[:6000]
            )

            # Try OpenAI, then Gemini
            raw_res, key_index = call_openai(prompt, key_index)
            if not raw_res:
                raw_res = call_gemini(prompt)
            
            if not raw_res:
                print("      Failed to get response from AI.", flush=True)
                continue

            questions = extract_json(raw_res)
            if not questions:
                print("      Failed to parse JSON from AI.", flush=True)
                continue

            # Save Quiz Header
            quiz_id = str(uuid.uuid4())
            try:
                supabase.table("quizzes").insert({
                    "id": quiz_id,
                    "title": f"{sub_name}: {sec_title}",
                    "subject": sub_name,
                    "difficulty": "medium",
                    "duration_minutes": 15,
                    "passing_score": 70,
                    "questions_count": len(questions),
                    "section_id": section["id"],
                    "status": "active"
                }).execute()

                # Save Questions
                for i, q in enumerate(questions, 1):
                    options = [re.sub(r'^[A-D]\)\s*', '', str(opt)).strip() for opt in q.get("options", [])]
                    supabase.table("quiz_questions").insert({
                        "id": str(uuid.uuid4()),
                        "quiz_id": quiz_id,
                        "question": q.get("question", ""),
                        "options": options,
                        "correct_option": q.get("correct_option", "A").upper(),
                        "explanation": f"{q.get('explanation', '')} (Principle: {q.get('principle', '')})",
                        "order_number": i,
                        "difficulty": q.get("difficulty", "medium"),
                        "section_id": section["id"]
                    }).execute()
                
                # Update Section
                supabase.table("curriculum_sections").update({"has_quiz": True, "quiz_id": quiz_id}).eq("id", section["id"]).execute()
                print(f"      Seeded {len(questions)} questions.", flush=True)
                total_q += len(questions)
            except Exception as e:
                print(f"      DB Error: {e}", flush=True)

    print(f"\nDONE! Generated {total_q} questions.", flush=True)

if __name__ == "__main__":
    main()
