
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
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS post_content (
                post_id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT DEFAULT 'General',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (member_id)
                    REFERENCES resident_member(member_id)
            );
        """)

        conn.commit()
        print("Database initialized successfully!")

    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
