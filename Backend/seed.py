import models
from datetime import datetime, timedelta

from database import SessionLocal
from security import get_password_hash

db = SessionLocal()

print("Deleting old data...")
db.query(models.Ticket).delete()
db.query(models.Reservation).delete()
db.query(models.Seat).delete()
db.query(models.Event).delete()
db.query(models.Venue).delete()
db.query(models.User).delete()
db.commit()

admin_user = models.User(
    username="admin",
    email="admin@test.com",
    password_hash=get_password_hash("admin123"),
    role=models.UserRole.ADMIN
)
organizer_user = models.User(
    username="organizer",
    email="organizer@test.com",
    password_hash=get_password_hash("organizer123"),
    role=models.UserRole.ORGANIZER
)
db.add(admin_user)
db.add(organizer_user)
db.commit()
db.refresh(organizer_user)
print("Users created (admin/admin123, organizer/organizer123)")

venue = models.Venue(name="Main Hall", address="Tehran", total_capacity=25)
db.add(venue)
db.commit()
db.refresh(venue)

events_data = [
    {"title": "Rock Concert", "days": 7, "price": 150.00},
    {"title": "Theater Play", "days": 14, "price": 100.00},
]

for ev in events_data:
    event = models.Event(
        venue_id=venue.id,
        organizer_id=organizer_user.id,
        title=ev["title"],
        description=f"An amazing {ev['title']}!",
        start_time=datetime.now() + timedelta(days=ev["days"]),
        is_active=True
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    print(f"Creating 25 seats for '{ev['title']}'...")
    for num in range(1, 26):
        row = ((num - 1) // 5) + 1
        seat = models.Seat(
            event_id=event.id,
            section_name="MAIN",
            row_name=str(row),
            seat_number=num,
            price=ev["price"],
            status=models.SeatStatus.AVAILABLE
        )
        db.add(seat)
    db.commit()
    print(f"  -> Created 25 seats for '{ev['title']}'")

print("Seeding complete!")
db.close()