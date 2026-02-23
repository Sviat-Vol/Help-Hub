import re

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from datalayer import email_exists, find_user_by_credentials, get_users, save_user

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


def render_template(
    template_name: str,
    request: Request,
    *,
    message: str = "",
    errors: list[str] | None = None,
    show_error_modal: bool = False,
):
    context = {
        "request": request,
        "message": message,
        "errors": errors or [],
        "show_error_modal": show_error_modal,
        "form_data": {},
    }
    if template_name == "index.html":
        context["users"] = get_users()
    return templates.TemplateResponse(template_name, context)


def _is_valid_email(email: str) -> bool:
    email_pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
    return bool(re.match(email_pattern, email.strip()))


def validate_register_data(
    surname: str,
    name: str,
    patronymic: str,
    gender: str,
    phone_code: str,
    phone: str,
    email: str,
    password: str,
) -> list[str]:
    errors: list[str] = []

    if not surname.strip():
        errors.append("Введіть прізвище.")
    if not name.strip():
        errors.append("Введіть ім'я.")
    if not patronymic.strip():
        errors.append("Введіть по батькові.")

    if gender not in {"male", "female"}:
        errors.append("Оберіть стать.")

    if phone_code not in {"+380", "+1", "+44", "+49", "+33", "+48"}:
        errors.append("Оберіть коректний код країни.")

    phone_clean = re.sub(r"\D", "", phone)
    if len(phone_clean) < 7 or len(phone_clean) > 12:
        errors.append("Номер телефону має містити від 7 до 12 цифр.")

    if not _is_valid_email(email):
        errors.append("Введіть коректну електронну пошту.")
    elif email_exists(email):
        errors.append("Користувач з такою поштою вже існує.")

    if len(password.strip()) < 8:
        errors.append("Пароль має містити щонайменше 8 символів.")

    return errors


def validate_login_data(email: str, password: str) -> list[str]:
    errors: list[str] = []
    if not _is_valid_email(email):
        errors.append("Введіть коректну електронну пошту.")
    if not password.strip():
        errors.append("Введіть пароль.")
    return errors


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return render_template("index.html", request)


@app.post("/register", response_class=HTMLResponse)
def register(
    request: Request,
    surname: str = Form(""),
    name: str = Form(""),
    patronymic: str = Form(""),
    gender: str = Form(""),
    phone_code: str = Form(""),
    phone: str = Form(""),
    email: str = Form(""),
    password: str = Form(""),
):
    errors = validate_register_data(
        surname=surname,
        name=name,
        patronymic=patronymic,
        gender=gender,
        phone_code=phone_code,
        phone=phone,
        email=email,
        password=password,
    )

    if errors:
        return render_template(
            "index.html",
            request,
            errors=errors,
            show_error_modal=True,
        )

    save_user(
        surname=surname.strip(),
        name=name.strip(),
        patronymic=patronymic.strip(),
        gender=gender,
        phone_code=phone_code,
        phone=phone.strip(),
        email=email.strip(),
        password=password.strip(),
    )

    return render_template(
        "index.html",
        request,
        message=f"Користувач {name.strip()} збережений",
    )


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return render_template("login.html", request)


@app.post("/login", response_class=HTMLResponse)
def login_submit(
    request: Request,
    email: str = Form(""),
    password: str = Form(""),
):
    errors = validate_login_data(email, password)

    if not errors:
        user = find_user_by_credentials(email=email, password=password)
        if user is None:
            errors.append("Невірна пошта або пароль.")

    if errors:
        return render_template(
            "login.html",
            request,
            errors=errors,
            show_error_modal=True,
        )

    return render_template("login.html", request, message="Вхід успішний.")
