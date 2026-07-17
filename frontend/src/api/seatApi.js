import apiClient from "./apiClient";

export async function lockSeat(seatId) {
  const response = await apiClient.post("/seats/lock", {
    seat_ids: [seatId],
  });

  return response.data;
}

export async function releaseSeat(seatId) {
  const response = await apiClient.post("/seats/release", {
    seat_ids: [seatId],
  });

  return response.data;
}

export async function getSeatStatuses(seatIds) {
  const params = new URLSearchParams();

  seatIds.forEach((seatId) => {
    params.append("seat_ids", seatId);
  });

  const response = await apiClient.get("/seats/status", {
    params,
  });

  return response.data;
}

export async function payForSeat(seatId) {
  const response = await apiClient.post("/checkout/pay", {
    seat_id: seatId,
  });

  return response.data;
}