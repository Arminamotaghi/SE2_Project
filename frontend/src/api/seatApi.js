import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function lockSeat(seatId, userId) {
  const response = await apiClient.post("/seats/lock", {
    seat_ids: [seatId],
    user_id: userId,
  });

  return response.data;
}

export async function releaseSeat(seatId, userId) {
  const response = await apiClient.post("/seats/release", {
    seat_ids: [seatId],
    user_id: userId,
  });

  return response.data;
}

export async function getSeatStatuses(seatIds, userId) {
  const params = new URLSearchParams();

  params.append("user_id", userId);

  seatIds.forEach((seatId) => {
    params.append("seat_ids", seatId);
  });

  const response = await apiClient.get("/seats/status", {
    params,
  });

  return response.data;
}

export async function payForSeat({
  reservationId,
  seatId,
  userId,
}) {
  const response = await apiClient.post("/checkout/pay", {
    reservation_id: reservationId,
    seat_id: seatId,
    user_id: userId,
  });

  return response.data;
}