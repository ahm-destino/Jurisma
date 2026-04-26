import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Server
    PORT = int(os.getenv('PORT', 5000))
    DEBUG = True # os.getenv('DEBUG', 'True') == 'True'
    ENV = os.getenv('ENV', 'development')
    SECRET_KEY = os.getenv('JWT_SECRET') or os.getenv('JWT_SECRET_KEY') or 'dev-secret-key'

    # Database / Supabase
    DB_HOST = os.getenv('DB_HOST')
    DB_NAME = os.getenv('DB_NAME')
    DB_USER = os.getenv('DB_USER')
    DB_PASS = os.getenv('DB_PASS')
    DB_PORT = os.getenv('DB_PORT', 5432)
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
    if DATABASE_URL:
        # Some drivers prefer postgres:// over postgresql://
        if DATABASE_URL.startswith('postgresql://'):
            DATABASE_URL = 'postgres://' + DATABASE_URL[13:]
        
        # Ensure sslmode=require for Supabase/Cloud DBs
        if 'sslmode' not in DATABASE_URL:
            separator = '&' if '?' in DATABASE_URL else '?'
            DATABASE_URL += f'{separator}sslmode=require'

    # JWT
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 604800))

    # Gemini
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

    # AWS
    AWS_S3_BUCKET = os.getenv('AWS_S3_BUCKET')
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')

config = Config()
