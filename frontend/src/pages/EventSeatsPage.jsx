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
const DEFAULT_TOTAL_SEATS = 25;

function getErrorDetail(error, fallbackMessage) {
  if (!axios.isAxiosError(error)) {
    return fallbackMessage;
  }

  const detail = error.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg)
      .filter(Boolean)
      .join(", ");
  }

  return fallbackMessage;
}

function normalizePositiveNumber(
  value,
  fallbackValue
) {
  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue <= 0
  ) {
    return fallbackValue;
  }

  return parsedValue;
}

function normalizePositiveInteger(
  value,
  fallbackValue
) {
  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue <= 0
  ) {
    return fallbackValue;
  }

  return parsedValue;
}

function EventSeatsPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [event, setEvent] = useState(null);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadEvent() {
      if (!eventId) {
        if (isMounted) {
          setEvent(null);
          setErrorMessage(
            "The event identifier is missing."
          );
          setIsLoading(false);
        }

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
          typeof loadedEvent !== "object"
        ) {
          throw new Error(
            "Invalid event response."
          );
        }

        if (isMounted) {
          setEvent(loadedEvent);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (
          axios.isAxiosError(error) &&
          error.response?.status === 404
        ) {
          setErrorMessage(
            "The requested event was not found."
          );
        } else if (
          axios.isAxiosError(error) &&
          error.response?.status === 401
        ) {
          setErrorMessage(
            "Your session has expired. Please log in again."
          );
        } else {
          setErrorMessage(
            getErrorDetail(
              error,
              "Could not load event."
            )
          );
        }

        setEvent(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      isMounted = false;
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
    event.title ||
    event.name ||
    "Untitled Event";

  const eventVenue =
    event.venue ??
    event.location ??
    "Venue not specified";

  const seatPrice =
    normalizePositiveNumber(
      event.price ??
        event.seat_price ??
        event.seatPrice,
      DEFAULT_SEAT_PRICE
    );

  const totalSeats =
    normalizePositiveInteger(
      event.total_seats ??
        event.totalSeats ??
        event.seat_count ??
        event.seatCount,
      DEFAULT_TOTAL_SEATS
    );

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
          <span>Selecting seats for</span>
          <strong>{eventTitle}</strong>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/tickets")
          }
        >
          My Tickets
        </button>
      </header>

      <section className="event-information">
        <p>Current Event</p>

        <h1>{eventTitle}</h1>

        <div className="event-information-details">
          <span>{eventVenue}</span>

          <span>
            {seatPrice.toLocaleString()}
            {" Toman per seat"}
          </span>

          <span>
            {totalSeats.toLocaleString()}
            {" seats"}
          </span>
        </div>
      </section>

      <SeatMap
        eventId={eventId}
        seatPrice={seatPrice}
        totalSeats={totalSeats}
      />
    </main>
  );
}

export default EventSeatsPage;