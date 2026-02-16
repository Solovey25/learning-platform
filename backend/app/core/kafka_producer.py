import importlib
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional


logger = logging.getLogger(__name__)

_producer: Optional[Any] = None


def _get_producer() -> Any:
    global _producer
    if _producer is not None:
        return _producer

    try:
        kafka_module = importlib.import_module("kafka")
        KafkaProducer = getattr(kafka_module, "KafkaProducer")
    except Exception:
        class DummyProducer:
            def send(self, *args: Any, **kwargs: Any) -> None:
                return None

        _producer = DummyProducer()
        return _producer

    bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
    if not bootstrap_servers:
        raise RuntimeError("KAFKA_BOOTSTRAP_SERVERS environment variable must be set")

    _producer = KafkaProducer(
        bootstrap_servers=bootstrap_servers.split(","),
        key_serializer=lambda k: k.encode("utf-8") if isinstance(k, str) else k,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    return _producer


def send_event(
    topic: str,
    key: Optional[str],
    event_type: str,
    payload: Dict[str, Any],
) -> None:
    producer = _get_producer()

    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        **payload,
    }

    try:
        producer.send(topic, key=key, value=event)
    except Exception:
        logger.exception("Failed to send event to Kafka topic %s", topic)
