
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.database import get_connection
import sqlite3

router = APIRouter(prefix="/api", tags=["Community"])


# Resident Member model
class ResidentCreate(BaseModel):
    full_name: str
    email: str
    phone: str = ""
    address: str = ""


# Post Content model
class PostCreate(BaseModel):
    member_id: int
    title: str
    content: str
    category: str = "General"


# Register a new resident
@router.post("/members", status_code=201)
def register_member(member: ResidentCreate):
    conn = get_connection()

    try:
        cursor = conn.execute(
            """
            INSERT INTO resident_member
            (full_name, email, phone, address)
            VALUES (?, ?, ?, ?)
            """,
            (
                member.full_name,
                member.email,
                member.phone,
                member.address
            )
        )

        conn.commit()

        return {
            "message": "Resident registered successfully",
            "member_id": cursor.lastrowid
        }

    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    finally:
        conn.close()


# Create a new community post
@router.post("/posts", status_code=201)
def create_post(post: PostCreate):
    conn = get_connection()

    try:
        cursor = conn.execute(
            """
            INSERT INTO post_content
            (member_id, title, content, category)
            VALUES (?, ?, ?, ?)
            """,
            (
                post.member_id,
                post.title,
                post.content,
                post.category
            )
        )

        conn.commit()

        return {
            "message": "Post created successfully",
            "post_id": cursor.lastrowid
        }

    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Invalid member ID"
        )

    finally:
        conn.close()


# Get all community posts
@router.get("/posts")
def get_posts():
    conn = get_connection()

    try:
        rows = conn.execute(
            """
            SELECT
                p.post_id,
                p.member_id,
                p.title,
                p.content,
                p.category,
                datetime(p.created_at, '+8 hours') AS created_at, 
                r.full_name AS author

            FROM post_content p
            JOIN resident_member r
                ON p.member_id = r.member_id

            ORDER BY p.post_id DESC
            """
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        conn.close()

# Get one community post by ID
@router.get("/posts/{post_id}")
def get_post(post_id: int):
    conn = get_connection()

    try:
        row = conn.execute(
            """
            SELECT
                p.post_id,
                p.member_id,
                p.title,
                p.content,
                p.category,
                datetime(p.created_at, '+8 hours') AS created_at,
                r.full_name AS author
            FROM post_content p
            JOIN resident_member r
                ON p.member_id = r.member_id
            WHERE p.post_id = ?
            """,
            (post_id,)
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Post not found"
            )

        return dict(row)

    finally:
        conn.close()

# Delete a community post by ID
@router.delete("/posts/{post_id}")
def delete_post(post_id: int):
    conn = get_connection()

    try:
        cursor = conn.execute(
            """
            DELETE FROM post_content
            WHERE post_id = ?
            """,
            (post_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Post not found"
            )

        conn.commit()

        return {
            "message": "Post deleted successfully",
            "post_id": post_id
        }

    finally:
        conn.close()