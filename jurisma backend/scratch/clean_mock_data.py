import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from db.connection import supabase

def main():
    print("Starting DB Cleanup for specific empty subjects...")
    
    # Target subjects to delete
    targets = ["Law of Contract", "Constitutional Law"]
    
    # Fetch all subjects
    res = supabase.table("curriculum_subjects").select("id, name, level").execute()
    
    deleted = 0
    if res.data:
        for subject in res.data:
            if subject['name'] in targets and subject['level'] == '200L':
                try:
                    print(f"Deleting empty subject: {subject['name']} ({subject['level']})")
                    supabase.table("curriculum_subjects").delete().eq("id", subject["id"]).execute()
                    deleted += 1
                except Exception as e:
                    print(f"Failed to delete {subject['name']}: {e}")
                    
    print(f"Cleanup complete. Deleted {deleted} empty subjects.")

if __name__ == "__main__":
    main()
