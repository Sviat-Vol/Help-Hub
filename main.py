'''Python code for login page.'''
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

users_db = {}

@app.get("/", response_class=HTMLResponse)
async def get_login_page(request: Request):
    """
    Renders and serves the login page.
    """
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
async def login_user(email: str = Form(...), password: str = Form(...)):
    '''
    Handles user authentication.

    Verifies if the provided email exists in the local 'users_db' dictionary.
    If the user is found, the function validates the password.

    Args:
        email (str): User's email address submitted via the form.
        password (str): User's password submitted via the form.
    '''
    if email not in users_db:
        print(f"--- Спроба входу: Користувач {email} не знайдений ---")
        return {"Невірний email або пароль"}

    stored_password = users_db[email]["password"]

    if password != stored_password:
        print(f"--- Спроба входу: Невірний пароль для {email} ---")
        return {"Невірний email або пароль"}

    print("\n--- УСПІШНИЙ ВХІД ---")

    output_data = {email: users_db[email]}
    print(f"Дані користувача: {output_data}\n")

    return {"message": "Ви успішно увійшли!",
        "user_data": output_data}
