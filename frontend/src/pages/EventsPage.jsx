import {
  useCallback,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { getEvents } from "../api/eventApi";
import { useAuth } from "../auth/AuthContext";
import "./EventsPage.css";

function normalizeEvents(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (
    Array.isArray(responseData?.events)
  ) {
    return responseData.events;
  }

  return [];
}

function getEventId(event) {
  return (
    event?.event_id ??
    event?.id
  );
}

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
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(parsedDate);
}

function EventsPage() {
  const navigate = useNavigate();

  const {
    username,
    isAdmin,
    isOrganizer,
    logout,
  } = useAuth();

  const [events, setEvents] =
    useState([]);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] = useState(false);

  const loadEvents = useCallback(
    async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const responseData =
          await getEvents();

        setEvents(
          normalizeEvents(responseData)
        );
      } catch (error) {
        const detail =
          axios.isAxiosError(error)
            ? error.response?.data
                ?.detail
            : null;

        setErrorMessage(
          typeof detail === "string"
            ? detail
            : "Could not load events."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();

      navigate("/login", {
        replace: true,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <main className="events-page">
      <header className="events-toolbar">
        <div className="events-brand">
          <span>TicketFlow</span>
          <strong>
            Discover Events
          </strong>
        </div>

        <nav className="events-navigation">
          <span className="events-user">
            {username}
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/my-tickets")
            }
          >
            My Tickets
          </button>

          {isOrganizer && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/organizer/create"
                )
              }
            >
              Create Event
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() =>
                navigate("/admin")
              }
            >
              Admin Panel
            </button>
          )}

          <button
            type="button"
            className="events-logout"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut
              ? "Logging Out..."
              : "Logout"}
          </button>
        </nav>
      </header>

      <section className="events-container">
        <div className="events-hero">
          <div>
            <p className="events-eyebrow">
              Upcoming Experiences
            </p>

            <h1>
              Find your next event
            </h1>

            <p>
              Browse upcoming concerts,
              conferences, performances and
              special events.
            </p>
          </div>

          <button
            type="button"
            className="events-refresh"
            onClick={loadEvents}
          >
            Refresh Events
          </button>
        </div>

        {errorMessage && (
          <div className="events-error">
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="events-loading">
            Loading events...
          </div>
        )}

        {!isLoading &&
          events.length === 0 && (
            <div className="events-empty">
              <strong>
                No events available
              </strong>

              <span>
                New events will appear
                here.
              </span>
            </div>
          )}

        <div className="events-grid">
          {events.map(
            (event, index) => {
              const eventId =
                getEventId(event);

              return (
                <article
                  key={
                    eventId ??
                    `event-${index}`
                  }
                  className="event-card"
                >
                  <div className="event-card-image">
                    {event.image_url ? (
                      <img
                        src={
                          event.image_url
                        }
                        alt={
                          event.title ||
                          "Event"
                        }
                      />
                    ) : (
                      <div className="event-placeholder">
                        <span>EVENT</span>
                      </div>
                    )}

                    <span className="event-price">
                      {Number(
                        event.price ?? 0
                      ).toLocaleString()}
                      {" Toman"}
                    </span>
                  </div>

                  <div className="event-card-content">
                    <p className="event-date">
                      {formatEventDate(
                        event
                      )}
                    </p>

                    <h2>
                      {event.title ??
                        event.name ??
                        "Untitled Event"}
                    </h2>

                    <p className="event-description">
                      {event.description ||
                        "Event details will be announced soon."}
                    </p>

                    <div className="event-location">
                      {event.venue ??
                        event.location ??
                        "Venue not specified"}
                    </div>

                    <button
                      type="button"
                      className="event-select-button"
                      disabled={!eventId}
                      onClick={() =>
                        navigate(
                          `/events/${eventId}`
                        )
                      }
                    >
                      View Event
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </div>
      </section>
    </main>
  );
}

export default EventsPage;