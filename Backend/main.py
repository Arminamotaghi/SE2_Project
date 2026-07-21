import models

from fastapi import FastAPI, HTTPException, status, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from tickets import router as tickets_router

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

from reservation_service import try_lock_seat, release_seat, get_lock_owner
from auth import router as auth_router, get_current_user, require_admin
from events import router as events_router

from database import get_db
from sqlalchemy.orm import Session


tags_metadata = [
    {"name": "System", "description": "System health operations."},
    {"name": "Seats", "description": "Seat locking and status operations."},
    {"name": "Checkout", "description": "Payment operations."},
    {"name": "Events", "description": "Event catalog operations."},
]

app = FastAPI(
    title="Online Ticketing API",
    description="API for seat reservations and checkout.",
    version="1.0.0",
    openapi_tags=tags_metadata,
)

app.include_router(auth_router)
app.include_router(events_router)
app.include_router(tickets_router)

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
    "/events/{event_id}/seats/lock",
    response_model=SeatActionResponse,
    tags=["Seats"],
    summary="Lock seats for an event",
    responses={status.HTTP_409_CONFLICT: {"model": ErrorResponse}},
)
def lock_seats(
    event_id: str,
    payload: SeatActionRequest,
    current_user: models.User = Depends(get_current_user),
):
    user_id = str(current_user.id)
    locked_seats = []
    conflicting_seats = []

    for seat_id in payload.seat_ids:
        success = try_lock_seat(event_id, seat_id, user_id)
        if success:
            locked_seats.append(seat_id)
        else:
            conflicting_seats.append(seat_id)

    if conflicting_seats:
        for seat_id in locked_seats:
            release_seat(event_id, seat_id, user_id)
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
    "/events/{event_id}/seats/release",
    response_model=SeatActionResponse,
    tags=["Seats"],
    summary="Release seats",
    responses={status.HTTP_403_FORBIDDEN: {"model": ErrorResponse}},
)
def release_seats(
    event_id: str,
    payload: SeatActionRequest,
    current_user: models.User = Depends(get_current_user),
):
    user_id = str(current_user.id)
    released_seats = []
    forbidden_seats = []

    for seat_id in payload.seat_ids:
        success = release_seat(event_id, seat_id, user_id)
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
    "/events/{event_id}/seats/status",
    response_model=SeatStatusResponse,
    tags=["Seats"],
)
def get_seats_status(
    event_id: str,
    seat_ids: list[str] = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = str(current_user.id)
    seats: list[SeatStatusItem] = []

    for seat_id in seat_ids:
        seat_number = int(seat_id.split("-")[-1])

        db_seat = db.query(models.Seat).filter(
            models.Seat.seat_number == seat_number,
            models.Seat.event_id == event_id
        ).first()

        if db_seat and db_seat.status == models.SeatStatus.BOOKED:
            seats.append(
                SeatStatusItem(seat_id=seat_id, status=SeatState.BOOKED, reservation_id=None)
            )
            continue

        owner = get_lock_owner(event_id, seat_id)

        if owner is None:
            seat_state = SeatState.AVAILABLE
        elif owner == user_id:
            seat_state = SeatState.LOCKED_BY_ME
        else:
            seat_state = SeatState.LOCKED_BY_OTHER

        seats.append(
            SeatStatusItem(seat_id=seat_id, status=seat_state, reservation_id=None)
        )

    return SeatStatusResponse(seats=seats)


@app.post(
    "/events/{event_id}/checkout/pay",
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
    event_id: str,
    payload: CheckoutPaymentRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = str(current_user.id)

    for seat_id in payload.seat_ids:
        seat_number = int(seat_id.split("-")[-1])

        db_seat = db.query(models.Seat).filter(
            models.Seat.seat_number == seat_number,
            models.Seat.event_id == event_id
        ).first()
        if db_seat and db_seat.status == models.SeatStatus.BOOKED:
            raise HTTPException(
                status_code=409,
                detail=f"Seat {seat_id} is already booked.",
            )

        owner = get_lock_owner(event_id, seat_id)
        if owner is None:
            raise HTTPException(
                status_code=409,
                detail=f"Seat {seat_id} is not locked.",
            )
        if owner != user_id:
            raise HTTPException(
                status_code=403,
                detail=f"You do not own seat {seat_id}.",
            )

    for seat_id in payload.seat_ids:
        published = await run_in_threadpool(
            publish_payment_success, "N/A", event_id, seat_id, user_id
        )
        if not published:
            raise HTTPException(
                status_code=503,
                detail=f"Payment event failed for {seat_id}.",
            )

    return CheckoutPaymentResponse(
        message=f"Payment processed for {len(payload.seat_ids)} seats.",
        seat_id=", ".join(payload.seat_ids),
        user_id=user_id,
        reservation_id="N/A",
        status=PaymentStatus.PAID,
    )


@app.get("/admin/dashboard", tags=["Admin"])
def admin_dashboard(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total_seats = db.query(models.Seat).count()
    booked_seats = db.query(models.Seat).filter(
        models.Seat.status == models.SeatStatus.BOOKED
    ).count()
    available_seats = total_seats - booked_seats

    return {
        "total_seats": total_seats,
        "booked_seats": booked_seats,
        "available_seats": available_seats,
        "revenue": booked_seats * 150,
        "occupancy_rate": round(booked_seats / total_seats * 100, 1) if total_seats else 0,
    }