# 🎟️ Event Ticketing Platform

A distributed event ticketing platform designed for flash-sale traffic, where many users try to book the same seats at once. Seats are reserved with atomic Redis locks so a seat can never be sold twice, and payments are processed asynchronously through a message queue.

Built for the Software Engineering 2 course at Amirkabir University of Technology.

## 🚀 Tech Stack

| Layer | Technology |
| --- | --- |
| Backend API | Python, FastAPI, SQLAlchemy, Pydantic |
| Frontend | React, Vite, React Router, Axios |
| Database | PostgreSQL |
| Seat locks | Redis |
| Message broker | RabbitMQ |
| Auth | JWT in HttpOnly cookies, bcrypt password hashing |
| Infrastructure | Docker Compose, GitHub Actions; Terraform sketch for AWS (`main.tf`) |
| Testing | pytest, fakeredis, mutmut (mutation testing) |

## 🏗️ Architecture

```
            ┌──────────┐      ┌────────────────┐      ┌────────────┐
 Browser ──►│ Frontend │ ───► │  FastAPI API   │ ───► │ PostgreSQL │
            │  (React) │      │                │      └────────────┘
            └──────────┘      │  seat locks ───┼────► Redis (SET NX + TTL)
                              │  checkout   ───┼────► RabbitMQ
                              └────────────────┘          │
                                                          ▼
                                                 ┌────────────────┐
                                                 │ Payment worker │──► PostgreSQL, Redis
                                                 └────────────────┘
```

### Booking flow

1. **Lock:** the user selects seats, and the API locks each one in Redis with `SET key value NX EX <ttl>`. Only one request can create the key, so concurrent requests for the same seat get `409 Conflict`. Locks expire after `SEAT_LOCK_TTL_SECONDS` if the user never pays.
2. **Checkout:** the API checks that every seat is still locked by this user and not already booked, then publishes a payment message to the durable `payment_success_queue` in RabbitMQ.
3. **Worker:** a separate worker process consumes the message, marks the seat `BOOKED` in PostgreSQL, creates a ticket with a unique code and releases the Redis lock. If anything fails, the database transaction is rolled back.
4. **Entry:** at the venue, the ticket code is validated once; a reused code is rejected.

### Roles

- **Customer:** browse events, lock seats, pay, view own tickets.
- **Organizer:** everything a customer can do, plus create events.
- **Admin:** everything above, plus the admin dashboard (seat and booking statistics).

## 📡 API Overview

Interactive docs are served by FastAPI at `http://localhost:8000/docs`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Create a customer account |
| `POST` | `/auth/login` | Log in (sets the JWT cookie) |
| `POST` | `/auth/logout` | Log out |
| `GET` | `/auth/me` | Current user |
| `GET` | `/events` | List events |
| `POST` | `/events` | Create an event (organizer/admin) |
| `GET` | `/events/{event_id}` | Event details |
| `GET` | `/events/{event_id}/seats` | Seat map of an event |
| `POST` | `/events/{event_id}/seats/lock` | Lock seats |
| `POST` | `/events/{event_id}/seats/release` | Release your locked seats |
| `GET` | `/events/{event_id}/seats/status` | Seat status (available, locked by me, locked by others, booked) |
| `POST` | `/events/{event_id}/checkout/pay` | Pay for locked seats |
| `GET` | `/tickets/my` | Your tickets |
| `POST` | `/tickets/validate/{unique_code}` | Validate a ticket at entry |
| `GET` | `/admin/dashboard` | Admin statistics |
| `GET` | `/health` | Health check |

## ⚙️ How to Run

**Prerequisites:** Docker and Docker Compose.

```bash
git clone https://github.com/Arminamotaghi/SE2_Project.git
cd SE2_Project

# create the backend config, then set POSTGRES_PASSWORD and SECRET_KEY in it
cp Backend/.env.example Backend/.env

# build and start all services, create the tables and load sample data
make setup
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API + docs | http://localhost:8000/docs |
| RabbitMQ dashboard | http://localhost:15672 (guest / guest) |

The sample data includes an event in a 25-seat hall and two accounts:

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Organizer | `organizer` | `organizer123` |

Other `make` targets: `up`, `down`, `logs`, `reset` (wipe the database and set up again) and `test`.

## 🧪 Testing

**Unit tests** use FastAPI's `TestClient` and `fakeredis`, so they need no running services:

```bash
cd Backend
pip install -r requirements.txt
pytest test_main.py -v
```

They cover locking, double-lock prevention, seat status, release by owner only, case-insensitive seat IDs, and authentication on protected endpoints. They run on every push through GitHub Actions (`.github/workflows/ci-cd.yaml`).

**Mutation testing** with [mutmut](https://github.com/boxed/mutmut) checks that the tests actually catch bugs in `reservation_service.py` (configured in `setup.cfg`):

```bash
cd Backend
pip install mutmut
mutmut run
mutmut results
```

**Load test:** `Backend/load_test.py` sends 100 concurrent lock requests for the same seat and passes only if exactly one succeeds.

```bash
cd Backend
python load_test.py
```

## 👥 Team

- **Kaveh Ahmadi** ([@lKavehamdl](https://github.com/lKavehamdl)): backend (seat locking, checkout, payment worker, models, seeding, admin API), tests, mutation testing, CI/CD, Docker setup and documentation
- **Armina Motaghi** ([@Arminamotaghi](https://github.com/Arminamotaghi)): React frontend and backend schema/API work
