import pika
import json
import uuid
import models
import traceback
import time

from config import settings
from database import SessionLocal
from redis_client import redis_client


def process_payment_message(ch, method, properties, body):
    data = json.loads(body)
    seat_id = data.get("seat_id")
    event_id = data.get("event_id")
    print(f"Received booking for event {event_id}, seat: {seat_id}")

    db = SessionLocal()
    try:
        seat_number = int(seat_id.split("-")[-1])

        seat = db.query(models.Seat).filter(
            models.Seat.seat_number == seat_number,
            models.Seat.event_id == event_id
        ).first()

        if seat:
            print(f"Found seat in DB: {seat.id}")
            seat.status = models.SeatStatus.BOOKED
            db.commit()
            print(f"Seat {seat_id} marked as BOOKED.")

            user_id = data.get("user_id")   
            unique_code = str(uuid.uuid4())
            ticket = models.Ticket(
                user_id=user_id,             
                seat_id=seat.id,
                unique_code=unique_code,
                is_used=False
            )
            db.add(ticket)
            db.commit()
            print(f"Ticket generated with code: {unique_code}")

            lock_key = f"seat_lock:{str(event_id).lower()}:{seat_id.lower()}"
            redis_client.delete(lock_key)
            print(f"Redis lock released: {lock_key}")
        else:
            print(f"Seat {seat_id} in event {event_id} NOT FOUND!")

        ch.basic_ack(delivery_tag=method.delivery_tag)
        print("Message acknowledged.")

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        db.rollback()
        ch.basic_ack(delivery_tag=method.delivery_tag)
    finally:
        db.close()


def start_worker():
    connection = None
    max_retries = 10
    for attempt in range(1, max_retries + 1):
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=settings.RABBITMQ_HOST)
            )
            print(f"Connected to RabbitMQ on attempt {attempt}!")
            break
        except pika.exceptions.AMQPConnectionError:
            print(f"RabbitMQ not ready (attempt {attempt}/{max_retries}), retrying in 3s...")
            time.sleep(3)

    if connection is None:
        print("Could not connect to RabbitMQ after all retries. Exiting.")
        return

    channel = connection.channel()
    channel.queue_declare(queue='payment_success_queue', durable=True)

    print("Worker started. Waiting for payment messages...")
    channel.basic_consume(
        queue='payment_success_queue',
        on_message_callback=process_payment_message
    )
    channel.start_consuming()

if __name__ == "__main__":
    start_worker()