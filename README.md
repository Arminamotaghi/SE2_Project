# 🎟️ End-to-End Event Ticketing Platform

A scalable, distributed event ticketing platform built with a microservices architecture. Designed to handle high-concurrency traffic spikes (Flash Sales) while preventing double-booking.

## 🚀 Tech Stack
- **Backend:** Python (FastAPI)
- **Frontend:** React (Vite)
- **Database:** PostgreSQL (Persistent Storage)
- **Cache & Locks:** Redis (Distributed Locking)
- **Message Broker:** RabbitMQ (Async Communication)
- **Infrastructure:** Docker & Docker Compose

## ✨ Key Features
- **Atomic Seat Locking:** Prevents race conditions using Redis `SET NX`.
- **Distributed Sagas:** Handles payment and rollback asynchronously.
- **Load Tested:** Verified to handle 100+ concurrent requests on a single seat.

## 📋 Prerequisites
- Docker & Docker Compose
- Python 3.10+

## ⚙️ How to Run

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd SE2_Project