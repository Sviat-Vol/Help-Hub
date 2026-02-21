from typing import Dict, List, Optional

_users_db: List[Dict[str, str]] = []


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
    _users_db.append(
        {
            "surname": surname,
            "name": name,
            "patronymic": patronymic,
            "gender": gender,
            "phone_code": phone_code,
            "phone": phone,
            "email": email,
            "password": password,  # для продакшену: тільки хеш
        }
    )


def get_users() -> List[Dict[str, str]]:
    return _users_db


def email_exists(email: str) -> bool:
    target = email.strip().lower()
    return any(u["email"].strip().lower() == target for u in _users_db)


def find_user_by_credentials(email: str, password: str) -> Optional[Dict[str, str]]:
    target = email.strip().lower()
    for user in _users_db:
        if user["email"].strip().lower() == target and user["password"] == password:
            return user
    return None
