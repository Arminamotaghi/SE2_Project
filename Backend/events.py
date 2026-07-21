import models
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from database import get_db
from auth import get_current_user


router = APIRouter(prefix="/events", tags=["Events"])


class EventCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    description: str | None = None
    venue_id: str
    start_time: datetime


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    description: str | None
    start_time: datetime
    is_active: bool


class SeatResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    seat_number: int
    row_name: str
    section_name: str
    price: float
    status: str


# --- List all events (public) ---
@router.get("", response_model=list[EventResponse])
def list_events(db: Session = Depends(get_db)):
    events = db.query(models.Event).filter(models.Event.is_active == True).all()
    return [
        EventResponse(
            id=str(e.id),
            title=e.title,
            description=e.description,
            start_time=e.start_time,
            is_active=e.is_active,
        )
        for e in events
    ]


@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventResponse(
        id=str(event.id),
        title=event.title,
        description=event.description,
        start_time=event.start_time,
        is_active=event.is_active,
    )


@router.get("/{event_id}/seats", response_model=list[SeatResponse])
def get_event_seats(event_id: str, db: Session = Depends(get_db)):
    seats = db.query(models.Seat).filter(
        models.Seat.event_id == event_id
    ).order_by(models.Seat.seat_number).all()
    return [
        SeatResponse(
            seat_number=s.seat_number,
            row_name=s.row_name,
            section_name=s.section_name,
            price=float(s.price),
            status=s.status.value,
        )
        for s in seats
    ]


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (models.UserRole.ORGANIZER, models.UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only organizers can create events")

    event = models.Event(
        title=payload.title,
        description=payload.description,
        venue_id=payload.venue_id,
        organizer_id=current_user.id,
        start_time=payload.start_time,
        is_active=True,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # ساخت خودکار ۲۵ صندلی برای رویداد جدید
    for num in range(1, 26):
        row = ((num - 1) // 5) + 1
        seat = models.Seat(
            event_id=event.id,
            section_name="MAIN",
            row_name=str(row),
            seat_number=num,
            price=150.00,
            status=models.SeatStatus.AVAILABLE,
        )
        db.add(seat)
    db.commit()

    return EventResponse(
        id=str(event.id),
        title=event.title,
        description=event.description,
        start_time=event.start_time,
        is_active=event.is_active,
    )