
from fastapi import APIRouter, HTTPException, Query, Request
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
    title: str
    content: str
    category: str = "General"
    event_date: str | None = None

class ReplyCreate(BaseModel):
    post_id: int
    content: str


class EventRegistrationCreate(BaseModel):
    attendee_count: int = Field(ge=1)


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
            SELECT member_id, full_name, email, address
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
def create_post(post: PostCreate, request: Request):
    member_id = request.session.get("member_id")

    if not isinstance(member_id, int):
        raise HTTPException(
            status_code=401,
            detail="Please log in before creating a post."
        )

    title = post.title.strip()
    content = post.content.strip()

    if not title or not content:
        raise HTTPException(
            status_code=422,
            detail="Title and content cannot be empty."
        )

    if post.category == "Events":
        if not post.event_date:
            raise HTTPException(
                status_code=422,
                detail="An event date is required."
            )

        from datetime import date

        try:
            date.fromisoformat(post.event_date)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail="Please provide a valid event date."
            )

    conn = get_connection()

    try:
        cursor = conn.execute(
            """
            INSERT INTO post_content
                (member_id, title, content, category, event_date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                member_id,
                title,
                content,
                post.category,
                post.event_date if post.category == "Events" else None
            )
        )

        conn.commit()

        return {
            "message": "Post created successfully",
            "post_id": cursor.lastrowid
        }

    finally:
        conn.close()


# Get all community posts
@router.get("/posts")
def get_posts(
    request: Request,
    category: str | None = Query(default=None)
):
    member_id = request.session.get("member_id")
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
                p.event_date,
                datetime(p.created_at, '+8 hours') AS created_at,
                r.full_name AS author,
                (
                    SELECT COUNT(*)
                    FROM post_reply pr
                    WHERE pr.post_id = p.post_id
                ) AS reply_count,
                (
                    SELECT COUNT(*)
                    FROM post_kudos pk
                    WHERE pk.post_id = p.post_id
                ) AS kudos_count,
                EXISTS (
                    SELECT 1
                    FROM post_kudos pk
                    WHERE pk.post_id = p.post_id
                      AND pk.member_id = ?
                ) AS has_kudos,
                (
                    SELECT COALESCE(SUM(er.attendee_count), 0)
                    FROM event_registration er
                    WHERE er.post_id = p.post_id
                ) AS attendee_count,
                COALESCE((
                    SELECT 1
                    FROM event_registration er
                    WHERE er.post_id = p.post_id
                      AND er.member_id = ?
                ), 0) AS is_registered,
                COALESCE((
                    SELECT er.attendee_count
                    FROM event_registration er
                    WHERE er.post_id = p.post_id
                      AND er.member_id = ?
                ), 0) AS your_attendee_count
            FROM post_content p
            JOIN resident_member r
                ON p.member_id = r.member_id
            WHERE (? IS NULL OR p.category = ?)
            ORDER BY p.post_id DESC
            """,
            (member_id, member_id, member_id, category, category)
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        conn.close()

def set_event_registration(
    post_id: int,
    request: Request,
    attendee_count: int | None
):
    member_id = request.session.get("member_id")

    if not isinstance(member_id, int):
        raise HTTPException(
            status_code=401,
            detail="Please log in to register for an event."
        )

    conn = get_connection()

    try:
        post = conn.execute(
            "SELECT category FROM post_content WHERE post_id = ?",
            (post_id,)
        ).fetchone()

        if post is None:
            raise HTTPException(status_code=404, detail="Error: Post not found.")

        if post["category"] != "Events":
            raise HTTPException(
                status_code=400,
                detail="Registration is only available for events."
            )

        if attendee_count is not None:
            conn.execute(
                """
                INSERT INTO event_registration
                    (post_id, member_id, attendee_count)
                VALUES (?, ?, ?)
                ON CONFLICT(post_id, member_id)
                DO UPDATE SET attendee_count = excluded.attendee_count
                """,
                (post_id, member_id, attendee_count)
            )
        else:
            conn.execute(
                """
                DELETE FROM event_registration
                WHERE post_id = ? AND member_id = ?
                """,
                (post_id, member_id)
            )

        total_attendees = conn.execute(
            """
            SELECT COALESCE(SUM(attendee_count), 0)
            FROM event_registration
            WHERE post_id = ?
            """,
            (post_id,)
        ).fetchone()[0]
        conn.commit()

        return {
            "attendee_count": total_attendees,
            "is_registered": attendee_count is not None,
            "your_attendee_count": attendee_count or 0
        }

    except HTTPException:
        conn.rollback()
        raise

    finally:
        conn.close()


@router.post("/posts/{post_id}/registration")
def register_for_event(
    post_id: int,
    registration: EventRegistrationCreate,
    request: Request
):
    return set_event_registration(
        post_id,
        request,
        registration.attendee_count
    )


@router.delete("/posts/{post_id}/registration")
def cancel_event_registration(post_id: int, request: Request):
    return set_event_registration(post_id, request, None)


@router.post("/posts/{post_id}/kudos")
def toggle_post_kudos(post_id: int, request: Request):
    member_id = request.session.get("member_id")

    if not isinstance(member_id, int):
        raise HTTPException(
            status_code=401,
            detail="Only logged-in users can give kudos."
        )

    conn = get_connection()

    try:
        conn.execute("BEGIN IMMEDIATE")

        post = conn.execute(
            "SELECT category FROM post_content WHERE post_id = ?",
            (post_id,)
        ).fetchone()

        if post is None:
            raise HTTPException(status_code=404, detail="Error: Post not found.")

        if post["category"] != "Community":
            raise HTTPException(
                status_code=400,
                detail="Kudos are only available on community posts."
            )

        existing_kudos = conn.execute(
            """
            SELECT 1
            FROM post_kudos
            WHERE post_id = ? AND member_id = ?
            """,
            (post_id, member_id)
        ).fetchone()

        if existing_kudos:
            conn.execute(
                "DELETE FROM post_kudos WHERE post_id = ? AND member_id = ?",
                (post_id, member_id)
            )
            has_kudos = False
        else:
            conn.execute(
                "INSERT INTO post_kudos (post_id, member_id) VALUES (?, ?)",
                (post_id, member_id)
            )
            has_kudos = True

        kudos_count = conn.execute(
            "SELECT COUNT(*) FROM post_kudos WHERE post_id = ?",
            (post_id,)
        ).fetchone()[0]

        conn.commit()
        return {"kudos_count": kudos_count, "has_kudos": has_kudos}

    except HTTPException:
        conn.rollback()
        raise

    finally:
        conn.close()

# Get one community post by ID
@router.get("/posts/{post_id}")
def get_post(post_id: int, request: Request):
    member_id = request.session.get("member_id")
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
                p.event_date,
                datetime(p.created_at, '+8 hours') AS created_at,
                r.full_name AS author,
                (
                    SELECT COALESCE(SUM(er.attendee_count), 0)
                    FROM event_registration er
                    WHERE er.post_id = p.post_id
                ) AS attendee_count,
                COALESCE((
                    SELECT 1
                    FROM event_registration er
                    WHERE er.post_id = p.post_id
                      AND er.member_id = ?
                ), 0) AS is_registered,
                COALESCE((
                    SELECT er.attendee_count
                    FROM event_registration er
                    WHERE er.post_id = p.post_id
                      AND er.member_id = ?
                ), 0) AS your_attendee_count,
                (
                    SELECT COUNT(*)
                    FROM post_kudos pk
                    WHERE pk.post_id = p.post_id
                ) AS kudos_count,
                EXISTS (
                    SELECT 1
                    FROM post_kudos pk
                    WHERE pk.post_id = p.post_id
                    AND pk.member_id = ?
                ) AS has_kudos
            FROM post_content p
            JOIN resident_member r
                ON p.member_id = r.member_id
            WHERE p.post_id = ?
            """,
            (member_id, member_id, member_id, post_id)
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
def create_reply(reply: ReplyCreate, request: Request):
    member_id = request.session.get("member_id")

    if not isinstance(member_id, int):
        raise HTTPException(
            status_code=401,
            detail="Please log in before replying."
        )

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

        member = conn.execute(
            "SELECT member_id FROM resident_member WHERE member_id = ?",
            (member_id,)
        ).fetchone()

        if member is None:
            request.session.clear()
            raise HTTPException(
                status_code=401,
                detail="Session is no longer valid."
            )

        cursor = conn.execute(
            """
            INSERT INTO post_reply (post_id, member_id, content)
            VALUES (?, ?, ?)
            """,
            (reply.post_id, member_id, content)
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
