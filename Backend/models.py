import uuid
import enum
from sqlalchemy import (
    Column, String, Integer, DateTime, ForeignKey, Numeric, Enum, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class SeatStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    LOCKED = "LOCKED"
    BOOKED = "BOOKED"


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    CUSTOMER = "CUSTOMER"
    ORGANIZER = "ORGANIZER"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    password_hash = Column(String, nullable=False)


class Venue(Base):
    __tablename__ = "venues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    address = Column(String, nullable=False)
    total_capacity = Column(Integer, nullable=False)

    events = relationship("Event", back_populates="venue")


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(UUID(as_uuid=True), ForeignKey("venues.id"))
    organizer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(String, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)

    venue = relationship("Venue", back_populates="events")
    seats = relationship("Seat", back_populates="event")

class Seat(Base):
    __tablename__ = "seats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"))
    section_name = Column(String(10), nullable=False)
    row_name = Column(String(10), nullable=False)
    seat_number = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(SeatStatus), default=SeatStatus.AVAILABLE)

    event = relationship("Event", back_populates="seats")


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"))
    seat_id = Column(UUID(as_uuid=True), ForeignKey("seats.id"))
    status = Column(String(20), default="PENDING")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reservation_id = Column(UUID(as_uuid=True), ForeignKey("reservations.id"))
    seat_id = Column(UUID(as_uuid=True), ForeignKey("seats.id"))
    unique_code = Column(String, unique=True, nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    is_used = Column(Boolean, default=False)