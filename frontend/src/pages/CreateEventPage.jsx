import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { createEvent } from "../api/eventApi";
import "./CreateEventPage.css";

const INITIAL_FORM = {
  title: "",
  description: "",
  venue: "",
  startsAt: "",
  price: "",
  totalSeats: "25",
  imageUrl: "",
};

function CreateEventPage() {
  const navigate = useNavigate();

  const [formData, setFormData] =
    useState(INITIAL_FORM);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const updateField = (
    fieldName,
    value
  ) => {
    setFormData(
      (currentData) => ({
        ...currentData,
        [fieldName]: value,
      })
    );
  };

  const handleSubmit = async (
    submitEvent
  ) => {
    submitEvent.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.venue.trim() ||
      !formData.startsAt ||
      formData.price === "" ||
      !formData.totalSeats
    ) {
      setErrorMessage(
        "Complete all required fields."
      );
      return;
    }

    const price = Number(
      formData.price
    );

    const totalSeats = Number(
      formData.totalSeats
    );

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      setErrorMessage(
        "Enter a valid event price."
      );
      return;
    }

    if (
      !Number.isInteger(totalSeats) ||
      totalSeats < 1
    ) {
      setErrorMessage(
        "Enter a valid number of seats."
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const responseData =
        await createEvent({
          title:
            formData.title.trim(),
          description:
            formData.description.trim(),
          venue:
            formData.venue.trim(),
          starts_at: new Date(
            formData.startsAt
          ).toISOString(),
          price,
          total_seats: totalSeats,
          image_url:
            formData.imageUrl.trim() ||
            null,
        });

      const createdEvent =
        responseData?.event ??
        responseData;

      const createdEventId =
        createdEvent?.event_id ??
        createdEvent?.id;

      navigate(
        createdEventId
          ? `/events/${createdEventId}`
          : "/events",
        {
          replace: true,
        }
      );
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 403
      ) {
        setErrorMessage(
          "Only organizers and administrators can create events."
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
            : "Could not create event."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="create-event-page">
      <header className="create-event-toolbar">
        <button
          type="button"
          onClick={() =>
            navigate("/events")
          }
        >
          Back to Events
        </button>

        <strong>
          Organizer Panel
        </strong>
      </header>

      <section className="create-event-card">
        <div className="create-event-heading">
          <p>
            Organizer Workspace
          </p>

          <h1>
            Create a new event
          </h1>

          <span>
            Add the event information
            and make it available for
            booking.
          </span>
        </div>

        {errorMessage && (
          <div className="create-event-error">
            {errorMessage}
          </div>
        )}

        <form
          className="create-event-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="event-title">
            Event title
          </label>

          <input
            id="event-title"
            type="text"
            value={formData.title}
            onChange={(event) =>
              updateField(
                "title",
                event.target.value
              )
            }
            disabled={isSubmitting}
          />

          <label htmlFor="event-description">
            Description
          </label>

          <textarea
            id="event-description"
            rows="5"
            value={
              formData.description
            }
            onChange={(event) =>
              updateField(
                "description",
                event.target.value
              )
            }
            disabled={isSubmitting}
          />

          <div className="create-event-columns">
            <div>
              <label htmlFor="event-venue">
                Venue
              </label>

              <input
                id="event-venue"
                type="text"
                value={formData.venue}
                onChange={(event) =>
                  updateField(
                    "venue",
                    event.target.value
                  )
                }
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="event-date">
                Date and time
              </label>

              <input
                id="event-date"
                type="datetime-local"
                value={
                  formData.startsAt
                }
                onChange={(event) =>
                  updateField(
                    "startsAt",
                    event.target.value
                  )
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="create-event-columns">
            <div>
              <label htmlFor="event-price">
                Price per seat
              </label>

              <input
                id="event-price"
                type="number"
                min="0"
                value={formData.price}
                onChange={(event) =>
                  updateField(
                    "price",
                    event.target.value
                  )
                }
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="event-seats">
                Total seats
              </label>

              <input
                id="event-seats"
                type="number"
                min="1"
                max="500"
                value={
                  formData.totalSeats
                }
                onChange={(event) =>
                  updateField(
                    "totalSeats",
                    event.target.value
                  )
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          <label htmlFor="event-image">
            Event image URL
          </label>

          <input
            id="event-image"
            type="url"
            value={formData.imageUrl}
            onChange={(event) =>
              updateField(
                "imageUrl",
                event.target.value
              )
            }
            disabled={isSubmitting}
          />

          <button
            type="submit"
            className="create-event-submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Creating Event..."
              : "Create Event"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default CreateEventPage;