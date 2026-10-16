
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from pwdlib import PasswordHash
from database.database import get_connection
import sqlite3
password_hasher = PasswordHash.recommended()
router = APIRouter(prefix="/api", tags=["Community"])


# Resident Member model
class ResidentCreate(BaseModel):
    full_name: str
    email: str
    phone: str = ""
    address: str = ""
    password: str = Field(min_length=8)

class LoginRequest(BaseModel):
    email: str
    password: str

# Post Content model
class PostCreate(BaseModel):
    member_id: int
    title: str
    content: str
    category: str = "General"

class ReplyCreate(BaseModel):
    post_id: int
    member_id: int
    content: str


# Register a new resident

@router.post("/members", status_code=201)
def register_member(member: ResidentCreate):
    conn = get_connection()

    try:
        # Hash the password before saving it
        hashed_password = password_hasher.hash(member.password)

        cursor = conn.execute("""
            INSERT INTO resident_member
            (full_name, email, phone, address, password_hash)
            VALUES (?, ?, ?, ?, ?)
        """, (
            member.full_name,
            member.email,
            member.phone,
            member.address,
            hashed_password
        ))

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


@router.post("/login")
def login_member(login_data: LoginRequest, request: Request):
    conn = get_connection()

    try:
        member = conn.execute(
            """
            SELECT member_id, full_name, email, password_hash
            FROM resident_member
            WHERE email = ?
            """,
            (login_data.email.strip(),)
        ).fetchone()

        if member is None or not member["password_hash"]:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not password_hasher.verify(
            login_data.password,
            member["password_hash"]
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Create the authenticated session
        request.session.clear()
        request.session["member_id"] = member["member_id"]

        return {
            "message": "Login successful",
            "member_id": member["member_id"],
            "full_name": member["full_name"],
            "email": member["email"]
        }

    finally:
        conn.close()


@router.get("/me")
def get_current_member(request: Request):
    member_id = request.session.get("member_id")

    if member_id is None:
        raise HTTPException(
            status_code=401,
            detail="Not logged in"
        )

    conn = get_connection()

    try:
        member = conn.execute(
            """
            SELECT member_id, full_name, email
            FROM resident_member
            WHERE member_id = ?
            """,
            (member_id,)
        ).fetchone()

        if member is None:
            request.session.clear()
            raise HTTPException(
                status_code=401,
                detail="Session is no longer valid"
            )

        return dict(member)

    finally:
        conn.close()


@router.post("/logout")
def logout_member(request: Request):
    request.session.clear()
    return {"message": "Logged out successfully"}

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
                r.full_name AS author,
                (
                    SELECT COUNT(*)
                    FROM post_reply pr
                    WHERE pr.post_id = p.post_id
                ) AS reply_count
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


@router.post("/replies", status_code=201)
def create_reply(reply: ReplyCreate):
    content = reply.content.strip()

    if not content:
        raise HTTPException(
            status_code=422,
            detail="Reply content cannot be empty"
        )

    conn = get_connection()

    try:
        # Check that the post exists
        post = conn.execute(
            "SELECT post_id FROM post_content WHERE post_id = ?",
            (reply.post_id,)
        ).fetchone()

        if post is None:
            raise HTTPException(
                status_code=404,
                detail="Post not found"
            )

        # Check that the resident exists
        member = conn.execute(
            "SELECT member_id FROM resident_member WHERE member_id = ?",
            (reply.member_id,)
        ).fetchone()

        if member is None:
            raise HTTPException(
                status_code=404,
                detail="Resident not found"
            )

        cursor = conn.execute(
            """
            INSERT INTO post_reply (post_id, member_id, content)
            VALUES (?, ?, ?)
            """,
            (reply.post_id, reply.member_id, content)
        )

        conn.commit()

        return {
            "message": "Reply created successfully",
            "reply_id": cursor.lastrowid
        }

    finally:
        conn.close()


@router.get("/posts/{post_id}/replies")
def get_replies(post_id: int):
    conn = get_connection()

    try:
        # Check that the post exists
        post = conn.execute(
            "SELECT post_id FROM post_content WHERE post_id = ?",
            (post_id,)
        ).fetchone()

        if post is None:
            raise HTTPException(
                status_code=404,
                detail="Post not found"
            )

        rows = conn.execute(
            """
            SELECT
                r.reply_id,
                r.post_id,
                r.member_id,
                r.content,
                datetime(r.created_at, '+8 hours') AS created_at,
                m.full_name AS author
            FROM post_reply r
            JOIN resident_member m
                ON r.member_id = m.member_id
            WHERE r.post_id = ?
            ORDER BY r.reply_id ASC
            """,
            (post_id,)
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        conn.close()
