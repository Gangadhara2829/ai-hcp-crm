import sys
import os

# Add backend directory to Python path so app imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.main import app
from mangum import Mangum

# Vercel uses AWS Lambda-style handler
handler = Mangum(app, lifespan="off")
