from asyncio import Lock

from fastapi import FastAPI, HTTPException, Query, status

from payment_publisher import publish_payment_success
from schema import (
    CheckoutPaymentRequest,
    CheckoutPaymentResponse,
    ErrorResponse,
    PaymentStatus,
    SeatActionRequest,
    SeatActionResponse,
    SeatState,
    SeatStatusItem,
    SeatStatusResponse,
)


tags_metadata = [
    {
        "name": "System",
        "description": "System health and availability operations.",
    },
    {
        "name": "Seats",
        "description": "Seat locking, releasing, and status operations.",
    },
    {
        "name": "Checkout",
        "description": "Payment and checkout operations.",
    },
]


app = FastAPI(
    title="Online Ticketing API",
    description=(
        "API service for seat reservations, checkout, "
        "and payment event publishing."
    ),
    version="1.0.0",
    openapi_tags=tags_metadata,
)


seat_locks: dict[str, str] = {}
seat_locks_guard = Lock()


@app.get(
    "/health",
    tags=["System"],
    summary="Check API health",
    description="Checks whether the API service is running.",
)
async def health_check() -> dict[str, str]:
    return {"status": "We good!"}


@app.post(
    "/seats/lock",
    response_model=SeatActionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Seats"],
    summary="Lock seats",
    description=(
        "Locks one or more seats for a user. "
        "Returns 409 Conflict when a requested seat "
        "is already locked by another user."
    ),
    responses={
        status.HTTP_409_CONFLICT: {
            "model": ErrorResponse,
            "description": "One or more seats are locked by another user.",
        },
    },
)
async def lock_seats(
    payload: SeatActionRequest,
) -> SeatActionResponse:
    async with seat_locks_guard:
        conflicting_seats = [
            seat_id
            for seat_id in payload.seat_ids
            if seat_id in seat_locks
            and seat_locks[seat_id] != payload.user_id
        ]

        if conflicting_seats:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "The following seats are already locked: "
                    + ", ".join(conflicting_seats)
                ),
            )

        for seat_id in payload.seat_ids:
            seat_locks[seat_id] = payload.user_id

    return SeatActionResponse(
        message="Seats locked successfully.",
        seat_ids=payload.seat_ids,
    )


@app.post(
    "/seats/release",
    response_model=SeatActionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Seats"],
    summary="Release seats",
    description=(
        "Releases one or more seats locked by the requesting user. "
        "Returns 403 Forbidden when the user attempts to release "
        "a seat locked by another user."
    ),
    responses={
        status.HTTP_403_FORBIDDEN: {
            "model": ErrorResponse,
            "description": "The user does not own one or more seat locks.",
        },
    },
)
async def release_seats(
    payload: SeatActionRequest,
) -> SeatActionResponse:
    async with seat_locks_guard:
        forbidden_seats = [
            seat_id
            for seat_id in payload.seat_ids
            if seat_id in seat_locks
            and seat_locks[seat_id] != payload.user_id
        ]

        if forbidden_seats:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You are not allowed to release these seats: "
                    + ", ".join(forbidden_seats)
                ),
            )

        released_seats = [
            seat_id
            for seat_id in payload.seat_ids
            if seat_locks.get(seat_id) == payload.user_id
        ]

        for seat_id in released_seats:
            seat_locks.pop(seat_id, None)

    return SeatActionResponse(
        message="Seats released successfully.",
        seat_ids=released_seats,
    )


@app.get(
    "/seats/status",
    response_model=SeatStatusResponse,
    status_code=status.HTTP_200_OK,
    tags=["Seats"],
    summary="Get seat status",
    description=(
        "Returns the current status of one or more seats. "
        "Seat identifiers must be provided as query parameters."
    ),
)
async def get_seats_status(
    seat_ids: list[str] = Query(
        ...,
        description="List of seat identifiers",
    ),
) -> SeatStatusResponse:
    normalized_seat_ids = [
        seat_id.strip().upper()
        for seat_id in seat_ids
    ]

    if any(not seat_id for seat_id in normalized_seat_ids):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Seat identifiers cannot be empty.",
        )

    if len(normalized_seat_ids) != len(set(normalized_seat_ids)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Duplicate seat identifiers are not allowed.",
        )

    async with seat_locks_guard:
        seats = [
            SeatStatusItem(
                seat_id=seat_id,
                status=(
                    SeatState.LOCKED
                    if seat_id in seat_locks
                    else SeatState.AVAILABLE
                ),
            )
            for seat_id in normalized_seat_ids
        ]

    return SeatStatusResponse(seats=seats)


@app.post(
    "/checkout/pay",
    response_model=CheckoutPaymentResponse,
    status_code=status.HTTP_200_OK,
    tags=["Checkout"],
    summary="Process checkout payment",
    description=(
        "Processes a successful payment and publishes "
        "a payment success event to RabbitMQ."
    ),
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ErrorResponse,
            "description": "The payment event could not be published.",
        },
    },
)
def checkout_pay(
    payload: CheckoutPaymentRequest,
) -> CheckoutPaymentResponse:
    published = publish_payment_success(
        reservation_id=payload.reservation_id,
        seat_id=payload.seat_id,
        user_id=payload.user_id,
    )

    if not published:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment succeeded, but the event could not be published.",
        )

    return CheckoutPaymentResponse(
        message="Payment processed successfully.",
        reservation_id=payload.reservation_id,
        seat_id=payload.seat_id,
        user_id=payload.user_id,
        status=PaymentStatus.PAID,
    )