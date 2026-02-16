from typing import List, Optional

from fastapi import status
from sqlalchemy.orm import Session

from app.db import models


def create_notification(
    db: Session,
    user: models.User,
    type_: str = "test_event",
    title: str = "Test notification",
    body: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    is_read: bool = False,
) -> models.Notification:
    notification = models.Notification(
        user_id=user.id,
        type=type_,
        title=title,
        body=body,
        entity_type=entity_type,
        entity_id=entity_id,
        is_read=is_read,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def test_list_notifications_returns_only_current_user_notifications(
    client,
    db: Session,
    regular_user: models.User,
    admin_user: models.User,
    user_token: str,
):
    create_notification(db, regular_user, title="User notification 1")
    create_notification(db, regular_user, title="User notification 2")
    create_notification(db, admin_user, title="Admin notification")

    response = client.get(
        "/notifications",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    titles = [item["title"] for item in data["items"]]

    assert len(data["items"]) == 2
    assert "User notification 1" in titles
    assert "User notification 2" in titles
    assert "Admin notification" not in titles


def test_unread_count_only_counts_unread_notifications(
    client,
    db: Session,
    regular_user: models.User,
    user_token: str,
):
    create_notification(db, regular_user, is_read=False)
    create_notification(db, regular_user, is_read=False)
    create_notification(db, regular_user, is_read=True)

    response = client.get(
        "/notifications/unread-count",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["count"] == 2


def test_mark_notification_read_sets_flag_and_reduces_unread_count(
    client,
    db: Session,
    regular_user: models.User,
    user_token: str,
):
    notification = create_notification(db, regular_user, is_read=False)

    unread_before = client.get(
        "/notifications/unread-count",
        headers={"Authorization": f"Bearer {user_token}"},
    ).json()["count"]
    assert unread_before == 1

    response = client.post(
        f"/notifications/{notification.id}/read",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True

    db.refresh(notification)
    assert notification.is_read is True

    unread_after = client.get(
        "/notifications/unread-count",
        headers={"Authorization": f"Bearer {user_token}"},
    ).json()["count"]
    assert unread_after == 0


def test_mark_notification_read_for_other_user_does_not_modify_notification(
    client,
    db: Session,
    regular_user: models.User,
    admin_user: models.User,
    user_token: str,
):
    foreign_notification = create_notification(db, admin_user, is_read=False)

    response = client.post(
        f"/notifications/{foreign_notification.id}/read",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is False

    db.refresh(foreign_notification)
    assert foreign_notification.is_read is False


def test_mark_all_notifications_read_marks_only_current_user_notifications(
    client,
    db: Session,
    regular_user: models.User,
    admin_user: models.User,
    user_token: str,
):
    create_notification(db, regular_user, title="User 1", is_read=False)
    create_notification(db, regular_user, title="User 2", is_read=False)
    other_notification = create_notification(
        db,
        admin_user,
        title="Admin notification",
        is_read=False,
    )

    response = client.post(
        "/notifications/read-all",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True

    user_notifications: List[models.Notification] = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == regular_user.id)
        .all()
    )
    assert user_notifications
    assert all(n.is_read for n in user_notifications)

    db.refresh(other_notification)
    assert other_notification.is_read is False


def test_clear_notifications_deletes_only_current_user_notifications(
    client,
    db: Session,
    regular_user: models.User,
    admin_user: models.User,
    user_token: str,
):
    create_notification(db, regular_user, title="User 1")
    create_notification(db, regular_user, title="User 2")
    other_notification = create_notification(
        db,
        admin_user,
        title="Admin notification",
        is_read=False,
    )

    response = client.post(
        "/notifications/clear",
        headers={"Authorization": f"Bearer {user_token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["success"] is True

    user_notifications = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == regular_user.id)
        .all()
    )
    assert user_notifications == []

    db.refresh(other_notification)
    assert other_notification is not None
