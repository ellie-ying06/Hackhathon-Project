from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database.database import init_db
from modules.community import router as community_router
from modules.marketplace import router as marketplace_router

app = FastAPI(title="NeighbourHub API")

# Initialize the database
init_db()

# Register the Community API
app.include_router(community_router)
app.include_router(marketplace_router)

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


# Serve the Marketplace product detail page
@app.get("/product")
def product_detail_page():
    return FileResponse(FRONTEND_DIR / "pages" / "product.html")

# @app.get("/product")
# def product_detail_page():
#     return FileResponse(FRONTEND_DIR / "pages" / "product.html")

@app.get("/edit-product")
def edit_product_page():
    return FileResponse(
        FRONTEND_DIR / "pages" / "edit-product.html"
    )

# Serve the Help page
@app.get("/help")
def help_page():
    return FileResponse(FRONTEND_DIR / "pages" / "help.html")

# Serve the Help page
@app.get("/post-detail")
def help_detail_page():
    return FileResponse(FRONTEND_DIR / "pages" / "post-detail.html")

# Backend health check
@app.get("/api/health")
def health_check():
    return {"status": "ok"}
