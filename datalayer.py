"""SQLite data-access helpers for user registration and authentication."""

import sqlite3
from pathlib import Path
from typing import Dict, List, Optional
from passlib.context import CryptContext


DB_PATH = Path(__file__).with_name("users.db")

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
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

    hashed_password = pwd_context.hash(password)

    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO users (
                surname, name, patronymic, gender, phone_code, phone, email, password
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (surname, name, patronymic, gender, phone_code, phone, email, hashed_password),
        )
        conn.commit()


def get_users() -> List[Dict[str, str]]:
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
    target = email.strip().lower()
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT 1 FROM users WHERE lower(email) = ? LIMIT 1",
            (target,),
        ).fetchone()

    return row is not None


def find_user_by_credentials(email: str, password: str) -> Optional[Dict[str, str]]:
    target = email.strip().lower()

    with _get_connection() as conn:
        row = conn.execute(
            """
            SELECT surname, name, patronymic, gender, phone_code, phone, email, password
            FROM users
            WHERE lower(email) = ?
            LIMIT 1
            """,
            (target,),
        ).fetchone()

    if row is None:
        return None


    if not pwd_context.verify(password, row["password"]):
        return None

    return dict(row)

_init_db()
