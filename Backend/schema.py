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


class SeatActionRequest(StrictBaseModel):
    user_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )

    seat_ids: list[str] = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    @field_validator("user_id")
    @classmethod
    def validate_user_id(cls, user_id: str) -> str:
        normalized_user_id = user_id.strip()

        if not normalized_user_id:
            raise ValueError("User ID cannot be empty.")

        return normalized_user_id

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
    reservation_ids: dict[str, str] = Field(default_factory=dict)


class SeatStatusItem(StrictBaseModel):
    seat_id: str
    status: SeatState
    reservation_id: str | None = None


class SeatStatusResponse(StrictBaseModel):
    seats: list[SeatStatusItem]


class CheckoutPaymentRequest(StrictBaseModel):
    reservation_id: str = Field(
        ...,
        min_length=1,
        max_length=150,
    )

    seat_id: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    user_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )

    @field_validator("reservation_id", "user_id")
    @classmethod
    def validate_text_fields(cls, value: str) -> str:
        normalized_value = value.strip()

        if not normalized_value:
            raise ValueError("Field cannot be empty.")

        return normalized_value

    @field_validator("seat_id")
    @classmethod
    def validate_seat_id(cls, seat_id: str) -> str:
        normalized_seat_id = seat_id.strip().upper()

        if not normalized_seat_id:
            raise ValueError("Seat ID cannot be empty.")

        return normalized_seat_id


class CheckoutPaymentResponse(StrictBaseModel):
    message: str
    reservation_id: str
    seat_id: str
    user_id: str
    status: PaymentStatus


class ErrorResponse(StrictBaseModel):
    detail: str