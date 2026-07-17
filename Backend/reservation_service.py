from redis_client import redis_client
from config import settings

LOCK_TTL_SECONDS = settings.SEAT_LOCK_TTL_SECONDS


def _normalize_id(seat_id: str) -> str:
    return str(seat_id).strip().lower()


def try_lock_seat(seat_id: str, user_id: str) -> bool:
    normalized_id = _normalize_id(seat_id)
    lock_key = f"seat_lock:{normalized_id}"

    is_locked = redis_client.set(
        name=lock_key,
        value=user_id,
        nx=True,
        ex=LOCK_TTL_SECONDS
    )
    return bool(is_locked)


def release_seat(seat_id: str, user_id: str) -> bool:
    normalized_id = _normalize_id(seat_id)
    lock_key = f"seat_lock:{normalized_id}"

    current_owner = redis_client.get(lock_key)
    if current_owner is not None and current_owner == user_id:
        redis_client.delete(lock_key)
        return True
    return False


def get_seat_status(seat_id: str) -> str:
    normalized_id = _normalize_id(seat_id)
    lock_key = f"seat_lock:{normalized_id}"

    if redis_client.exists(lock_key):
        return "LOCKED"
    return "AVAILABLE"

def get_lock_owner(seat_id: str) -> str | None:
    normalized_id = _normalize_id(seat_id)
    lock_key = f"seat_lock:{normalized_id}"
    return redis_client.get(lock_key)