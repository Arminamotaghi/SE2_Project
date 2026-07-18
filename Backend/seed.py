import models

from database import SessionLocal
from security import get_password_hash

db = SessionLocal()

print("Deleting old data...")
db.query(models.Reservation).delete()
db.query(models.Seat).delete()
db.query(models.Event).delete()
db.query(models.Venue).delete()
db.commit()

venue = models.Venue(name="Main Hall", address="Tehran", total_capacity=25)
db.add(venue)
db.commit()
db.refresh(venue)

print("Creating 25 seats...")
for num in range(1, 26):  
    row = ((num - 1) // 5) + 1
    seat = models.Seat(
        venue_id=venue.id,
        section_name="MAIN",
        row_name=str(row),
        seat_number=num,     
        price=150.00,
        status=models.SeatStatus.AVAILABLE
    )
    db.add(seat)

db.commit()
print(f"Created 25 seats (numbered 1-25) successfully!")

admin_user = models.User(
    username="admin",
    email="admin@test.com",
    password_hash=get_password_hash("admin123"),
    role=models.UserRole.ADMIN
)
db.add(admin_user)
db.commit()
print("Admin created (username: admin, password: admin123)")

db.close()