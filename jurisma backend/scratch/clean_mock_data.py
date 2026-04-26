import os
import sys
from dotenv import load_dotenv

# Ensure we're in the right directory and have config access
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from db.connection import supabase

def main():
    print("Starting DB Cleanup for empty quizzes...")
    
    # Fetch all quizzes
    res = supabase.table("quizzes").select("id, title, questions_count").execute()
    
    if not res.data:
        print("No quizzes found.")
        return
        
    deleted_count = 0
    for quiz in res.data:
        # Check if questions_count is 0 or None
        count = quiz.get("questions_count", 0)
        if count == 0 or count is None:
            try:
                # Delete from quizzes
                print(f"Deleting empty quiz: {quiz['title']}")
                supabase.table("quizzes").delete().eq("id", quiz["id"]).execute()
                deleted_count += 1
            except Exception as e:
                print(f"Failed to delete {quiz['title']}: {e}")
                
    print(f"Cleanup complete. Deleted {deleted_count} empty quizzes.")
    
    print("\nStarting DB Cleanup for empty curriculum sections...")
    res = supabase.table("curriculum_sections").select("id, title, has_quiz").eq("has_quiz", False).execute()
    
    deleted_sections = 0
    if res.data:
        for section in res.data:
            print(f"Deleting empty mock section: {section['title']}")
            supabase.table("curriculum_sections").delete().eq("id", section["id"]).execute()
            deleted_sections += 1
            
    print(f"Cleanup complete. Deleted {deleted_sections} empty curriculum sections.")

if __name__ == "__main__":
    main()
