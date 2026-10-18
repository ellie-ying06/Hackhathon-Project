
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "community.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_connection()
    # Resident Member: Stores resident registration information.
    # Post Content: Stores community forum posts and links them to residents through member_id.
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS resident_member ( 
                member_id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT,
                address TEXT,
                password_hash TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS post_content (
                post_id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT DEFAULT 'General',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                event_date TEXT,

                FOREIGN KEY (member_id)
                    REFERENCES resident_member(member_id)
            );

            CREATE TABLE IF NOT EXISTS marketplace_product (
                product_id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                category TEXT NOT NULL,
                condition TEXT NOT NULL,
                location TEXT NOT NULL,
                description TEXT,
                image TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (member_id)
                    REFERENCES resident_member(member_id)
            );
            CREATE TABLE IF NOT EXISTS post_reply (
            reply_id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            member_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id)
                REFERENCES post_content(post_id)
                ON DELETE CASCADE,
            FOREIGN KEY (member_id)
                REFERENCES resident_member(member_id)
            );

            CREATE TABLE IF NOT EXISTS post_kudos (
                post_id INTEGER NOT NULL,
                member_id INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (post_id, member_id),
                FOREIGN KEY (post_id)
                    REFERENCES post_content(post_id)
                    ON DELETE CASCADE,
                FOREIGN KEY (member_id)
                    REFERENCES resident_member(member_id)
                    ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS event_registration (
                post_id INTEGER NOT NULL,
                member_id INTEGER NOT NULL,
                attendee_count INTEGER NOT NULL DEFAULT 1
                    CHECK (attendee_count >= 1),
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (post_id, member_id),
                FOREIGN KEY (post_id)
                    REFERENCES post_content(post_id)
                    ON DELETE CASCADE,
                FOREIGN KEY (member_id)
                    REFERENCES resident_member(member_id)
                    ON DELETE CASCADE
            );
        """)
        # Add password_hash to existing databases if it is missing
        columns = conn.execute(
            "PRAGMA table_info(resident_member)"
        ).fetchall()

        column_names = [column["name"] for column in columns]

        if "password_hash" not in column_names:
            conn.execute(
                "ALTER TABLE resident_member ADD COLUMN password_hash TEXT"
            )

        post_columns = conn.execute(
            "PRAGMA table_info(post_content)"
        ).fetchall()
        post_column_names = [column["name"] for column in post_columns]

        if "event_date" not in post_column_names:
            conn.execute(
                "ALTER TABLE post_content ADD COLUMN event_date TEXT"
            )

        registration_columns = conn.execute(
            "PRAGMA table_info(event_registration)"
        ).fetchall()
        registration_column_names = [
            column["name"] for column in registration_columns
        ]

        if "attendee_count" not in registration_column_names:
            conn.execute(
                """
                ALTER TABLE event_registration
                ADD COLUMN attendee_count INTEGER NOT NULL DEFAULT 1
                """
            )

        conn.commit()
        print("Database initialized successfully!")

    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
