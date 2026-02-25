"""SQLite data-access helpers for user registration and authentication."""

import sqlite3
from pathlib import Path
from typing import Dict, List, Optional

DB_PATH = Path(__file__).with_name("users.db")


def _get_connection() -> sqlite3.Connection:
    """Open DB connection with row access by column names."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
    """Create users table if it does not exist."""
    with _get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                surname TEXT NOT NULL,
                name TEXT NOT NULL,
                patronymic TEXT NOT NULL,
                gender TEXT NOT NULL,
                phone_code TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL
            )
            """
        )
        conn.commit()

def save_user(
    surname: str,
    name: str,
    patronymic: str,
    gender: str,
    phone_code: str,
    phone: str,
    email: str,
    password: str,
) -> None:
    """Insert a new user row."""
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO users (
                surname, name, patronymic, gender, phone_code, phone, email, password
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (surname, name, patronymic, gender, phone_code, phone, email, password),
        )
        conn.commit()


def get_users() -> List[Dict[str, str]]:
    """Return all users as dictionaries ordered by newest first."""
    with _get_connection() as conn:
        rows = conn.execute(
            """
            SELECT surname, name, patronymic, gender, phone_code, phone, email, password
            FROM users
            ORDER BY id DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


def email_exists(email: str) -> bool:
    """Check whether email is already present (case-insensitive)."""
    target = email.strip().lower()
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM users WHERE lower(email) = ? LIMIT 1",
            (target,),
        ).fetchone()

    return row is not None


def find_user_by_credentials(email: str, password: str) -> Optional[Dict[str, str]]:
    """Return matching user by email/password or None."""
    target = email.strip().lower()

    with _get_connection() as conn:
        row = conn.execute(
            """
            SELECT surname, name, patronymic, gender, phone_code, phone, email, password
            FROM users
            WHERE lower(email) = ? AND password = ?
            LIMIT 1
            """,
            (target, password),
        ).fetchone()

    return dict(row) if row is not None else None

_init_db()
