import apiClient from "./apiClient";

function getEventPath(eventId) {
  return `/events/${encodeURIComponent(
    String(eventId)
  )}`;
}

export async function getEventSeats(eventId) {
  const response = await apiClient.get(
    `${getEventPath(eventId)}/seats`
  );

  return response.data;
}

export async function getSeatStatuses(
  eventId,
  seatIds
) {
  const params = new URLSearchParams();

  seatIds.forEach((seatId) => {
    params.append("seat_ids", seatId);
  });

  const response = await apiClient.get(
    `${getEventPath(eventId)}/seats/status`,
    {
      params,
    }
  );

  return response.data;
}

export async function lockSeat(
  eventId,
  seatId
) {
  const response = await apiClient.post(
    `${getEventPath(eventId)}/seats/lock`,
    {
      seat_ids: [seatId],
    }
  );

  return response.data;
}

export async function releaseSeat(
  eventId,
  seatId
) {
  const response = await apiClient.post(
    `${getEventPath(eventId)}/seats/release`,
    {
      seat_ids: [seatId],
    }
  );

  return response.data;
}

export async function payForSeats(
  eventId,
  seatIds
) {
  const response = await apiClient.post(
    `${getEventPath(eventId)}/checkout/pay`,
    {
      seat_ids: seatIds,
    }
  );

  return response.data;
}