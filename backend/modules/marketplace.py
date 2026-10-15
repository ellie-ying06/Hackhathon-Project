from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.database import get_connection
import sqlite3
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile, File

router = APIRouter(prefix="/api", tags=["Marketplace"])


# =========================
# Product Model
# =========================

class ProductCreate(BaseModel):
    member_id: int
    name: str
    price: float
    category: str
    condition: str
    location: str
    description: str = ""
    image: str = ""

class ProductUpdate(BaseModel):
    name: str
    price: float
    category: str
    condition: str
    location: str
    description: str = ""
    image: str = ""


class ProductPatch(BaseModel):
    name: str | None = None
    price: float | None = None
    category: str | None = None
    condition: str | None = None
    location: str | None = None
    description: str | None = None
    image: str | None = None



# =========================
# Create Product
# =========================

@router.post("/products", status_code=201)
def create_product(product: ProductCreate):

    conn = get_connection()

    try:
        cursor = conn.execute(
            """
            INSERT INTO marketplace_product
            (
                member_id,
                name,
                price,
                category,
                condition,
                location,
                description,
                image
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                product.member_id,
                product.name,
                product.price,
                product.category,
                product.condition,
                product.location,
                product.description,
                product.image
            )
        )

        conn.commit()

        return {
            "message": "Product created successfully",
            "product_id": cursor.lastrowid
        }

    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Invalid member ID"
        )

    finally:
        conn.close()


# =========================
# Get All Products
# =========================

@router.get("/products")
def get_products():

    conn = get_connection()

    try:
        rows = conn.execute(
            """
            SELECT
                p.product_id,
                p.member_id,
                p.name,
                p.price,
                p.category,
                p.condition,
                p.location,
                p.description,
                p.image,
                datetime(p.created_at, '+8 hours') AS created_at,
                r.full_name AS seller

            FROM marketplace_product p

            JOIN resident_member r
                ON p.member_id = r.member_id

            ORDER BY p.product_id DESC
            """
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        conn.close()



# =========================
# Get One Product by ID
# =========================

@router.get("/products/{product_id}")
def get_product(product_id: int):
    conn = get_connection()

    try:
        row = conn.execute(
            """
            SELECT
                p.product_id,
                p.member_id,
                p.name,
                p.price,
                p.category,
                p.condition,
                p.location,
                p.description,
                p.image,
                datetime(p.created_at, '+8 hours') AS created_at,
                r.full_name AS seller,
                r.email AS seller_email,
                r.phone AS seller_phone,
                r.address AS seller_address
            FROM marketplace_product p
            JOIN resident_member r
                ON p.member_id = r.member_id
            WHERE p.product_id = ?
            """,
            (product_id,)
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        return dict(row)

    finally:
        conn.close()

@router.delete("/products/{product_id}")
def delete_product(product_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check whether the product exists
        cursor.execute(
            "SELECT product_id FROM marketplace_product WHERE product_id = ?",
            (product_id,)
        )
        product = cursor.fetchone()

        if product is None:
            raise HTTPException(
                status_code=404,
                detail="Product not found."
            )

        # Delete the product
        cursor.execute(
            "DELETE FROM marketplace_product WHERE product_id = ?",
            (product_id,)
        )

        conn.commit()

        return {
            "message": "Product deleted successfully",
            "product_id": product_id
        }

    finally:
        conn.close()


# Store uploaded product images in the frontend's static directory
PROJECT_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = PROJECT_ROOT / "frontend" / "uploads" / "products"

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@router.post("/upload-image")
async def upload_product_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, and WebP images are allowed.",
        )

    try:
        image_data = await file.read(5 * 1024 * 1024 + 1)

        if not image_data:
            raise HTTPException(
                status_code=400,
                detail="The uploaded image is empty.",
            )

        if len(image_data) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="Image size must not exceed 5 MB.",
            )

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        extension = ALLOWED_IMAGE_TYPES[file.content_type]
        filename = f"{uuid4().hex}{extension}"
        image_path = UPLOAD_DIR / filename

        image_path.write_bytes(image_data)

        return {
            "image_url": f"/static/uploads/products/{filename}"
        }

    finally:
        await file.close()

@router.put("/products/{product_id}")
def update_product(product_id: int, product: ProductUpdate):
    conn = get_connection()

    try:
        existing = conn.execute(
            """
            SELECT product_id
            FROM marketplace_product
            WHERE product_id = ?
            """,
            (product_id,)
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        conn.execute(
            """
            UPDATE marketplace_product
            SET name = ?,
                price = ?,
                category = ?,
                condition = ?,
                location = ?,
                description = ?,
                image = ?
            WHERE product_id = ?
            """,
            (
                product.name,
                product.price,
                product.category,
                product.condition,
                product.location,
                product.description,
                product.image,
                product_id
            )
        )

        conn.commit()

        return {
            "message": "Product updated successfully",
            "product_id": product_id
        }

    finally:
        conn.close()


@router.delete("/products/{product_id}")
def delete_product(product_id: int):
    conn = get_connection()

    try:
        existing = conn.execute(
            """
            SELECT product_id
            FROM marketplace_product
            WHERE product_id = ?
            """,
            (product_id,)
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        conn.execute(
            """
            DELETE FROM marketplace_product
            WHERE product_id = ?
            """,
            (product_id,)
        )

        conn.commit()

        return {
            "message": "Product deleted successfully",
            "product_id": product_id
        }

    finally:
        conn.close()

@router.patch("/products/{product_id}")
def patch_product(product_id: int, product: ProductPatch):
    updates = product.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No fields provided to update"
        )

    if "price" in updates and (
        updates["price"] is None or updates["price"] < 0
    ):
        raise HTTPException(
            status_code=400,
            detail="Price must be zero or greater"
        )

    if any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=400,
            detail="Fields cannot be set to null"
        )

    conn = get_connection()

    try:
        existing = conn.execute(
            """
            SELECT product_id
            FROM marketplace_product
            WHERE product_id = ?
            """,
            (product_id,)
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        allowed_fields = {
            "name",
            "price",
            "category",
            "condition",
            "location",
            "description",
            "image"
        }

        fields = {
            key: value
            for key, value in updates.items()
            if key in allowed_fields
        }

        assignments = ", ".join(
            f"{field} = ?" for field in fields
        )

        values = list(fields.values()) + [product_id]

        conn.execute(
            f"""
            UPDATE marketplace_product
            SET {assignments}
            WHERE product_id = ?
            """,
            values
        )

        conn.commit()

        return {
            "message": "Product updated successfully",
            "product_id": product_id,
            "updated_fields": list(fields.keys())
        }

    finally:
        conn.close()
