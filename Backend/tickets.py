import models

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from database import get_db
from auth import get_current_user


router = APIRouter(prefix="/tickets", tags=["Tickets"])


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    unique_code: str
    seat_number: int
    row_name: str
    section_name: str
    event_title: str
    is_used: bool


@router.post("/validate/{unique_code}")
def validate_ticket(
    unique_code: str,
    db: Session = Depends(get_db),
):
    ticket = db.query(models.Ticket).filter(
        models.Ticket.unique_code == unique_code
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Invalid ticket")

    if ticket.is_used:
        raise HTTPException(status_code=409, detail="Ticket already used")

    ticket.is_used = True
    db.commit()

    return {"message": "Ticket valid. Access granted.", "code": unique_code}

@router.get("/my", response_model=list[TicketResponse])
def get_my_tickets(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tickets = db.query(models.Ticket).filter(
        models.Ticket.user_id == current_user.id   # ⬅️ فقط بلیت‌های خود کاربر
    ).all()

    result = []
    for t in tickets:
        seat = db.query(models.Seat).filter(models.Seat.id == t.seat_id).first()
        event = db.query(models.Event).filter(models.Event.id == seat.event_id).first()
        result.append(
            TicketResponse(
                unique_code=t.unique_code,
                seat_number=seat.seat_number,
                row_name=seat.row_name,
                section_name=seat.section_name,
                event_title=event.title,
                is_used=t.is_used,
            )
        )
    return result