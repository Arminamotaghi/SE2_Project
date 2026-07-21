import models
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from database import get_db
from auth import get_current_user


router = APIRouter(prefix="/events", tags=["Events"])


class EventCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")  
    title: str
    description: str | None = None
    venue: str | None = None          
    starts_at: datetime               
    price: float | None = 150.00
    total_seats: int | None = 25
    image_url: str | None = None

class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    description: str | None
    venue: str | None = None
    starts_at: datetime              
    price: float | None = None
    is_active: bool

class SeatResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    seat_id: str          
    seat_number: int
    row_name: str
    section_name: str
    price: float
    status: str

@router.get("", response_model=list[EventResponse])
def list_events(db: Session = Depends(get_db)):
    events = db.query(models.Event).filter(models.Event.is_active == True).all()
    result = []
    for e in events:
        venue = db.query(models.Venue).filter(models.Venue.id == e.venue_id).first()
        first_seat = db.query(models.Seat).filter(models.Seat.event_id == e.id).first()
        result.append(EventResponse(
            id=str(e.id),
            title=e.title,
            description=e.description,
            venue=venue.name if venue else None,
            starts_at=e.start_time,
            start_time=e.start_time,
            price=float(first_seat.price) if first_seat else None,
            is_active=e.is_active,
        ))
    return result

@router.get("/{event_id}/seats", response_model=list[SeatResponse])
def get_event_seats(event_id: str, db: Session = Depends(get_db)):
    seats = db.query(models.Seat).filter(
        models.Seat.event_id == event_id
    ).order_by(models.Seat.seat_number).all()
    return [
        SeatResponse(
            seat_id=f"SEAT-{s.seat_number}",   # ⬅️ ساخت seat_id
            seat_number=s.seat_number,
            row_name=s.row_name,
            section_name=s.section_name,
            price=float(s.price),
            status=s.status.value,
        )
        for s in seats
    ]

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

    venue = None
    if payload.venue:
        venue = db.query(models.Venue).filter(
            models.Venue.name == payload.venue
        ).first()

    if venue is None:
        venue = db.query(models.Venue).first()
    if venue is None:
        venue = models.Venue(
            name=payload.venue or "Default Venue",
            address="N/A",
            total_capacity=payload.total_seats or 25,
        )
        db.add(venue)
        db.commit()
        db.refresh(venue)

    event = models.Event(
        title=payload.title,
        description=payload.description,
        venue_id=venue.id,
        organizer_id=current_user.id,
        start_time=payload.starts_at,   
        is_active=True,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    seat_count = payload.total_seats or 25
    seat_price = payload.price or 150.00
    for num in range(1, seat_count + 1):
        row = ((num - 1) // 5) + 1
        seat = models.Seat(
            event_id=event.id,
            section_name="MAIN",
            row_name=str(row),
            seat_number=num,
            price=seat_price,
            status=models.SeatStatus.AVAILABLE,
        )
        db.add(seat)
    db.commit()

    return EventResponse(
        id=str(event.id),
        title=event.title,
        description=event.description,
        venue=venue.name,
        starts_at=event.start_time,
        start_time=event.start_time,
        price=seat_price,
        is_active=event.is_active,
    )