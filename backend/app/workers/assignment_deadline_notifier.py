import time
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db import models


def create_deadline_notifications(session: Session) -> None:
    now = datetime.now(timezone.utc)

    intervals = [
        ("assignment_deadline_6h", timedelta(hours=6)),
        ("assignment_deadline_1h", timedelta(hours=1)),
    ]

    assignments = (
        session.query(models.Assignment)
        .filter(models.Assignment.due_date.isnot(None))
        .all()
    )

    for assignment in assignments:
        if not assignment.due_date:
            continue

        for notif_type, delta in intervals:
            if assignment.due_date <= now:
                continue

            if assignment.due_date - now > delta:
                continue

            enrollments = (
                session.query(models.Enrollment)
                .filter(models.Enrollment.course_id == assignment.course_id)
                .all()
            )

            for enrollment in enrollments:
                existing = (
                    session.query(models.Notification.id)
                    .filter(
                        models.Notification.user_id == enrollment.user_id,
                        models.Notification.type == notif_type,
                        models.Notification.entity_type == "assignment",
                        models.Notification.entity_id == assignment.id,
                    )
                    .first()
                )
                if existing:
                    continue

                if notif_type == "assignment_deadline_6h":
                    title = "Скоро дедлайн задания"
                    body = f"Через 6 часов истекает срок сдачи задания «{assignment.title}»"
                else:
                    title = "Дедлайн задания близко"
                    body = f"Через час истекает срок сдачи задания «{assignment.title}»"

                notification = models.Notification(
                    user_id=enrollment.user_id,
                    type=notif_type,
                    title=title,
                    body=body,
                    entity_type="assignment",
                    entity_id=assignment.id,
                )
                session.add(notification)


def main() -> None:
    while True:
        session = SessionLocal()
        try:
            create_deadline_notifications(session)
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

        time.sleep(60)


if __name__ == "__main__":
    main()

