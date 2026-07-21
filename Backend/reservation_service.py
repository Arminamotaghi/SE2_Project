from redis_client import redis_client
from config import settings

LOCK_TTL_SECONDS = settings.SEAT_LOCK_TTL_SECONDS


def _make_lock_key(event_id: str, seat_id: str) -> str:
    event = str(event_id).strip().lower()
    seat = str(seat_id).strip().lower()
    return f"seat_lock:{event}:{seat}"


def try_lock_seat(event_id: str, seat_id: str, user_id: str) -> bool:
    lock_key = _make_lock_key(event_id, seat_id)
    is_locked = redis_client.set(
        name=lock_key,
        value=user_id,
        nx=True,
        ex=LOCK_TTL_SECONDS
    )
    return bool(is_locked)


def release_seat(event_id: str, seat_id: str, user_id: str) -> bool:
    lock_key = _make_lock_key(event_id, seat_id)
    current_owner = redis_client.get(lock_key)
    if current_owner is not None and current_owner == user_id:
        redis_client.delete(lock_key)
        return True
    return False


def get_seat_status(event_id: str, seat_id: str) -> str:
    lock_key = _make_lock_key(event_id, seat_id)
    if redis_client.exists(lock_key):
        return "LOCKED"
    return "AVAILABLE"


def get_lock_owner(event_id: str, seat_id: str) -> str | None:
    lock_key = _make_lock_key(event_id, seat_id)
    return redis_client.get(lock_key)