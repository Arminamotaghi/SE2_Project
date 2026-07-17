from asyncio import Lock
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

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


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


seat_locks: dict[str, str] = {}
seat_reservations: dict[str, str] = {}
booked_seats: set[str] = set()
seat_locks_guard = Lock()


@app.get(
    "/health",
    tags=["System"],
    summary="Check API health",
)
async def health_check() -> dict[str, str]:
    return {"status": "We good!"}


@app.post(
    "/seats/lock",
    response_model=SeatActionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Seats"],
    summary="Lock seats",
    responses={
        status.HTTP_409_CONFLICT: {
            "model": ErrorResponse,
            "description": "One or more seats are unavailable.",
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
            if seat_id in booked_seats
            or (
                seat_id in seat_locks
                and seat_locks[seat_id] != payload.user_id
            )
        ]

        if conflicting_seats:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "The following seats are unavailable: "
                    + ", ".join(conflicting_seats)
                ),
            )

        reservation_ids: dict[str, str] = {}

        for seat_id in payload.seat_ids:
            seat_locks[seat_id] = payload.user_id

            if seat_id not in seat_reservations:
                seat_reservations[seat_id] = str(uuid4())

            reservation_ids[seat_id] = seat_reservations[seat_id]

    return SeatActionResponse(
        message="Seats locked successfully.",
        seat_ids=payload.seat_ids,
        reservation_ids=reservation_ids,
    )


@app.post(
    "/seats/release",
    response_model=SeatActionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Seats"],
    summary="Release seats",
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
            if seat_id in booked_seats
            or (
                seat_id in seat_locks
                and seat_locks[seat_id] != payload.user_id
            )
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
            seat_reservations.pop(seat_id, None)

    return SeatActionResponse(
        message="Seats released successfully.",
        seat_ids=released_seats,
        reservation_ids={},
    )


@app.get(
    "/seats/status",
    response_model=SeatStatusResponse,
    status_code=status.HTTP_200_OK,
    tags=["Seats"],
    summary="Get seat status",
)
async def get_seats_status(
    user_id: str = Query(
        ...,
        description="Current user identifier",
    ),
    seat_ids: list[str] = Query(
        ...,
        description="List of seat identifiers",
    ),
) -> SeatStatusResponse:
    normalized_user_id = user_id.strip()

    normalized_seat_ids = [
        seat_id.strip().upper()
        for seat_id in seat_ids
    ]

    if not normalized_user_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="User ID cannot be empty.",
        )

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
        seats: list[SeatStatusItem] = []

        for seat_id in normalized_seat_ids:
            reservation_id = None

            if seat_id in booked_seats:
                seat_status = SeatState.BOOKED

            elif seat_id not in seat_locks:
                seat_status = SeatState.AVAILABLE

            elif seat_locks[seat_id] == normalized_user_id:
                seat_status = SeatState.LOCKED_BY_ME
                reservation_id = seat_reservations.get(seat_id)

            else:
                seat_status = SeatState.LOCKED_BY_OTHER

            seats.append(
                SeatStatusItem(
                    seat_id=seat_id,
                    status=seat_status,
                    reservation_id=reservation_id,
                )
            )

    return SeatStatusResponse(seats=seats)


@app.post(
    "/checkout/pay",
    response_model=CheckoutPaymentResponse,
    status_code=status.HTTP_200_OK,
    tags=["Checkout"],
    summary="Process checkout payment",
    responses={
        status.HTTP_403_FORBIDDEN: {
            "model": ErrorResponse,
            "description": "The user does not own the seat lock.",
        },
        status.HTTP_409_CONFLICT: {
            "model": ErrorResponse,
            "description": "The seat is unavailable.",
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ErrorResponse,
            "description": "The payment event could not be published.",
        },
    },
)
async def checkout_pay(
    payload: CheckoutPaymentRequest,
) -> CheckoutPaymentResponse:
    async with seat_locks_guard:
        if payload.seat_id in booked_seats:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The seat has already been booked.",
            )

        lock_owner = seat_locks.get(payload.seat_id)

        if lock_owner != payload.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not own the lock for this seat.",
            )

        reservation_id = seat_reservations.get(payload.seat_id)

        if reservation_id != payload.reservation_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The reservation does not match the selected seat.",
            )

        published = await run_in_threadpool(
            publish_payment_success,
            payload.reservation_id,
            payload.seat_id,
            payload.user_id,
        )

        if not published:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "Payment succeeded, but the event "
                    "could not be published."
                ),
            )

        booked_seats.add(payload.seat_id)
        seat_locks.pop(payload.seat_id, None)
        seat_reservations.pop(payload.seat_id, None)

    return CheckoutPaymentResponse(
        message="Payment processed successfully.",
        reservation_id=payload.reservation_id,
        seat_id=payload.seat_id,
        user_id=payload.user_id,
        status=PaymentStatus.PAID,
    )