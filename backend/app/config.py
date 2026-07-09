import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Application Settings
PROJECT_NAME = "AI First CRM – Healthcare Professional Module"
API_PREFIX = "/api"

# Database URL: default to local SQLite if postgres URL is not provided
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if os.getenv("VERCEL"):
        DATABASE_URL = "sqlite:////tmp/healthcare_crm.db"
    else:
        DATABASE_URL = "sqlite:///./healthcare_crm.db"

# AI Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "gemma2-9b-it"

# Optional JWT secret for simulated authentication
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-for-healthcare-crm")
