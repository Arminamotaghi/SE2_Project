import {
  useEffect,
  useState,
} from "react";
import axios from "axios";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { getEvent } from "../api/eventApi";
import SeatMap from "../components/SeatMap";
import "./EventSeatsPage.css";

const DEFAULT_SEAT_PRICE = 150;

function formatEventDate(event) {
  const dateValue =
    event?.starts_at ??
    event?.start_time ??
    event?.date;

  if (!dateValue) {
    return "Date not specified";
  }

  const parsedDate = new Date(
    dateValue
  );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return String(dateValue);
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "full",
      timeStyle: "short",
    }
  ).format(parsedDate);
}

function EventSeatsPage() {
  const navigate = useNavigate();
  const { id: eventId } =
    useParams();

  const [event, setEvent] =
    useState(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadEvent() {
      if (!eventId) {
        setErrorMessage(
          "The event identifier is missing."
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const responseData =
          await getEvent(eventId);

        const loadedEvent =
          responseData?.event ??
          responseData;

        if (
          !loadedEvent ||
          typeof loadedEvent !==
            "object"
        ) {
          throw new Error(
            "Invalid event response."
          );
        }

        if (isActive) {
          setEvent(loadedEvent);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (
          axios.isAxiosError(error) &&
          error.response?.status ===
            404
        ) {
          setErrorMessage(
            "The requested event was not found."
          );
        } else {
          const detail =
            axios.isAxiosError(error)
              ? error.response?.data
                  ?.detail
              : null;

          setErrorMessage(
            typeof detail === "string"
              ? detail
              : "Could not load event."
          );
        }

        setEvent(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      isActive = false;
    };
  }, [eventId]);

  if (isLoading) {
    return (
      <main className="event-seats-page">
        <div className="event-seats-loading">
          Loading event...
        </div>
      </main>
    );
  }

  if (errorMessage || !event) {
    return (
      <main className="event-seats-page">
        <div className="event-seats-error">
          <p>
            {errorMessage ||
              "Event not found."}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/events")
            }
          >
            Back to Events
          </button>
        </div>
      </main>
    );
  }

  const eventTitle =
    event.title ??
    event.name ??
    "Untitled Event";

  const eventVenue =
    event.venue ??
    event.location ??
    "Venue not specified";

  const parsedPrice = Number(
    event.price ??
      event.seat_price ??
      DEFAULT_SEAT_PRICE
  );

  const eventPrice =
    Number.isFinite(parsedPrice) &&
    parsedPrice >= 0
      ? parsedPrice
      : DEFAULT_SEAT_PRICE;

  return (
    <main className="event-seats-page">
      <header className="event-seats-toolbar">
        <button
          type="button"
          onClick={() =>
            navigate("/events")
          }
        >
          Back to Events
        </button>

        <div>
          <span>
            Selecting seats for
          </span>

          <strong>
            {eventTitle}
          </strong>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/my-tickets")
          }
        >
          My Tickets
        </button>
      </header>

      <section className="event-information">
        <p>Current Event</p>

        <h1>{eventTitle}</h1>

        {event.description && (
          <p className="event-detail-description">
            {event.description}
          </p>
        )}

        <div className="event-information-details">
          <span>{eventVenue}</span>

          <span>
            {formatEventDate(event)}
          </span>

          <span>
            {eventPrice.toLocaleString()}
            {" Toman per seat"}
          </span>
        </div>
      </section>

      <SeatMap
        eventId={eventId}
        seatPrice={eventPrice}
      />
    </main>
  );
}

export default EventSeatsPage;