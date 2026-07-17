from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SeatState(str, Enum):
    AVAILABLE = "AVAILABLE"
    LOCKED_BY_ME = "LOCKED_BY_ME"
    LOCKED_BY_OTHER = "LOCKED_BY_OTHER"
    BOOKED = "BOOKED"


class PaymentStatus(str, Enum):
    PAID = "PAID"


# --- درخواست قفل/آزادسازی (user_id حذف شد چون از کوکی می‌آید) ---
class SeatActionRequest(StrictBaseModel):
    seat_ids: list[str] = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    @field_validator("seat_ids")
    @classmethod
    def validate_seat_ids(cls, seat_ids: list[str]) -> list[str]:
        normalized_seat_ids = [
            seat_id.strip().upper()
            for seat_id in seat_ids
        ]

        if any(not seat_id for seat_id in normalized_seat_ids):
            raise ValueError("Seat identifiers cannot be empty.")

        if len(normalized_seat_ids) != len(set(normalized_seat_ids)):
            raise ValueError("Duplicate seat identifiers are not allowed.")

        return normalized_seat_ids


class SeatActionResponse(StrictBaseModel):
    message: str
    seat_ids: list[str]
    reservation_ids: dict[str, str] = {}


class SeatStatusItem(StrictBaseModel):
    seat_id: str
    status: SeatState
    reservation_id: str | None = None


class SeatStatusResponse(StrictBaseModel):
    seats: list[SeatStatusItem]


# --- درخواست پرداخت (user_id و reservation_id حذف شدند) ---
class CheckoutPaymentRequest(StrictBaseModel):
    seat_id: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    @field_validator("seat_id")
    @classmethod
    def validate_seat_id(cls, seat_id: str) -> str:
        normalized_seat_id = seat_id.strip().upper()

        if not normalized_seat_id:
            raise ValueError("Seat ID cannot be empty.")

        return normalized_seat_id


# --- پاسخ پرداخت (user_id و reservation_id اختیاری شدند) ---
class CheckoutPaymentResponse(StrictBaseModel):
    message: str
    seat_id: str
    user_id: str
    reservation_id: str = "N/A"
    status: PaymentStatus


class ErrorResponse(StrictBaseModel):
    detail: str