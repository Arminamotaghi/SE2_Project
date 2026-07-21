import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

import {
  getSeatStatuses,
  lockSeat,
  payForSeats,
  releaseSeat,
} from "../api/seatApi";
import "./SeatMap.css";

const SEAT_STATUS = {
  AVAILABLE: "AVAILABLE",
  LOCKED_BY_ME: "LOCKED_BY_ME",
  LOCKED_BY_OTHER: "LOCKED_BY_OTHER",
  BOOKED: "BOOKED",
};

const DEFAULT_SEAT_PRICE = 150;
const DEFAULT_SEAT_COUNT = 25;

function createSeatIds(totalSeats) {
  const parsedTotalSeats = Number(totalSeats);

  const validTotalSeats =
    Number.isInteger(parsedTotalSeats) &&
    parsedTotalSeats > 0
      ? parsedTotalSeats
      : DEFAULT_SEAT_COUNT;

  return Array.from(
    { length: validTotalSeats },
    (_, index) => `SEAT-${index + 1}`
  );
}

function createInitialSeats(seatIds) {
  return seatIds.map((seatId, index) => ({
    id: seatId,
    number: index + 1,
    status: SEAT_STATUS.AVAILABLE,
  }));
}

function normalizeSeatStatus(status) {
  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();

  if (normalizedStatus === "LOCKED_BY_OTHERS") {
    return SEAT_STATUS.LOCKED_BY_OTHER;
  }

  if (
    Object.values(SEAT_STATUS).includes(
      normalizedStatus
    )
  ) {
    return normalizedStatus;
  }

  return SEAT_STATUS.AVAILABLE;
}

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

function SeatMap({
  eventId,
  seatPrice = DEFAULT_SEAT_PRICE,
  totalSeats = DEFAULT_SEAT_COUNT,
}) {
  const normalizedEventId = String(
    eventId || ""
  ).trim();

  const normalizedSeatPrice = Number.isFinite(
    Number(seatPrice)
  )
    ? Number(seatPrice)
    : DEFAULT_SEAT_PRICE;

  const seatIds = useMemo(
    () => createSeatIds(totalSeats),
    [totalSeats]
  );

  const [seats, setSeats] = useState(() =>
    createInitialSeats(seatIds)
  );

  const [selectedSeats, setSelectedSeats] =
    useState([]);

  const [message, setMessage] = useState(
    "Select one or more available seats."
  );

  const [pendingSeatId, setPendingSeatId] =
    useState(null);

  const [isPaying, setIsPaying] =
    useState(false);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const refreshSeatStatuses = useCallback(
    async (showError = false) => {
      if (!normalizedEventId) {
        if (showError) {
          setMessage(
            "The event identifier is missing."
          );
        }

        return;
      }

      setIsRefreshing(true);

      try {
        const response = await getSeatStatuses(
          normalizedEventId,
          seatIds
        );

        const responseSeats = Array.isArray(
          response?.seats
        )
          ? response.seats
          : [];

        const serverSeats = new Map(
          responseSeats.map((seat) => [
            seat.seat_id,
            {
              ...seat,
              status: normalizeSeatStatus(
                seat.status
              ),
            },
          ])
        );

        setSeats((currentSeats) =>
          currentSeats.map((seat) => {
            const serverSeat = serverSeats.get(
              seat.id
            );

            if (!serverSeat) {
              return seat;
            }

            return {
              ...seat,
              status: serverSeat.status,
            };
          })
        );

        const lockedByMeSeatIds = responseSeats
          .filter(
            (seat) =>
              normalizeSeatStatus(seat.status) ===
              SEAT_STATUS.LOCKED_BY_ME
          )
          .map((seat) => seat.seat_id);

        setSelectedSeats(lockedByMeSeatIds);
      } catch (error) {
        if (showError) {
          setMessage(
            getErrorDetail(
              error,
              "Could not refresh seat statuses."
            )
          );
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [normalizedEventId, seatIds]
  );

  useEffect(() => {
    setSeats(createInitialSeats(seatIds));
    setSelectedSeats([]);
    setPendingSeatId(null);
    setIsPaying(false);
    setMessage(
      "Select one or more available seats."
    );

    if (!normalizedEventId) {
      setMessage(
        "The event identifier is missing."
      );

      return undefined;
    }

    refreshSeatStatuses(true);

    const intervalId = window.setInterval(() => {
      refreshSeatStatuses(false);
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    normalizedEventId,
    refreshSeatStatuses,
    seatIds,
  ]);

  const updateSeatLocally = (
    seatId,
    status
  ) => {
    setSeats((currentSeats) =>
      currentSeats.map((seat) =>
        seat.id === seatId
          ? {
              ...seat,
              status,
            }
          : seat
      )
    );
  };

  const addSelectedSeat = (seatId) => {
    setSelectedSeats(
      (currentSelectedSeats) => {
        if (
          currentSelectedSeats.includes(seatId)
        ) {
          return currentSelectedSeats;
        }

        return [
          ...currentSelectedSeats,
          seatId,
        ];
      }
    );
  };

  const removeSelectedSeat = (seatId) => {
    setSelectedSeats(
      (currentSelectedSeats) =>
        currentSelectedSeats.filter(
          (selectedSeatId) =>
            selectedSeatId !== seatId
        )
    );
  };

  const lockSelectedSeat = async (
    seatId
  ) => {
    if (!normalizedEventId) {
      setMessage(
        "The event identifier is missing."
      );
      return;
    }

    setPendingSeatId(seatId);
    setMessage(`Locking ${seatId}...`);

    try {
      await lockSeat(
        normalizedEventId,
        seatId
      );

      updateSeatLocally(
        seatId,
        SEAT_STATUS.LOCKED_BY_ME
      );

      addSelectedSeat(seatId);

      setMessage(
        `${seatId} was added to your selected seats.`
      );

      await refreshSeatStatuses(false);
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 409
      ) {
        updateSeatLocally(
          seatId,
          SEAT_STATUS.LOCKED_BY_OTHER
        );

        removeSelectedSeat(seatId);

        setMessage(
          `${seatId} is locked by another user or already booked.`
        );
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        setMessage(
          "Your session has expired. Please log in again."
        );
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 404
      ) {
        setMessage(
          "The selected event or seat was not found."
        );
      } else {
        setMessage(
          getErrorDetail(
            error,
            "Could not lock the selected seat."
          )
        );
      }

      await refreshSeatStatuses(false);
    } finally {
      setPendingSeatId(null);
    }
  };

  const releaseSelectedSeat = async (
    seatId
  ) => {
    if (!normalizedEventId) {
      setMessage(
        "The event identifier is missing."
      );
      return;
    }

    setPendingSeatId(seatId);
    setMessage(`Releasing ${seatId}...`);

    try {
      await releaseSeat(
        normalizedEventId,
        seatId
      );

      updateSeatLocally(
        seatId,
        SEAT_STATUS.AVAILABLE
      );

      removeSelectedSeat(seatId);

      setMessage(
        `${seatId} was removed from your selected seats.`
      );

      await refreshSeatStatuses(false);
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
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 404
      ) {
        setMessage(
          "The selected event or seat was not found."
        );
      } else {
        setMessage(
          getErrorDetail(
            error,
            "Could not release the selected seat."
          )
        );
      }

      await refreshSeatStatuses(false);
    } finally {
      setPendingSeatId(null);
    }
  };

  const handleSeatClick = async (seat) => {
    if (
      pendingSeatId ||
      isPaying ||
      !normalizedEventId
    ) {
      return;
    }

    if (
      seat.status ===
      SEAT_STATUS.AVAILABLE
    ) {
      await lockSelectedSeat(seat.id);
      return;
    }

    if (
      seat.status ===
      SEAT_STATUS.LOCKED_BY_ME
    ) {
      await releaseSelectedSeat(seat.id);
    }
  };

  const handlePayAll = async () => {
    if (!normalizedEventId) {
      setMessage(
        "The event identifier is missing."
      );
      return;
    }

    if (selectedSeats.length === 0) {
      setMessage(
        "Select at least one locked seat before payment."
      );
      return;
    }

    const seatsToPay = [...selectedSeats];

    setIsPaying(true);

    setMessage(
      `Processing payment for ${
        seatsToPay.length
      } seat${
        seatsToPay.length === 1 ? "" : "s"
      }...`
    );

    try {
      await payForSeats(
        normalizedEventId,
        seatsToPay
      );

      setSeats((currentSeats) =>
        currentSeats.map((seat) =>
          seatsToPay.includes(seat.id)
            ? {
                ...seat,
                status:
                  SEAT_STATUS.BOOKED,
              }
            : seat
        )
      );

      setSelectedSeats([]);

      setMessage(
        `Payment completed successfully for ${
          seatsToPay.length
        } seat${
          seatsToPay.length === 1
            ? ""
            : "s"
        }.`
      );

      await refreshSeatStatuses(false);
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
          "You do not own all selected seat locks."
        );
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 404
      ) {
        setMessage(
          "The selected event or one of its seats was not found."
        );
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 409
      ) {
        setMessage(
          "One or more selected seats are no longer available."
        );
      } else if (
        axios.isAxiosError(error) &&
        error.response?.status === 503
      ) {
        setMessage(
          "The payment service is currently unavailable."
        );
      } else {
        setMessage(
          getErrorDetail(
            error,
            "Payment failed. Please try again."
          )
        );
      }

      await refreshSeatStatuses(false);
    } finally {
      setIsPaying(false);
    }
  };

  const getSeatClassName = (seat) => {
    const classNames = ["seat"];

    if (
      seat.status ===
      SEAT_STATUS.AVAILABLE
    ) {
      classNames.push("seat-available");
    }

    if (
      seat.status ===
      SEAT_STATUS.LOCKED_BY_ME
    ) {
      classNames.push(
        "seat-locked-by-me"
      );
    }

    if (
      seat.status ===
      SEAT_STATUS.LOCKED_BY_OTHER
    ) {
      classNames.push(
        "seat-locked-by-other"
      );
    }

    if (
      seat.status ===
      SEAT_STATUS.BOOKED
    ) {
      classNames.push("seat-booked");
    }

    if (
      selectedSeats.includes(seat.id)
    ) {
      classNames.push("seat-selected");
    }

    if (pendingSeatId === seat.id) {
      classNames.push("seat-pending");
    }

    return classNames.join(" ");
  };

  const isSeatDisabled = (seat) => {
    if (
      pendingSeatId ||
      isPaying ||
      !normalizedEventId
    ) {
      return true;
    }

    return (
      seat.status ===
        SEAT_STATUS.LOCKED_BY_OTHER ||
      seat.status ===
        SEAT_STATUS.BOOKED
    );
  };

  const totalPrice =
    selectedSeats.length *
    normalizedSeatPrice;

  const isPayButtonDisabled =
    selectedSeats.length === 0 ||
    isPaying ||
    pendingSeatId !== null ||
    !normalizedEventId;

  return (
    <section className="seat-map">
      <header className="seat-map-header">
        <p className="eyebrow">
          Online Ticketing
        </p>

        <h1>Venue Seat Map</h1>

        <p
          className="message"
          aria-live="polite"
        >
          {message}
        </p>
      </header>

      <div className="stage">STAGE</div>

      <div className="seat-grid">
        {seats.map((seat) => (
          <button
            key={seat.id}
            type="button"
            className={getSeatClassName(
              seat
            )}
            onClick={() =>
              handleSeatClick(seat)
            }
            disabled={isSeatDisabled(
              seat
            )}
            aria-label={`Seat ${seat.number}, ${seat.status}`}
            aria-pressed={selectedSeats.includes(
              seat.id
            )}
          >
            {pendingSeatId === seat.id
              ? "..."
              : seat.number}
          </button>
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-summary-header">
          <div>
            <span className="cart-label">
              Selected seats
            </span>

            <strong className="cart-count">
              {selectedSeats.length}
            </strong>
          </div>

          <span className="cart-total">
            {totalPrice.toLocaleString()}
            {" Toman"}
          </span>
        </div>

        <div className="selected-seat-list">
          {selectedSeats.length > 0
            ? selectedSeats.join(", ")
            : "No seats selected"}
        </div>

        <div className="cart-details">
          <span>
            Price per seat:{" "}
            {normalizedSeatPrice.toLocaleString()}
            {" Toman"}
          </span>

          <span>
            Total:{" "}
            <strong>
              {totalPrice.toLocaleString()}
              {" Toman"}
            </strong>
          </span>
        </div>

        <button
          type="button"
          className="pay-button pay-all-button"
          onClick={handlePayAll}
          disabled={isPayButtonDisabled}
        >
          {isPaying
            ? "Processing Payment..."
            : selectedSeats.length > 0
              ? `Pay for ${
                  selectedSeats.length
                } Seat${
                  selectedSeats.length === 1
                    ? ""
                    : "s"
                }`
              : "Select Seats to Pay"}
        </button>
      </div>

      <div className="sync-status">
        {isRefreshing
          ? "Synchronizing seat statuses..."
          : "Seat statuses are synchronized automatically."}
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