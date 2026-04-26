from flask import Blueprint, request
from db.connection import supabase
from utils.responses import success_response, bad_request, not_found, error_response
from utils.auth_helpers import token_required
import uuid
import json
from google import genai
from config import config
import logging

logger = logging.getLogger(__name__)

ai_bp = Blueprint('ai', __name__)

# Configure Gemini (new google-genai SDK - Python 3.14 compatible)
GEMINI_MODEL = 'gemini-2.0-flash'
if config.GEMINI_API_KEY:
    try:
        genai_client = genai.Client(api_key=config.GEMINI_API_KEY)
    except Exception as e:
        logger.warning(f"Gemini client init failed: {e}")
        genai_client = None
else:
    genai_client = None

def _generate(prompt: str) -> str | None:
    """Helper: call Gemini and return text, or None on failure."""
    if not genai_client:
        return None
    try:
        response = genai_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        return response.text
    except Exception as e:
        logger.error(f"Gemini generation error: {e}")
        return None

@ai_bp.route('/chat', methods=['POST'])
@token_required
def chat():
    user_id = request.user['sub']
    data = request.get_json()
    conv_id = data.get('conversation_id')
    message = data.get('message')
    
    if not message:
        return bad_request("Message is required")
        
    try:
        if not conv_id:
            conv_id = str(uuid.uuid4())
            supabase.table("ai_conversations").insert({
                "id": conv_id,
                "user_id": user_id,
                "title": message[:50] + "..."
            }).execute()
        
        # Store user message
        user_msg_id = str(uuid.uuid4())
        supabase.table("ai_messages").insert({
            "id": user_msg_id,
            "conversation_id": conv_id,
            "role": 'user',
            "content": message
        }).execute()
        
        # Generate bot response
        bot_content = "I am a simulated legal assistant. (Gemini API not configured)"
        try:
            text = _generate(message)
            if text:
                bot_content = text
        except Exception as e:
            bot_content = f"Error generating response: {str(e)}"
                
        bot_msg_id = str(uuid.uuid4())
        supabase.table("ai_messages").insert({
            "id": bot_msg_id,
            "conversation_id": conv_id,
            "role": 'assistant',
            "content": bot_content
        }).execute()
        
        # Update conversation timestamp
        supabase.table("ai_conversations").update({
            "updated_at": "now()"
        }).eq("id", conv_id).execute()
        
        return success_response(data={"conversation_id": conv_id, "response": bot_content})
    except Exception as e:
        return error_response(str(e))

@ai_bp.route('/conversations', methods=['GET'])
@token_required
def get_conversations():
    user_id = request.user['sub']
    try:
        res = supabase.table("ai_conversations").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()
        return success_response(data=res.data)
    except Exception as e:
        return error_response(str(e))

@ai_bp.route('/conversations/<conv_id>', methods=['GET'])
@token_required
def get_messages(conv_id):
    try:
        res = supabase.table("ai_messages").select("*").eq("conversation_id", conv_id).order("timestamp", desc=False).execute()
        return success_response(data=res.data)
    except Exception as e:
        return error_response(str(e))

@ai_bp.route('/analyze-document', methods=['POST'])
@token_required
def analyze_document():
    user_id = request.user['sub']
    data = request.get_json()
    doc_url = data.get('document_url')
    analysis_type = data.get('analysis_type', 'summary')
    
    if not doc_url:
        return bad_request("Document URL is required")
        
    try:
        # Simulate analysis
        analysis_id = str(uuid.uuid4())
        summary = "This is a simulated AI document analysis."
        risks = [{"point": "Simulated risk", "severity": "low"}]
        
        supabase.table("document_analyses").insert({
            "id": analysis_id,
            "user_id": user_id,
            "document_url": doc_url,
            "analysis_type": analysis_type,
            "summary": summary,
            "risks": risks
        }).execute()
        
        return success_response(data={"analysis_id": analysis_id, "summary": summary, "risks": risks})
    except Exception as e:
        return error_response(str(e))

# System Instructions and Prompts (ported from frontend)
SYSTEM_INSTRUCTION = """
You are Jurisma AI, an advanced legal assistant.
Style: Professional, precise, authoritative yet accessible.
"""

COUNSEL_CONNECT_FILTER_PROMPT = """
You are an AI filter for a legal mentorship platform. Analyze this question and determine if it should be approved or rejected.

REJECT if the question:
- Is under 50 characters or too vague
- Seeks case-specific legal advice (names, case numbers, specific client situations)
- Requests document review
- Contains personal identifying information
- Is outside the stated practice area
- Is rude, unprofessional, or inappropriate
- Could create attorney-client relationship issues

APPROVE if the question:
- Seeks career guidance or professional development advice
- Asks about methodology or approach
- Presents hypothetical scenarios appropriately
- Asks about legal developments or trends
- Is well-structured and specific

Respond ONLY in JSON format:
{
  "approved": true/false,
  "reason": "Brief explanation",
  "suggestions": "How to improve question if rejected"
}
"""

IMPROVEMENT_PROMPT = """
You are helping a junior lawyer improve their mentorship question. 
It should be specific, methodological, and professional.
Respond ONLY in JSON format:
{
  "suggestions": ["suggestion 1", "suggestion 2"],
  "improved_version": "A suggested rewrite"
}
"""

@ai_bp.route('/generate', methods=['POST'])
@token_required
def ai_generate():
    data = request.get_json()
    prompt = data.get('prompt')
    if not prompt:
        return bad_request("Prompt is required")
    try:
        text = _generate(SYSTEM_INSTRUCTION + "\n\n" + prompt)
        if text:
            return success_response(data={"text": text})
        return success_response(data={"text": "AI generation is currently in simulation mode."})
    except Exception as e:
        logger.exception(e)
        return error_response("AI Generation Error")

@ai_bp.route('/vet-question', methods=['POST'])
@token_required
def vet_question():
    data = request.get_json()
    question = data.get('question', '')
    practice_area = data.get('practiceArea', '')
    try:
        full_prompt = f"{COUNSEL_CONNECT_FILTER_PROMPT}\n\nPractice Area: {practice_area}\nQuestion: \"{question}\""
        text = _generate(full_prompt)
        if text:
            clean = text.strip().removeprefix('```json').removesuffix('```').strip()
            return success_response(data=json.loads(clean))
        return success_response(data={"approved": False, "reason": "AI Service unavailable for vetting.", "suggestions": ""})
    except Exception as e:
        logger.exception(e)
        return success_response(data={"approved": False, "reason": "AI Error. Please try again later.", "suggestions": ""})

@ai_bp.route('/improve-question', methods=['POST'])
@token_required
def improve_question():
    data = request.get_json()
    question = data.get('question', '')
    practice_area = data.get('practiceArea', '')
    try:
        full_prompt = f"{IMPROVEMENT_PROMPT}\n\nPractice Area: {practice_area}\nQuestion: \"{question}\""
        text = _generate(full_prompt)
        if text:
            clean = text.strip().removeprefix('```json').removesuffix('```').strip()
            return success_response(data=json.loads(clean))
        return success_response(data={"suggestions": ["Ensure your question is specific."], "improved_version": question})
    except Exception as e:
        logger.exception(e)
        return success_response(data={"suggestions": ["Ensure your question is specific."], "improved_version": question})
