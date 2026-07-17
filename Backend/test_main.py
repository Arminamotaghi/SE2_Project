import pytest
import fakeredis
from fastapi.testclient import TestClient

import redis_client
import reservation_service
from main import app

client = TestClient(app)

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
    result = reservation_service.try_lock_seat("A1", "kaveh")
    assert result is True


def test_prevent_double_locking():
    first_attempt = reservation_service.try_lock_seat("B2", "kaveh")
    second_attempt = reservation_service.try_lock_seat("B2", "armina")

    assert first_attempt is True 
    assert second_attempt is False 


def test_seat_status_changes():
    assert reservation_service.get_seat_status("C3") == "AVAILABLE"
    reservation_service.try_lock_seat("C3", "kaveh")
    assert reservation_service.get_seat_status("C3") == "LOCKED"


def test_release_seat_by_owner():
    reservation_service.try_lock_seat("D4", "kaveh")
    result = reservation_service.release_seat("D4", "kaveh")
    assert result is True
    assert reservation_service.get_seat_status("D4") == "AVAILABLE"


def test_cannot_release_others_seat():
    reservation_service.try_lock_seat("E5", "kaveh")
    result = reservation_service.release_seat("E5", "armina")
    assert result is False  # نباید موفق شود


def test_case_insensitivity():
    reservation_service.try_lock_seat("SEAT-XYZ", "kaveh")
    result = reservation_service.try_lock_seat("seat-xyz", "armina")
    assert result is False  # باید شکست بخورد چون در واقع همان صندلی است