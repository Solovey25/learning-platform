import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.db.database import get_db
from app.db import models
from app.schemas import user as user_schema
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_active_user,
)

router = APIRouter()

@router.post("/register", response_model=user_schema.Token)
def register(user_data: user_schema.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )
    
    hashed_password = get_password_hash(user_data.password)
    db_user = models.User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post("/login", response_model=user_schema.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь с таким email не найден",
        )
    
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=user_schema.UserResponse)
def get_current_user_info(current_user: models.User = Depends(get_current_active_user)):
    return current_user


@router.patch("/me", response_model=user_schema.UserResponse)
def update_current_user(
    payload: user_schema.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    if payload.email and payload.email != current_user.email:
        existing = db.query(models.User).filter(models.User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует",
            )

    if payload.name is not None:
        current_user.name = payload.name
    if payload.email is not None:
        current_user.email = payload.email

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    payload: user_schema.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Текущий пароль указан неверно",
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()

    return {"detail": "Пароль успешно изменён"}


@router.post("/forgot-password")
def forgot_password(payload: user_schema.ForgotPasswordRequest):
    # Заглушка: в реальном приложении здесь была бы отправка email
    logging.info(f"Запрошен сброс пароля для {payload.email}")
    return {"detail": "Если пользователь с таким email существует, отправлено письмо для сброса пароля"}


@router.post("/reset-password")
def reset_password(payload: user_schema.ResetPasswordRequest, db: Session = Depends(get_db)):
    # Заглушка: нет хранения токенов, поэтому просто логируем
    logging.info("Запрошен сброс пароля по токену")
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Сброс пароля по токену пока не реализован на сервере",
    )
