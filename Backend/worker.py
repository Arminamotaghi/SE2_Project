import pika
import json
from config import settings
from database import SessionLocal
from redis_client import redis_client
import models

def process_payment_message(ch, method, properties, body):
    """
    این تابع هر بار که یک پیام جدید در صف باشد اجرا می‌شود.
    """
    data = json.loads(body)
    seat_id = data.get("seat_id")
    print(f"[Kaveh] Received booking confirmation for seat: {seat_id}")

    db = SessionLocal()
    try:
        seat = db.query(models.Seat).filter(models.Seat.id == seat_id).first()

        if seat:
            seat.status = models.SeatStatus.BOOKED
            db.commit()
            print(f"💾 [Kaveh] Seat {seat_id} marked as BOOKED in PostgreSQL.")

            lock_key = f"seat_lock:{seat_id}"
            redis_client.delete(lock_key)
            print(f"🔓 [Kaveh] Redis lock released for seat {seat_id}.")

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"Error processing message: {e}")
        db.rollback()
    finally:
        db.close()


def start_worker():
    print("🚀 [Kaveh] Worker started. Waiting for payment messages...")
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