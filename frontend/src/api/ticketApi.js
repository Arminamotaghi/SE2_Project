import apiClient from "./apiClient";

export async function getMyTickets() {
  const response = await apiClient.get("/tickets");

  return response.data;
}