import {
  useCallback,
  useEffect,
  useState,
} from "react";
import axios from "axios";

import {
  getSeatStatuses,
  lockSeat,
  payForSeat,
  releaseSeat,
} from "../api/seatApi";
import "./SeatMap.css";

const SEAT_STATUS = {
  AVAILABLE: "AVAILABLE",
  LOCKED_BY_ME: "LOCKED_BY_ME",
  LOCKED_BY_OTHER: "LOCKED_BY_OTHER",
  BOOKED: "BOOKED",
};

const SEAT_IDS = Array.from(
  { length: 25 },
  (_, index) => `SEAT-${index + 1}`
);

function createInitialSeats() {
  return SEAT_IDS.map((seatId, index) => ({
    id: seatId,
    number: index + 1,
    status: SEAT_STATUS.AVAILABLE,
  }));
}

function SeatMap() {
  const [seats, setSeats] = useState(createInitialSeats);
  const [message, setMessage] = useState(
    "Select an available seat."
  );
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [pendingSeatId, setPendingSeatId] = useState(null);
  const [isPaying, setIsPaying] = useState(false);

  const selectedSeat = seats.find(
    (seat) => seat.id === selectedSeatId
  );

  const refreshSeatStatuses = useCallback(
    async (showError = false) => {
      try {
        const response = await getSeatStatuses(SEAT_IDS);

        const serverSeats = new Map(
          response.seats.map((seat) => [
            seat.seat_id,
            seat,
          ])
        );

        setSeats((currentSeats) =>
          currentSeats.map((seat) => {
            const serverSeat = serverSeats.get(seat.id);

            if (!serverSeat) {
              return seat;
            }

            return {
              ...seat,
              status: serverSeat.status,
            };
          })
        );

        setSelectedSeatId((currentSeatId) => {
          if (!currentSeatId) {
            return null;
          }

          const serverSeat = serverSeats.get(currentSeatId);

          if (
            serverSeat?.status !==
            SEAT_STATUS.LOCKED_BY_ME
          ) {
            return null;
          }

          return currentSeatId;
        });
      } catch {
        if (showError) {
          setMessage("Could not refresh seat statuses.");
        }
      }
    },
    []
  );

  useEffect(() => {
    refreshSeatStatuses(true);

    const intervalId = window.setInterval(() => {
      refreshSeatStatuses(false);
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshSeatStatuses]);

  const updateSeatLocally = (seatId, changes) => {
    setSeats((currentSeats) =>
      currentSeats.map((seat) =>
        seat.id === seatId
          ? {
              ...seat,
              ...changes,
            }
          : seat
      )
    );
  };

  const handleSeatClick = async (seat) => {
    if (pendingSeatId || isPaying) {
      return;
    }

    if (seat.status === SEAT_STATUS.LOCKED_BY_ME) {
      setSelectedSeatId(seat.id);
      setMessage(`${seat.id} is selected for payment.`);
      return;
    }

    if (seat.status !== SEAT_STATUS.AVAILABLE) {
      return;
    }

    setPendingSeatId(seat.id);
    setMessage(`Locking ${seat.id}...`);

    try {
      await lockSeat(seat.id);

      updateSeatLocally(seat.id, {
        status: SEAT_STATUS.LOCKED_BY_ME,
      });

      setSelectedSeatId(seat.id);

      setMessage(
        `${seat.id} was locked successfully. You can now pay.`
      );

      await refreshSeatStatuses(false);
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 409
      ) {
        updateSeatLocally(seat.id, {
          status: SEAT_STATUS.LOCKED_BY_OTHER,
        });

        setMessage(`${seat.id} is not available.`);
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        setMessage(
          "Your session has expired. Please log in again."
        );
      } else {
        setMessage("Could not lock the seat.");
      }
    } finally {
      setPendingSeatId(null);
    }
  };

  const handlePayment = async () => {
    if (
      !selectedSeat ||
      selectedSeat.status !== SEAT_STATUS.LOCKED_BY_ME
    ) {
      setMessage("Select one of your locked seats first.");
      return;
    }

    setIsPaying(true);
    setMessage(
      `Processing payment for ${selectedSeat.id}...`
    );

    try {
      await payForSeat(selectedSeat.id);

      updateSeatLocally(selectedSeat.id, {
        status: SEAT_STATUS.BOOKED,
      });

      setSelectedSeatId(null);

      await refreshSeatStatuses(false);

      setMessage(
        `Payment completed. ${selectedSeat.id} is now booked.`
      );
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        setMessage(
          "Your session has expired. Please log in again."
        );
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 403
      ) {
        setMessage(
          "You no longer own the lock for this seat."
        );
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 409
      ) {
        setMessage(
          "The selected seat is no longer available."
        );
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 503
      ) {
        setMessage(
          "The payment service is currently unavailable."
        );
      } else {
        setMessage("Payment failed. Please try again.");
      }

      await refreshSeatStatuses(false);
    } finally {
      setIsPaying(false);
    }
  };

  const handleRelease = async () => {
    if (
      !selectedSeat ||
      selectedSeat.status !== SEAT_STATUS.LOCKED_BY_ME
    ) {
      setMessage("Select one of your locked seats first.");
      return;
    }

    setPendingSeatId(selectedSeat.id);
    setMessage(`Releasing ${selectedSeat.id}...`);

    try {
      await releaseSeat(selectedSeat.id);

      setSelectedSeatId(null);

      await refreshSeatStatuses(false);

      setMessage(
        `${selectedSeat.id} was released successfully.`
      );
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        setMessage(
          "Your session has expired. Please log in again."
        );
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 403
      ) {
        setMessage(
          "You are not allowed to release this seat."
        );
      } else {
        setMessage("Could not release the seat.");
      }
    } finally {
      setPendingSeatId(null);
    }
  };

  const getSeatClassName = (seat) => {
    const classNames = ["seat"];

    if (seat.status === SEAT_STATUS.AVAILABLE) {
      classNames.push("seat-available");
    }

    if (seat.status === SEAT_STATUS.LOCKED_BY_ME) {
      classNames.push("seat-locked-by-me");
    }

    if (seat.status === SEAT_STATUS.LOCKED_BY_OTHER) {
      classNames.push("seat-locked-by-other");
    }

    if (seat.status === SEAT_STATUS.BOOKED) {
      classNames.push("seat-booked");
    }

    if (seat.id === selectedSeatId) {
      classNames.push("seat-selected");
    }

    if (seat.id === pendingSeatId) {
      classNames.push("seat-pending");
    }

    return classNames.join(" ");
  };

  const isSeatDisabled = (seat) => {
    if (pendingSeatId || isPaying) {
      return true;
    }

    return (
      seat.status === SEAT_STATUS.LOCKED_BY_OTHER ||
      seat.status === SEAT_STATUS.BOOKED
    );
  };

  const isPayButtonDisabled =
    !selectedSeat ||
    selectedSeat.status !== SEAT_STATUS.LOCKED_BY_ME ||
    isPaying ||
    pendingSeatId !== null;

  const isReleaseButtonDisabled =
    !selectedSeat ||
    selectedSeat.status !== SEAT_STATUS.LOCKED_BY_ME ||
    isPaying ||
    pendingSeatId !== null;

  return (
    <section className="seat-map">
      <header className="seat-map-header">
        <p className="eyebrow">Online Ticketing</p>
        <h1>Venue Seat Map</h1>

        <p className="message" aria-live="polite">
          {message}
        </p>
      </header>

      <div className="stage">STAGE</div>

      <div className="seat-grid">
        {seats.map((seat) => (
          <button
            key={seat.id}
            type="button"
            className={getSeatClassName(seat)}
            onClick={() => handleSeatClick(seat)}
            disabled={isSeatDisabled(seat)}
            aria-label={`Seat ${seat.number}, ${seat.status}`}
            aria-pressed={seat.id === selectedSeatId}
          >
            {seat.id === pendingSeatId
              ? "..."
              : seat.number}
          </button>
        ))}
      </div>

      <div className="payment-panel">
        <div className="selected-seat-info">
          <span>Selected seat</span>

          <strong>
            {selectedSeat ? selectedSeat.number : "None"}
          </strong>
        </div>

        <div className="payment-actions">
          <button
            type="button"
            className="release-button"
            onClick={handleRelease}
            disabled={isReleaseButtonDisabled}
          >
            Release
          </button>

          <button
            type="button"
            className="pay-button"
            onClick={handlePayment}
            disabled={isPayButtonDisabled}
          >
            {isPaying
              ? "Processing..."
              : selectedSeat
                ? `Pay for Seat ${selectedSeat.number}`
                : "Select a Seat to Pay"}
          </button>
        </div>
      </div>

      <div className="legend">
        <div className="legend-item">
          <span className="legend-color available-color" />
          <span>Available</span>
        </div>

        <div className="legend-item">
          <span className="legend-color locked-by-me-color" />
          <span>Locked by me</span>
        </div>

        <div className="legend-item">
          <span className="legend-color locked-by-other-color" />
          <span>Locked by others</span>
        </div>

        <div className="legend-item">
          <span className="legend-color booked-color" />
          <span>Booked</span>
        </div>
      </div>
    </section>
  );
}

export default SeatMap;