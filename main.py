from fastapi import FastAPI, Request,  Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
app = FastAPI()


app.add_middleware(SessionMiddleware, secret_key="supersecretkey")

templates = Jinja2Templates(directory="templates")

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )
def get_current_user(request: Request):
    user = request.session.get("user")
    if not user:
        return RedirectResponse("/login", status_code=302)
    return user
def require_login(request: Request):
    user = request.session.get("user")
    if not user:
        return RedirectResponse(url="/login", status_code=302)
    return user
@app.get("/create-request")
def create_request(request: Request):
    if not request.session.get("user"):
        return RedirectResponse("/login", status_code=302)

    return templates.TemplateResponse("create_request.html", {
        "request": request
    })
@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse("login.html", {
        "request": request
    })
@app.post("/login")
def login(request: Request):
    request.session["user"] = "some_user"
    return RedirectResponse("/", status_code=302)
