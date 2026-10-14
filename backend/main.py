from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database.database import init_db # connect database 
from modules.community import router as community_router  #register the API

app = FastAPI(title="NeighbourHub API")

init_db()

app.include_router(community_router)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

# Serve CSS and JavaScript files
app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static",
)

# Serve the homepage from frontend/pages/index.html
@app.get("/")
def home():
    return FileResponse(FRONTEND_DIR / "index.html")


# Backend health check
@app.get("/api/health")
def health_check():
    return {"status": "ok"}