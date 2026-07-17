import pika
import json
from config import settings
from database import SessionLocal
from redis_client import redis_client
import models

def process_payment_message(ch, method, properties, body):
    data = json.loads(body)
    seat_id = data.get("seat_id")  # مثلا "A-1-5"
    print(f"📥 Received booking for seat: {seat_id}")

    db = SessionLocal()
    try:
        parts = seat_id.split("-")
        section = parts[0]      
        row = parts[1]          
        number = int(parts[2]) 

        seat = db.query(models.Seat).filter(
            models.Seat.section_name == section,
            models.Seat.row_name == row,
            models.Seat.seat_number == number
        ).first()

        if seat:
            seat.status = models.SeatStatus.BOOKED
            db.commit()
            print(f"💾 Seat {seat_id} marked as BOOKED.")

            # آزاد کردن قفل Redis
            from redis_client import redis_client
            redis_client.delete(f"seat_lock:{seat_id.lower()}")
            print(f"🔓 Redis lock released for {seat_id}.")

        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print(f"❌ Error: {e}")
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