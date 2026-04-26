from supabase import create_client, Client
from config import config
import logging

logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

def get_supabase():
    return supabase

# Helper to maintain a similar interface if possible, 
# but SDK uses builder pattern, so this is just for simple cases or RPC.
def execute_rpc(function_name, params=None):
    try:
        response = supabase.rpc(function_name, params or {}).execute()
        return response.data
    except Exception as e:
        logger.error(f"Supabase RPC error: {e}")
        raise e
