import json
import os
import sys
import uuid
from dotenv import load_dotenv

# Ensure we have paths set up properly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, '.env'))

from db.connection import supabase

def clean_section_number(sec_num_str):
    try:
        # Some section numbers might be '1A' or similar, try to extract integer if possible,
        # but the DB schema expects an INTEGER for section_number.
        # If it fails, return the order index.
        import re
        match = re.search(r'\d+', str(sec_num_str))
        if match:
            return int(match.group())
        return 0
    except:
        return 0

def seed_laws():
    input_file = os.path.join(BASE_DIR, "data", "laws", "nigerian_laws_dataset.json")
    
    if not os.path.exists(input_file):
        print(f"Error: Could not find {input_file}")
        return
        
    print("Loading dataset...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print(f"Found {len(data)} Acts/Statutes to ingest.")
    
    # Track statistics
    inserted_acts = 0
    inserted_sections = 0
    skipped_acts = 0
    
    for item in data:
        title = item.get("act_title")
        if not title:
            continue
            
        print(f"Processing: {title}...")
        
        # 1. Check if Act already exists
        existing = supabase.table("library_resources").select("id").eq("title", title).execute()
        if existing.data:
            print(f"  [SKIPPED] '{title}' already exists in database.")
            skipped_acts += 1
            continue
            
        # 2. Insert into library_resources
        resource_id = str(uuid.uuid4())
        sections = item.get("sections", [])
        
        # We classify all of these as 'statutes' and type 'Act'
        try:
            supabase.table("library_resources").insert({
                "id": resource_id,
                "title": title,
                "category": "statutes",
                "type": item.get("document_type", "Act").capitalize(),
                "year": item.get("enactment_year"),
                "description": f"Category: {item.get('category', 'General')}\nCitation: {item.get('citation', '')}",
                "file_url": item.get("source_url", ""),
                "sections_count": len(sections)
            }).execute()
            inserted_acts += 1
        except Exception as e:
            print(f"  [ERROR] Failed to insert act {title}: {e}")
            continue
            
        # 3. Insert sections into library_resource_sections
        sections_to_insert = []
        for idx, sec in enumerate(sections):
            sec_num = clean_section_number(sec.get("section_number"))
            if sec_num == 0:
                sec_num = idx + 1 # Fallback to order
                
            sections_to_insert.append({
                "id": str(uuid.uuid4()),
                "resource_id": resource_id,
                "section_number": sec_num,
                "title": sec.get("title", f"Section {sec_num}"),
                "content": sec.get("content", "")
            })
            
        # Batch insert sections in chunks of 100
        chunk_size = 100
        for i in range(0, len(sections_to_insert), chunk_size):
            chunk = sections_to_insert[i:i + chunk_size]
            try:
                # We use upsert or ignore conflicts if a section number is duplicated
                supabase.table("library_resource_sections").upsert(chunk, on_conflict="resource_id, section_number").execute()
                inserted_sections += len(chunk)
            except Exception as e:
                print(f"  [WARNING] Failed to insert a batch of sections for {title}: {e}")
                # Sometimes unique constraint on (resource_id, section_number) fails if 
                # the dataset has two sections with the same number. Let's fix that by re-inserting sequentially.
                for j, s in enumerate(chunk):
                    try:
                        s["section_number"] = i + j + 1 # Force uniqueness
                        supabase.table("library_resource_sections").upsert(s, on_conflict="resource_id, section_number").execute()
                    except:
                        pass
        
        print(f"  [SUCCESS] Inserted {len(sections_to_insert)} sections.")
        
    print("\n" + "="*50)
    print("INGESTION COMPLETE")
    print("="*50)
    print(f"New Acts Inserted:    {inserted_acts}")
    print(f"Sections Inserted:    {inserted_sections}")
    print(f"Acts Skipped (Exist): {skipped_acts}")

if __name__ == "__main__":
    seed_laws()
