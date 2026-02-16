import sys
import traceback
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, courses, admin, assignments, notifications

tags_metadata = [
    {
        "name": "Авторизация",
        "description": "Регистрация и вход пользователей, получение токена доступа.",
    },
    {
        "name": "Курсы",
        "description": "Просмотр курсов, прогресса и участие в обучении.",
    },
    {
        "name": "Админка",
        "description": "Управление пользователями, курсами, группами, аналитикой и заданиями.",
    },
    {
        "name": "Задания",
        "description": "Работа студентов с заданиями: сдача, просмотр и оценивание.",
    },
    {
        "name": "Уведомления",
        "description": "Просмотр и управление уведомлениями пользователя.",
    },
]

app = FastAPI(
    title="TeamUp Platform API",
    description="Backend API для платформы командного обучения: курсы, группы, задания и аналитика.",
    version="1.0.0",
    openapi_tags=tags_metadata,
)

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Авторизация"])
app.include_router(courses.router, prefix="/courses", tags=["Курсы"])
app.include_router(admin.router, prefix="/admin", tags=["Админка"])
app.include_router(assignments.router, tags=["Задания"])
app.include_router(notifications.router, tags=["Уведомления"])


@app.get("/")
def read_root():
    return {"message": "Welcome to Educational Platform API"}

@app.middleware("http")
async def error_logging_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        print("\n" + "="*50)
        print(f"CRITICAL ERROR ON {request.method} {request.url}")
        traceback.print_exc(file=sys.stdout)
        print("="*50 + "\n")
        raise e from None


@app.on_event("startup")
def startup_event():
    from app.core.security import get_password_hash
    from app.db.database import get_db, Base, engine
    from app.db import models
    from alembic.config import Config
    from alembic import command
    import os

    print("Running database migrations...")
    try:
        alembic_cfg = Config("alembic.ini")
        database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/eduplatform")
        alembic_cfg.set_main_option("sqlalchemy.url", database_url)
        command.upgrade(alembic_cfg, "head")
        print("Migrations completed successfully.")
    except Exception as e:
        print(f"Migration error: {e}")

    print("Checking if admin user exists...")

    db = next(get_db())
    
    admin_email = os.getenv("ADMIN_EMAIL", "admin@admin.com")
    admin_password = os.getenv("ADMIN_PASSWORD")
    
    if admin_password:
        if not db.query(models.User).filter(models.User.email == admin_email).first():
            admin = models.User(
                email=admin_email,
                name="admin",
                role="admin",
                hashed_password=get_password_hash(admin_password)
            )
            db.add(admin)
            db.commit()
            print("Admin user created.")
        else:
            print("Admin already exists.")
    else:
        print("ADMIN_PASSWORD is not set; skipping admin user creation.")

    try:
        Base.metadata.create_all(bind=engine)
        print("Ensured all ORM tables exist.")
    except Exception as e:
        print(f"Error while ensuring tables exist: {e}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
