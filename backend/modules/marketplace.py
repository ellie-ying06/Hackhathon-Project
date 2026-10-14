from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.database import get_connection
import sqlite3

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