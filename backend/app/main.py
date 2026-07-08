import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import PROJECT_NAME, API_PREFIX
from app.api.endpoints import router as api_router
from app.db.session import engine, Base
from app.db.seed import seed_db

# Create FastAPI app instance
app = FastAPI(
    title=PROJECT_NAME,
    description="AI-powered Healthcare Professional CRM API for Pharmaceutical Reps",
    version="1.0.0"
)

# CORS Configuration for Frontend Access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=API_PREFIX)

@app.on_event("startup")
def startup_event():
    print("Application starting up...")
    try:
        # Create database tables if they do not exist
        print("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        # Attempt to seed DB with default mock values
        seed_db()
    except Exception as e:
        print(f"Error during startup database initialization: {e}")

@app.get("/", tags=["Health Check"])
def read_root():
    return {
        "status": "healthy",
        "app_name": PROJECT_NAME,
        "api_docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
