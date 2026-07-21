import apiClient from "./apiClient";

function encodeId(value) {
  return encodeURIComponent(String(value));
}

export async function getEvents() {
  const response = await apiClient.get("/events");

  return response.data;
}

export async function getEvent(eventId) {
  const response = await apiClient.get(
    `/events/${encodeId(eventId)}`
  );

  return response.data;
}

export async function createEvent(eventData) {
  const response = await apiClient.post(
    "/events",
    eventData
  );

  return response.data;
}