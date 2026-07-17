import json

import pika

from config import settings


def publish_payment_success(
    reservation_id: str,
    seat_id: str,
    user_id: str,
) -> bool:
    connection = None

    try:
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=settings.RABBITMQ_HOST,
            )
        )

        channel = connection.channel()

        channel.queue_declare(
            queue="payment_success_queue",
            durable=True,
        )

        message_body = json.dumps(
            {
                "reservation_id": reservation_id,
                "seat_id": seat_id,
                "user_id": user_id,
                "status": "PAID",
            }
        )

        channel.basic_publish(
            exchange="",
            routing_key="payment_success_queue",
            body=message_body,
            properties=pika.BasicProperties(
                delivery_mode=2,
                content_type="application/json",
            ),
        )

        return True

    except Exception as error:
        print(f"Failed to publish payment message: {error}")
        return False

    finally:
        if connection is not None and connection.is_open:
            connection.close()