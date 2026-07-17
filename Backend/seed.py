from database import SessionLocal
import models
import uuid

db = SessionLocal()

venue = models.Venue(name="Test Hall", address="Tehran", total_capacity=1)
db.add(venue)
db.commit()
db.refresh(venue)

seat = models.Seat(
    venue_id=venue.id,
    section_name="A",
    row_name="1",
    seat_number=1,
    price=100.00,
    status=models.SeatStatus.LOCKED 
)
db.add(seat)
db.commit()
db.refresh(seat)

print(f"✅ Test Seat Created! Copy this Seat ID: {seat.id}")
db.close()