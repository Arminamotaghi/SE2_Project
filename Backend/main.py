import models

from fastapi import FastAPI, HTTPException, status, Depends
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

from reservation_service import try_lock_seat, release_seat, get_seat_status, get_lock_owner
from auth import router as auth_router, get_current_user


tags_metadata = [
    {"name": "System", "description": "System health operations."},
    {"name": "Seats", "description": "Seat locking and status operations."},
    {"name": "Checkout", "description": "Payment operations."},
]

app = FastAPI(
    title="Online Ticketing API",
    description="API for seat reservations and checkout.",
    version="1.0.0",
    openapi_tags=tags_metadata,
)

app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"], summary="Check API health")
async def health_check() -> dict[str, str]:
    return {"status": "We good!"}


@app.post(
    "/seats/lock",
    response_model=SeatActionResponse,
    tags=["Seats"],
    summary="Lock seats",
    responses={status.HTTP_409_CONFLICT: {"model": ErrorResponse}},
)
def lock_seats(
    payload: SeatActionRequest,
    current_user: models.User = Depends(get_current_user),
):
    user_id = str(current_user.id)
    locked_seats = []
    conflicting_seats = []

    for seat_id in payload.seat_ids:
        success = try_lock_seat(seat_id, user_id)
        if success:
            locked_seats.append(seat_id)
        else:
            conflicting_seats.append(seat_id)

    if conflicting_seats:
        for seat_id in locked_seats:
            release_seat(seat_id, user_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The following seats are unavailable: " + ", ".join(conflicting_seats),
        )

    return SeatActionResponse(
        message="Seats locked successfully.",
        seat_ids=payload.seat_ids,
        reservation_ids={},
    )


@app.post(
    "/seats/release",
    response_model=SeatActionResponse,
    tags=["Seats"],
    summary="Release seats",
    responses={status.HTTP_403_FORBIDDEN: {"model": ErrorResponse}},
)
def release_seats(
    payload: SeatActionRequest,
    current_user: models.User = Depends(get_current_user),
):
    user_id = str(current_user.id)
    released_seats = []
    forbidden_seats = []

    for seat_id in payload.seat_ids:
        # release_seat فقط اگر صاحبش باشی True برمی‌گرداند
        success = release_seat(seat_id, user_id)
        if success:
            released_seats.append(seat_id)
        else:
            forbidden_seats.append(seat_id)

    if forbidden_seats:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot release these seats: " + ", ".join(forbidden_seats),
        )

    return SeatActionResponse(
        message="Seats released successfully.",
        seat_ids=released_seats,
        reservation_ids={},
    )


@app.get(
    "/seats/status",
    response_model=SeatStatusResponse,
    tags=["Seats"],
    summary="Get seat status",
)
def get_seats_status(
    seat_ids: list[str] = Depends(),  # یا از Query استفاده کن
    current_user: models.User = Depends(get_current_user),
):
    seats: list[SeatStatusItem] = []

    for seat_id in seat_ids:
        status_str = get_seat_status(seat_id)  # AVAILABLE یا LOCKED

        if status_str == "LOCKED":
            seat_state = SeatState.LOCKED_BY_OTHER
        else:
            seat_state = SeatState.AVAILABLE

        seats.append(
            SeatStatusItem(seat_id=seat_id, status=seat_state, reservation_id=None)
        )

    return SeatStatusResponse(seats=seats)


@app.post(
    "/checkout/pay",
    response_model=CheckoutPaymentResponse,
    tags=["Checkout"],
    summary="Process checkout payment",
    responses={
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse},
        status.HTTP_409_CONFLICT: {"model": ErrorResponse},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
    },
)
async def checkout_pay(
    payload: CheckoutPaymentRequest,
    current_user: models.User = Depends(get_current_user),
):
    user_id = str(current_user.id)

    lock_owner = get_lock_owner(payload.seat_id)

    if lock_owner is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This seat is not locked or has already been booked.",
        )

    if lock_owner != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own the lock for this seat.",
        )

    published = await run_in_threadpool(
        publish_payment_success,
        "N/A",
        payload.seat_id,
        user_id,
    )

    if not published:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment succeeded, but event could not be published.",
        )

    return CheckoutPaymentResponse(
        message="Payment processed successfully.",
        reservation_id="N/A",
        seat_id=payload.seat_id,
        user_id=user_id,
        status=PaymentStatus.PAID,
    )