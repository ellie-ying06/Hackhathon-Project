from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database.database import init_db
from modules.community import router as community_router

app = FastAPI(title="NeighbourHub API")

# Initialize the database
init_db()

# Register the Community API
app.include_router(community_router)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

# Serve CSS and JavaScript files
app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static",
)

# Serve the homepage
@app.get("/")
def home():
    return FileResponse(FRONTEND_DIR / "index.html")

# Serve the Marketplace page
@app.get("/market")
def marketplace():
    return FileResponse(FRONTEND_DIR / "pages" / "market.html")

# Serve the Help page
@app.get("/help")
def help_page():
    return FileResponse(FRONTEND_DIR / "pages" / "help.html")

# Backend health check
@app.get("/api/health")
def health_check():
    return {"status": "ok"}
