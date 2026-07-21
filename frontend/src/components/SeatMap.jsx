import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

import {
  getEventSeats,
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

function getErrorDetail(
  error,
  fallbackMessage
) {
  if (!axios.isAxiosError(error)) {
    return fallbackMessage;
  }

  const detail =
    error.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => item?.msg)
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(", ");
    }
  }

  return fallbackMessage;
}

function normalizeSeatStatus(status) {
  const normalizedStatus = String(
    status || ""
  )
    .trim()
    .toUpperCase();

  if (
    normalizedStatus ===
    "LOCKED_BY_OTHERS"
  ) {
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

function getResponseSeats(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (
    Array.isArray(responseData?.seats)
  ) {
    return responseData.seats;
  }

  return [];
}

function normalizePrice(
  value,
  fallbackPrice
) {
  const parsedValue = Number(value);

  if (
    Number.isFinite(parsedValue) &&
    parsedValue >= 0
  ) {
    return parsedValue;
  }

  return fallbackPrice;
}

function normalizeSeats(
  responseData,
  fallbackPrice
) {
  return getResponseSeats(responseData)
    .map((seat, index) => {
      if (typeof seat === "string") {
        return {
          id: seat,
          number: index + 1,
          label: seat,
          price: fallbackPrice,
          status:
            SEAT_STATUS.AVAILABLE,
        };
      }

      const seatId =
        seat?.seat_id ??
        seat?.id ??
        seat?.code;

      if (!seatId) {
        return null;
      }

      return {
        id: String(seatId),
        number:
          seat?.seat_number ??
          seat?.number ??
          index + 1,
        label:
          seat?.label ??
          String(seatId),
        price: normalizePrice(
          seat?.price ??
            seat?.seat_price,
          fallbackPrice
        ),
        status: normalizeSeatStatus(
          seat?.status
        ),
      };
    })
    .filter(Boolean);
}

function SeatMap({
  eventId,
  seatPrice = DEFAULT_SEAT_PRICE,
}) {
  const normalizedEventId = String(
    eventId || ""
  ).trim();

  const normalizedSeatPrice =
    normalizePrice(
      seatPrice,
      DEFAULT_SEAT_PRICE
    );

  const [seats, setSeats] =
    useState([]);

  const [
    selectedSeats,
    setSelectedSeats,
  ] = useState([]);

  const [message, setMessage] =
    useState(
      "Select one or more available seats."
    );

  const [
    pendingSeatId,
    setPendingSeatId,
  ] = useState(null);

  const [isPaying, setIsPaying] =
    useState(false);

  const [
    isLoadingSeats,
    setIsLoadingSeats,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const seatIdsKey = seats
    .map((seat) => seat.id)
    .join("|");

  const seatIds = useMemo(
    () =>
      seatIdsKey
        ? seatIdsKey.split("|")
        : [],
    [seatIdsKey]
  );

  useEffect(() => {
    let isActive = true;

    async function loadSeats() {
      setSeats([]);
      setSelectedSeats([]);
      setPendingSeatId(null);
      setIsPaying(false);

      if (!normalizedEventId) {
        setMessage(
          "The event identifier is missing."
        );
        setIsLoadingSeats(false);
        return;
      }

      setIsLoadingSeats(true);
      setMessage("Loading seats...");

      try {
        const responseData =
          await getEventSeats(
            normalizedEventId
          );

        if (!isActive) {
          return;
        }

        const loadedSeats =
          normalizeSeats(
            responseData,
            normalizedSeatPrice
          );

        setSeats(loadedSeats);

        setSelectedSeats(
          loadedSeats
            .filter(
              (seat) =>
                seat.status ===
                SEAT_STATUS.LOCKED_BY_ME
            )
            .map((seat) => seat.id)
        );

        setMessage(
          loadedSeats.length > 0
            ? "Select one or more available seats."
            : "No seats are available for this event."
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        setMessage(
          getErrorDetail(
            error,
            "Could not load event seats."
          )
        );
      } finally {
        if (isActive) {
          setIsLoadingSeats(false);
        }
      }
    }

    loadSeats();

    return () => {
      isActive = false;
    };
  }, [
    normalizedEventId,
    normalizedSeatPrice,
  ]);

  const refreshSeatStatuses =
    useCallback(
      async (showError = false) => {
        if (
          !normalizedEventId ||
          seatIds.length === 0
        ) {
          return;
        }

        setIsRefreshing(true);

        try {
          const responseData =
            await getSeatStatuses(
              normalizedEventId,
              seatIds
            );

          const responseSeats =
            getResponseSeats(responseData);

          const statusMap = new Map(
            responseSeats
              .map((seat) => {
                const seatId =
                  seat?.seat_id ??
                  seat?.id ??
                  seat?.code;

                if (!seatId) {
                  return null;
                }

                return [
                  String(seatId),
                  normalizeSeatStatus(
                    seat.status
                  ),
                ];
              })
              .filter(Boolean)
          );

          setSeats((currentSeats) =>
            currentSeats.map((seat) => {
              const serverStatus =
                statusMap.get(seat.id);

              if (!serverStatus) {
                return seat;
              }

              return {
                ...seat,
                status: serverStatus,
              };
            })
          );

          const lockedByMeIds =
            responseSeats
              .filter(
                (seat) =>
                  normalizeSeatStatus(
                    seat.status
                  ) ===
                  SEAT_STATUS.LOCKED_BY_ME
              )
              .map((seat) =>
                String(
                  seat.seat_id ??
                    seat.id ??
                    seat.code
                )
              );

          setSelectedSeats(
            lockedByMeIds
          );
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
      [
        normalizedEventId,
        seatIds,
      ]
    );

  useEffect(() => {
    if (
      isLoadingSeats ||
      seatIds.length === 0
    ) {
      return undefined;
    }

    refreshSeatStatuses(true);

    const intervalId =
      window.setInterval(() => {
        refreshSeatStatuses(false);
      }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    isLoadingSeats,
    seatIdsKey,
    refreshSeatStatuses,
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

  const addSelectedSeat = (
    seatId
  ) => {
    setSelectedSeats(
      (currentSelectedSeats) => {
        if (
          currentSelectedSeats.includes(
            seatId
          )
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

  const removeSelectedSeat = (
    seatId
  ) => {
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

  const releaseSelectedSeat =
    async (seatId) => {
      setPendingSeatId(seatId);
      setMessage(
        `Releasing ${seatId}...`
      );

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

        await refreshSeatStatuses(
          false
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
          setMessage(
            getErrorDetail(
              error,
              "Could not release the selected seat."
            )
          );
        }

        await refreshSeatStatuses(
          false
        );
      } finally {
        setPendingSeatId(null);
      }
    };

  const handleSeatClick = async (
    seat
  ) => {
    if (
      pendingSeatId ||
      isPaying ||
      isLoadingSeats
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
      await releaseSelectedSeat(
        seat.id
      );
    }
  };

  const handlePayAll = async () => {
    if (selectedSeats.length === 0) {
      setMessage(
        "Select at least one locked seat before payment."
      );
      return;
    }

    const seatsToPay = [
      ...selectedSeats,
    ];

    setIsPaying(true);

    setMessage(
      `Processing payment for ${
        seatsToPay.length
      } seat${
        seatsToPay.length === 1
          ? ""
          : "s"
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

  const getSeatClassName = (
    seat
  ) => {
    const classNames = ["seat"];

    if (
      seat.status ===
      SEAT_STATUS.AVAILABLE
    ) {
      classNames.push(
        "seat-available"
      );
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
      classNames.push(
        "seat-selected"
      );
    }

    if (
      pendingSeatId === seat.id
    ) {
      classNames.push(
        "seat-pending"
      );
    }

    return classNames.join(" ");
  };

  const isSeatDisabled = (
    seat
  ) => {
    if (
      pendingSeatId ||
      isPaying ||
      isLoadingSeats
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
    selectedSeats.reduce(
      (total, seatId) => {
        const selectedSeat =
          seats.find(
            (seat) =>
              seat.id === seatId
          );

        return (
          total +
          (selectedSeat?.price ??
            normalizedSeatPrice)
        );
      },
      0
    );

  const isPayButtonDisabled =
    selectedSeats.length === 0 ||
    isPaying ||
    isLoadingSeats ||
    pendingSeatId !== null;

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

      <div className="stage">
        STAGE
      </div>

      {isLoadingSeats ? (
        <div className="sync-status">
          Loading seats...
        </div>
      ) : (
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
              aria-label={`Seat ${seat.label}, ${seat.status}`}
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
      )}

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
                  selectedSeats.length ===
                  1
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
          <span>
            Locked by others
          </span>
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