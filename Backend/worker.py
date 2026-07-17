import pika
import json
import models
import traceback 

from config import settings
from database import SessionLocal
from redis_client import redis_client


def process_payment_message(ch, method, properties, body):
    data = json.loads(body)
    seat_id = data.get("seat_id")
    print(f"Received booking for seat: {seat_id}")

    db = SessionLocal()
    try:
        seat_number = int(seat_id.split("-")[-1])
        print(f"Looking for seat number: {seat_number}")

        seat = db.query(models.Seat).filter(
            models.Seat.seat_number == seat_number
        ).first()

        if seat:
            print(f"Found seat in DB: {seat.id}") 
            seat.status = models.SeatStatus.BOOKED
            db.commit()
            print(f"Seat {seat_id} marked as BOOKED.")

            from redis_client import redis_client
            redis_client.delete(f"seat_lock:{seat_id.lower()}")
            print(f"Redis lock released for {seat_id}.")
        else:
            print(f"Seat {seat_id} NOT FOUND in database!")

        ch.basic_ack(delivery_tag=method.delivery_tag)
        print(f"Message acknowledged.")  

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        db.rollback()
        ch.basic_ack(delivery_tag=method.delivery_tag)
    finally:
        db.close()

def start_worker():
    print("Worker started. Waiting for payment messages...")
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=settings.RABBITMQ_HOST)
    )
    channel = connection.channel()
    channel.queue_declare(queue='payment_success_queue', durable=True)

    channel.basic_consume(
        queue='payment_success_queue',
        on_message_callback=process_payment_message
    )
    channel.start_consuming()


if __name__ == "__main__":
    start_worker()