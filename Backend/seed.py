from database import SessionLocal
import models

db = SessionLocal()

venue = models.Venue(name="Main Hall", address="Tehran", total_capacity=25)
db.add(venue)
db.commit()
db.refresh(venue)

for row in range(1, 6):        
    for num in range(1, 6):    
        seat = models.Seat(
            venue_id=venue.id,
            section_name="A",
            row_name=str(row),
            seat_number=num,
            price=150.00,
            status=models.SeatStatus.AVAILABLE
        )
        db.add(seat)

db.commit()
print(f"Created 25 seats (5x5 grid) in venue {venue.id}")
db.close()