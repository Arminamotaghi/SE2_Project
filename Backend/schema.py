from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SeatState(str, Enum):
    AVAILABLE = "available"
    LOCKED = "locked"


class SeatActionRequest(StrictBaseModel):
    user_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique identifier of the user",
        examples=["user-123"],
    )

    seat_ids: list[str] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="List of seat identifiers",
        examples=[["A1", "A2"]],
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

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "user_id": "user-123",
                    "seat_ids": ["A1", "A2"],
                }
            ]
        },
    )


class SeatActionResponse(StrictBaseModel):
    message: str = Field(
        ...,
        description="Operation result message",
        examples=["Seats locked successfully."],
    )

    seat_ids: list[str] = Field(
        ...,
        description="List of affected seat identifiers",
        examples=[["A1", "A2"]],
    )


class SeatStatusItem(StrictBaseModel):
    seat_id: str = Field(
        ...,
        description="Seat identifier",
        examples=["A1"],
    )

    status: SeatState = Field(
        ...,
        description="Current seat status",
        examples=[SeatState.AVAILABLE],
    )


class SeatStatusResponse(StrictBaseModel):
    seats: list[SeatStatusItem] = Field(
        ...,
        description="Status information for requested seats",
    )


class ErrorResponse(StrictBaseModel):
    detail: str = Field(
        ...,
        description="Error description",
        examples=["One or more seats are already locked."],
    )