"""Main FastAPI application for Volontire Map: pages, auth, and request APIs."""

from fastapi import FastAPI, Request, Depends, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import Optional
import re

from datalayer import email_exists, find_user_by_credentials, get_users, save_user

DATABASE_URL = "sqlite:///./requests.db"

Base = declarative_base()


class RequestDB(Base):
    """ORM model for help requests shown on the map."""

    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    author_email = Column(String, nullable=False)
    accepted_by = Column(String, nullable=True)
    status = Column(String, default="New")


class Database:
    def __init__(self, url: str):
        """Create engine/session factory and ensure schema exists."""
        self.engine = create_engine(
            url,
            connect_args={"check_same_thread": False}
        )
        self.SessionLocal = sessionmaker(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

    def get_session(self):
        """Return a new SQLAlchemy session."""
        return self.SessionLocal()

class UserService:

    def _is_valid_email(self, email: str) -> bool:
        """Validate email format using a simple regex pattern."""
        pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
        return bool(re.match(pattern, email.strip()))

    def validate_register_data(
        self,
        surname: str,
        name: str,
        patronymic: str,
        gender: str,
        phone_code: str,
        phone: str,
        email: str,
        password: str,
    ) -> list[str]:
        """Validate registration payload and return user-facing error messages."""

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

        if not self._is_valid_email(email):
            errors.append("Введіть коректну електронну пошту.")
        elif email_exists(email):
            errors.append("Користувач з такою поштою вже існує.")

        if len(password.strip()) < 8:
            errors.append("Пароль має містити щонайменше 8 символів.")

        return errors

    def validate_login_data(self, email: str, password: str) -> list[str]:
        """Validate login payload and return a list of errors if any."""
        errors: list[str] = []
        if not self._is_valid_email(email):
            errors.append("Введіть коректну електронну пошту.")
        if not password.strip():
            errors.append("Введіть пароль.")
        return errors

    def login(self, email: str, password: str):
        """Authenticate user by email/password via data layer."""
        return find_user_by_credentials(email=email, password=password)

    def register(self, **data):
        """Persist new user via data layer."""
        save_user(**data)

class RequestService:

    def __init__(self, db: Database):
        """Store DB dependency for request operations."""
        self.db = db

    def get_all(self):
        """Return all help requests from storage."""
        session = self.db.get_session()
        requests = session.query(RequestDB).all()
        session.close()
        return requests

    def create(self, title, description, lat, lng, author_email):
        """Create a new help request in 'New' status."""
        session = self.db.get_session()
        new_request = RequestDB(
            title=title,
            description=description,
            lat=lat,
            lng=lng,
            author_email=author_email,
            status="New"
        )
        session.add(new_request)
        session.commit()
        session.close()

    def accept(self, request_id: int, user: str):
        """Assign request to helper if it is still available."""
        session = self.db.get_session()
        req = session.query(RequestDB).filter(RequestDB.id == request_id).first()

        if not req or req.status != "New":
            session.close()
            return {"error": "Not available"}

        req.accepted_by = user
        req.status = "Accepted"
        session.commit()
        session.close()
        return {"success": True}

    def cancel(self, request_id: int, user: str):
        """Cancel request according to role: author deletes, helper releases."""
        session = self.db.get_session()
        req = session.query(RequestDB).filter(RequestDB.id == request_id).first()

        if not req:
            session.close()
            return {"error": "Not found"}

        if user == req.author_email:
            session.delete(req)
            session.commit()
            session.close()
            return {"deleted": True}

        if user == req.accepted_by:
            req.status = "New"
            req.accepted_by = None
            session.commit()
            session.close()
            return {"reactivated": True}

        session.close()
        return {"error": "Forbidden"}

    def get_contacts(self, request_id: int, user: str):
        """Return author/helper contacts for accepted request participants only."""
        session = self.db.get_session()
        req = session.query(RequestDB).filter(RequestDB.id == request_id).first()

        if not req or req.status != "Accepted":
            session.close()
            return {"error": "Not available"}

        if user != req.author_email and user != req.accepted_by:
            session.close()
            return {"error": "Forbidden"}

        users = get_users()

        author = next(u for u in users if u["email"] == req.author_email)
        helper = next(u for u in users if u["email"] == req.accepted_by)

        session.close()

        return {
            "author": {
                "email": author["email"],
                "phone": author["phone"]
            },
            "helper": {
                "email": helper["email"],
                "phone": helper["phone"]
            }
        }

class AppFactory:

    def __init__(self):
        """Create app and wire services, templates, and routes."""
        self.db = Database(DATABASE_URL)
        self.user_service = UserService()
        self.request_service = RequestService(self.db)

        self.app = FastAPI()
        self.templates = Jinja2Templates(directory="templates")

        self._configure()

    def _configure(self):
        """Configure middleware, static files, and route registration."""
        self.app.add_middleware(SessionMiddleware, secret_key="supersecretkey")
        self.app.mount("/static", StaticFiles(directory="static"), name="static")
        self._register_routes()

    def require_login(self, request: Request):
        """Return current user or redirect unauthenticated user to login page."""
        user = request.session.get("user")
        if not user:
            next_url = request.url.path
            return RedirectResponse(url=f"/login?next={next_url}", status_code=302)
        return user

    def _register_routes(self):
        """Register page and API endpoints."""

        @self.app.get("/")
        def home(request: Request):
            """Render homepage."""
            return self.templates.TemplateResponse("index.html", {
                "request": request,
                "user": request.session.get("user")
            })

        @self.app.get("/register", response_class=HTMLResponse)
        def register_page(request: Request):
            """Render registration page."""
            return self.templates.TemplateResponse("register.html", {"request": request})

        @self.app.post("/register", response_class=HTMLResponse)
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
            """Validate and create a new user account."""
            errors = self.user_service.validate_register_data(
                surname, name, patronymic,
                gender, phone_code, phone,
                email, password
            )

            if errors:
                return self.templates.TemplateResponse("register.html", {
                    "request": request,
                    "errors": errors,
                    "show_error_modal": True
                })

            self.user_service.register(
                surname=surname.strip(),
                name=name.strip(),
                patronymic=patronymic.strip(),
                gender=gender,
                phone_code=phone_code,
                phone=phone.strip(),
                email=email.strip(),
                password=password.strip(),
            )

            return self.templates.TemplateResponse("register.html", {
                "request": request,
                "message": f"Користувач {name.strip()} збережений"
            })

        @self.app.get("/login", response_class=HTMLResponse)
        def login_page(request: Request, next: str = None):
            """Render login page (or redirect if already logged in)."""
            if request.session.get("user"):
                return RedirectResponse("/", status_code=302)

            return self.templates.TemplateResponse("login.html", {
                "request": request,
                "next": next
            })

        @self.app.post("/login", response_class=HTMLResponse)
        def login_submit(
            request: Request,
            email: str = Form(""),
            password: str = Form(""),
            next: str = Form(None)
        ):
            """Authenticate user and start session."""
            errors = self.user_service.validate_login_data(email, password)

            if not errors:
                user = self.user_service.login(email, password)
                if user is None:
                    errors.append("Невірна пошта або пароль.")

            if errors:
                return self.templates.TemplateResponse("login.html", {
                    "request": request,
                    "errors": errors,
                    "show_error_modal": True
                })

            request.session["user"] = user["email"]
            redirect_url = next if next else "/"
            return RedirectResponse(url=redirect_url, status_code=302)

        @self.app.get("/create_request")
        def create_request(request: Request, user=Depends(self.require_login)):
            """Render request creation page for authenticated users."""
            if isinstance(user, RedirectResponse):
                return user
            return self.templates.TemplateResponse("create_request.html", {
                "request": request
            })

        @self.app.get("/map", response_class=HTMLResponse)
        def map_page(request: Request, user=Depends(self.require_login)):
            """Render requests map page for authenticated users."""
            if isinstance(user, RedirectResponse):
                return user
            return self.templates.TemplateResponse("map.html", {
                "request": request
            })

        @self.app.get("/api/requests")
        def get_requests():
            """Return serialized list of all requests."""
            requests = self.request_service.get_all()
            return [
                {
                    "id": r.id,
                    "title": r.title,
                    "description": r.description,
                    "lat": r.lat,
                    "lng": r.lng,
                    "status": r.status,
                    "accepted_by": r.accepted_by
                }
                for r in requests
            ]

        @self.app.post("/api/requests")
        async def add_request(
            request: Request,
            title: str = Form(...),
            description: str = Form(...),
            lat: float = Form(...),
            lng: float = Form(...)
        ):
            """Create request from form data for logged-in user."""
            user = request.session.get("user")
            if not user:
                return {"error": "Not authorized"}

            self.request_service.create(title, description, lat, lng, user)
            return {"success": True}

        @self.app.post("/api/requests/{request_id}/accept")
        def accept_request(request_id: int, request: Request):
            """Accept request on behalf of current user."""
            user = request.session.get("user")
            if not user:
                return {"error": "Not authorized"}

            return self.request_service.accept(request_id, user)

        @self.app.post("/api/requests/{request_id}/cancel")
        def cancel_request(request_id: int, request: Request):
            """Cancel or release request on behalf of current user."""
            user = request.session.get("user")
            if not user:
                return {"error": "Not authorized"}

            return self.request_service.cancel(request_id, user)

        @self.app.get("/api/requests/{request_id}/contacts")
        def get_contacts(request_id: int, request: Request):
            """Return contacts for accepted request when user has access."""
            user = request.session.get("user")
            if not user:
                return {"error": "Not authorized"}

            return self.request_service.get_contacts(request_id, user)

        @self.app.get("/logout")
        def logout(request: Request):
            """Clear session and redirect to homepage."""
            request.session.clear()
            return RedirectResponse("/", status_code=302)

app_instance = AppFactory()
app = app_instance.app
