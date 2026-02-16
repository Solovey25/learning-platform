import json
import os
import time

from kafka import KafkaConsumer
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db import models


def process_course_enrolled(session: Session, event: dict) -> None:
    user_id = event.get("user_id")
    course_id = event.get("course_id")
    if not user_id or not course_id:
        return

    course = session.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        return

    notification = models.Notification(
        user_id=user_id,
        type="course_enrolled",
        title="Новый курс",
        body=f"Ты записан на курс «{course.title}»",
        entity_type="course",
        entity_id=course_id,
    )
    session.add(notification)


def process_assignment_graded(session: Session, event: dict) -> None:
    user_id = event.get("user_id")
    assignment_id = event.get("assignment_id")
    if not user_id or not assignment_id:
        return

    assignment = (
        session.query(models.Assignment)
        .filter(models.Assignment.id == assignment_id)
        .first()
    )
    if not assignment:
        return

    grade = event.get("grade")

    title = "Задание оценено"
    if grade is not None:
        body = f"Твоё задание «{assignment.title}» оценено на {grade}"
    else:
        body = f"Твоё задание «{assignment.title}» оценено"

    notification = models.Notification(
        user_id=user_id,
        type="assignment_graded",
        title=title,
        body=body,
        entity_type="assignment",
        entity_id=assignment_id,
    )
    session.add(notification)


def process_group_member_added(session: Session, event: dict) -> None:
    user_id = event.get("user_id")
    group_id = event.get("group_id")
    if not user_id or not group_id:
        return

    group = (
        session.query(models.Group)
        .filter(models.Group.id == group_id)
        .first()
    )
    if not group:
        return

    notification = models.Notification(
        user_id=user_id,
        type="group_member_added",
        title="Новая группа",
        body=f"Ты добавлен в группу «{group.name}»",
        entity_type="group",
        entity_id=group_id,
    )
    session.add(notification)


def process_event(session: Session, event: dict) -> None:
    event_type = event.get("event_type")
    if event_type == "course_enrolled":
        process_course_enrolled(session, event)
    elif event_type == "assignment_graded":
        process_assignment_graded(session, event)
    elif event_type == "group_member_added":
        process_group_member_added(session, event)


def main() -> None:
    bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
    if not bootstrap_servers:
        raise RuntimeError("KAFKA_BOOTSTRAP_SERVERS environment variable must be set")

    consumer = KafkaConsumer(
        "notifications-events",
        bootstrap_servers=bootstrap_servers.split(","),
        group_id="notifications-service",
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )

    while True:
        session = SessionLocal()
        try:
            for message in consumer:
                event = message.value
                process_event(session, event)
                session.commit()
        except Exception:
            session.rollback()
            time.sleep(1)
        finally:
            session.close()


if __name__ == "__main__":
    main()
