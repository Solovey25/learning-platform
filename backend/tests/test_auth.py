from datetime import datetime, timedelta, timezone

from fastapi import status
from jose import jwt

from app.core import security
def test_register_creates_user_and_returns_token(client):
    payload = {
        "email": "newuser@example.com",
        "name": "New User",
        "password": "StrongPass123",
    }

    response = client.post("/auth/register", json=payload)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == payload["email"]
    assert data["user"]["name"] == payload["name"]


def test_register_with_existing_email_returns_400(client, db):
    payload = {
        "email": "existing@example.com",
        "name": "Existing User",
        "password": "Password123",
    }
    client.post("/auth/register", json=payload)

    response = client.post("/auth/register", json=payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert "email" in data["detail"].lower()


def test_login_successful_with_correct_credentials(client):
    register_payload = {
        "email": "loginuser@example.com",
        "name": "Login User",
        "password": "LoginPass123",
    }
    client.post("/auth/register", json=register_payload)

    response = client.post(
        "/auth/login",
        data={"username": register_payload["email"], "password": register_payload["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == register_payload["email"]


def test_login_fails_for_unknown_email(client):
    response = client.post(
        "/auth/login",
        data={"username": "unknown@example.com", "password": "AnyPassword123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    data = response.json()
    assert "не найден" in data["detail"]


def test_login_fails_for_wrong_password(client):
    register_payload = {
        "email": "wrongpass@example.com",
        "name": "Wrong Pass User",
        "password": "CorrectPass123",
    }
    client.post("/auth/register", json=register_payload)

    response = client.post(
        "/auth/login",
        data={"username": register_payload["email"], "password": "IncorrectPass456"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    data = response.json()
    assert "неверный пароль" in data["detail"].lower()


def test_me_returns_current_user(client):
    register_payload = {
        "email": "meuser@example.com",
        "name": "Me User",
        "password": "MePass123",
    }
    register_response = client.post("/auth/register", json=register_payload)
    token = register_response.json()["access_token"]

    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == register_payload["email"]
    assert data["name"] == register_payload["name"]


def test_me_unauthorized_without_token(client):
    response = client.get("/auth/me")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_with_invalid_token_returns_401(client):
    response = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid.token"},
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    data = response.json()
    assert "could not validate credentials" in data["detail"].lower()


def test_password_hash_and_verify_roundtrip():
    password = "StrongPass123"
    hashed = security.get_password_hash(password)

    assert hashed != password
    assert security.verify_password(password, hashed) is True
    assert security.verify_password("WrongPass123", hashed) is False


def test_create_access_token_contains_sub_and_valid_exp():
    user_id = "user-123"
    expires = timedelta(minutes=5)

    token = security.create_access_token({"sub": user_id}, expires_delta=expires)

    decoded = jwt.decode(
        token,
        security.SECRET_KEY,
        algorithms=[security.ALGORITHM],
    )

    assert decoded["sub"] == user_id
    assert "exp" in decoded

    now_ts = datetime.now(timezone.utc).timestamp()
    exp_ts = decoded["exp"]

    assert exp_ts > now_ts
    assert exp_ts - now_ts <= expires.total_seconds() + 5
