import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("SECRET_KEY", "test_secret_key")

from app.db.database import Base, get_db
from app.db import models
from app.core.security import get_password_hash
from main import app


TEST_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///:memory:")

if TEST_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(TEST_DATABASE_URL)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
        db.rollback()
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db):
    user = models.User(
        email="admin@test.com",
        name="Admin User",
        role="admin",
        hashed_password=get_password_hash("testpass123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def regular_user(db):
    user = models.User(
        email="user@test.com",
        name="Test User",
        role="user",
        hashed_password=get_password_hash("testpass123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_token(client, admin_user):
    response = client.post(
        "/auth/login",
        data={"username": admin_user.email, "password": "testpass123"},
    )
    return response.json()["access_token"]


@pytest.fixture
def user_token(client, regular_user):
    response = client.post(
        "/auth/login",
        data={"username": regular_user.email, "password": "testpass123"},
    )
    return response.json()["access_token"]

