import {
  useCallback,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";

import { getMyTickets } from "../api/ticketApi";
import "./TicketsPage.css";

function normalizeTickets(
  responseData
) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (
    Array.isArray(
      responseData?.tickets
    )
  ) {
    return responseData.tickets;
  }

  return [];
}

function getTicketId(ticket) {
  return (
    ticket?.ticket_id ??
    ticket?.id ??
    ticket?.unique_code
  );
}

function formatTicketDate(ticket) {
  const dateValue =
    ticket?.starts_at ??
    ticket?.event_date ??
    ticket?.event?.starts_at;

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

function TicketsPage() {
  const navigate = useNavigate();

  const [tickets, setTickets] =
    useState([]);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const loadTickets = useCallback(
    async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const responseData =
          await getMyTickets();

        setTickets(
          normalizeTickets(
            responseData
          )
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
            : "Could not load your tickets."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  return (
    <main className="tickets-page">
      <header className="tickets-toolbar">
        <button
          type="button"
          onClick={() =>
            navigate("/events")
          }
        >
          Browse Events
        </button>

        <strong>My Tickets</strong>

        <button
          type="button"
          onClick={loadTickets}
        >
          Refresh
        </button>
      </header>

      <section className="tickets-container">
        <div className="tickets-heading">
          <p>Digital Wallet</p>

          <h1>
            Your event tickets
          </h1>

          <span>
            Present the QR Code at the
            venue entrance.
          </span>
        </div>

        {errorMessage && (
          <div className="tickets-error">
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="tickets-loading">
            Loading tickets...
          </div>
        )}

        {!isLoading &&
          tickets.length === 0 && (
            <div className="tickets-empty">
              <strong>
                No tickets found
              </strong>

              <button
                type="button"
                onClick={() =>
                  navigate("/events")
                }
              >
                Find an Event
              </button>
            </div>
          )}

        <div className="tickets-grid">
          {tickets.map(
            (ticket, index) => {
              const ticketId =
                getTicketId(ticket);

              const uniqueCode =
                ticket.unique_code;

              return (
                <article
                  key={
                    ticketId ??
                    `ticket-${index}`
                  }
                  className="ticket-card"
                >
                  <div className="ticket-information">
                    <p className="ticket-label">
                      ADMISSION TICKET
                    </p>

                    <h2>
                      {ticket.event_title ??
                        ticket.event?.title ??
                        "Event Ticket"}
                    </h2>

                    <dl>
                      <div>
                        <dt>Seat</dt>

                        <dd>
                          {ticket.seat_id ??
                            ticket.seat_number ??
                            "Not specified"}
                        </dd>
                      </div>

                      <div>
                        <dt>Venue</dt>

                        <dd>
                          {ticket.venue ??
                            ticket.event
                              ?.venue ??
                            "Not specified"}
                        </dd>
                      </div>

                      <div>
                        <dt>Date</dt>

                        <dd>
                          {formatTicketDate(
                            ticket
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>Ticket ID</dt>

                        <dd>
                          {ticketId ??
                            "Not specified"}
                        </dd>
                      </div>

                      <div>
                        <dt>Status</dt>

                        <dd>
                          {ticket.status ??
                            "VALID"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="ticket-qr-section">
                    {uniqueCode ? (
                      <>
                        <div className="ticket-qr">
                          <QRCodeSVG
                            value={String(
                              uniqueCode
                            )}
                            size={200}
                            level="H"
                            bgColor="#ffffff"
                            fgColor="#050b14"
                          />
                        </div>

                        <span>
                          Scan at entrance
                        </span>
                      </>
                    ) : (
                      <span>
                        QR code unavailable
                      </span>
                    )}
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

export default TicketsPage;