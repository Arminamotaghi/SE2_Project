import apiClient from "./apiClient";

export async function lockSeat(eventId, seatId) {
  const response = await apiClient.post("/seats/lock", {
    event_id: eventId,
    seat_ids: [seatId],
  });

  return response.data;
}

export async function releaseSeat(eventId, seatId) {
  const response = await apiClient.post("/seats/release", {
    event_id: eventId,
    seat_ids: [seatId],
  });

  return response.data;
}

export async function getSeatStatuses(
  eventId,
  seatIds
) {
  const params = new URLSearchParams();

  params.append("event_id", eventId);

  seatIds.forEach((seatId) => {
    params.append("seat_ids", seatId);
  });

  const response = await apiClient.get(
    "/seats/status",
    {
      params,
    }
  );

  return response.data;
}

export async function payForSeats(
  eventId,
  seatIds
) {
  const response = await apiClient.post(
    "/checkout/pay",
    {
      event_id: eventId,
      seat_ids: seatIds,
    }
  );

  return response.data;
}