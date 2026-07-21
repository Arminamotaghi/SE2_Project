import pytest
import fakeredis
from fastapi.testclient import TestClient

import redis_client
import reservation_service
from main import app

client = TestClient(app)

# یک event_id ثابت برای تست‌ها
TEST_EVENT_ID = "test-event-123"


@pytest.fixture(autouse=True)
def setup_fake_redis(monkeypatch):
    fake = fakeredis.FakeStrictRedis(decode_responses=True)
    monkeypatch.setattr(redis_client, "redis_client", fake)
    monkeypatch.setattr(reservation_service, "redis_client", fake)
    fake.flushall()
    yield fake


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "We good!"}


def test_lock_seat_successfully():
    result = reservation_service.try_lock_seat(TEST_EVENT_ID, "A1", "kaveh")
    assert result is True


def test_prevent_double_locking():
    first_attempt = reservation_service.try_lock_seat(TEST_EVENT_ID, "B2", "kaveh")
    second_attempt = reservation_service.try_lock_seat(TEST_EVENT_ID, "B2", "armina")
    assert first_attempt is True
    assert second_attempt is False


def test_seat_status_changes():
    assert reservation_service.get_seat_status(TEST_EVENT_ID, "C3") == "AVAILABLE"
    reservation_service.try_lock_seat(TEST_EVENT_ID, "C3", "kaveh")
    assert reservation_service.get_seat_status(TEST_EVENT_ID, "C3") == "LOCKED"


def test_release_seat_by_owner():
    reservation_service.try_lock_seat(TEST_EVENT_ID, "D4", "kaveh")
    result = reservation_service.release_seat(TEST_EVENT_ID, "D4", "kaveh")
    assert result is True
    assert reservation_service.get_seat_status(TEST_EVENT_ID, "D4") == "AVAILABLE"


def test_cannot_release_others_seat():
    reservation_service.try_lock_seat(TEST_EVENT_ID, "E5", "kaveh")
    result = reservation_service.release_seat(TEST_EVENT_ID, "E5", "armina")
    assert result is False


def test_case_insensitivity():
    reservation_service.try_lock_seat(TEST_EVENT_ID, "SEAT-XYZ", "kaveh")
    result = reservation_service.try_lock_seat(TEST_EVENT_ID, "seat-xyz", "armina")
    assert result is False


def test_get_lock_owner():
    reservation_service.try_lock_seat(TEST_EVENT_ID, "F6", "kaveh")
    owner = reservation_service.get_lock_owner(TEST_EVENT_ID, "F6")
    assert owner == "kaveh"
    assert reservation_service.get_lock_owner(TEST_EVENT_ID, "G7") is None


def test_lock_requires_authentication():
    response = client.post(
        f"/events/{TEST_EVENT_ID}/seats/lock",
        json={"seat_ids": ["A1"]},
    )
    assert response.status_code == 401


def test_release_requires_authentication():
    response = client.post(
        f"/events/{TEST_EVENT_ID}/seats/release",
        json={"seat_ids": ["A1"]},
    )
    assert response.status_code == 401


def test_checkout_requires_authentication():
    response = client.post(
        f"/events/{TEST_EVENT_ID}/checkout/pay",
        json={"seat_ids": ["A1"]},
    )
    assert response.status_code == 401


def test_admin_dashboard_requires_auth():
    response = client.get("/admin/dashboard")
    assert response.status_code == 401