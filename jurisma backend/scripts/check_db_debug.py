import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Ensure we have paths set up properly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

def check_db():
    print("Checking library_resources...")
    res = supabase.table("library_resources").select("id, title").limit(5).execute()
    print("Resources found:", len(res.data))
    for r in res.data:
        print(f" - {r['title']} (ID: {r['id']})")
        
    if res.data:
        res_id = res.data[0]['id']
        print(f"\nChecking sections for resource {res_id}...")
        sec_res = supabase.table("library_resource_sections").select("id").eq("resource_id", res_id).limit(5).execute()
        print("Sections found:", len(sec_res.data))

if __name__ == "__main__":
    check_db()
