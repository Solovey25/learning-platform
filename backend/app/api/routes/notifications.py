from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.schemas import notification as notification_schema
from app.core.security import get_current_active_user


router = APIRouter()


@router.get(
    "/notifications",
    response_model=notification_schema.NotificationListResponse,
)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    items = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .limit(50)
        .all()
    )

    return notification_schema.NotificationListResponse(
        items=[
            notification_schema.NotificationBase(
                id=n.id,
                type=n.type,
                title=n.title,
                body=n.body,
                entity_type=n.entity_type,
                entity_id=n.entity_id,
                is_read=n.is_read,
                created_at=n.created_at,
            )
            for n in items
        ]
    )


@router.get(
    "/notifications/unread-count",
    response_model=notification_schema.UnreadCountResponse,
)
def unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    count = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read.is_(False),
        )
        .count()
    )
    return notification_schema.UnreadCountResponse(count=count)


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    notification = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        return {"success": False}

    if not notification.is_read:
        notification.is_read = True
        db.add(notification)
        db.commit()

    return {"success": True}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read.is_(False),
        )
        .update({"is_read": True})
    )
    db.commit()
    return {"success": True}


@router.post("/notifications/clear")
def clear_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"success": True}
