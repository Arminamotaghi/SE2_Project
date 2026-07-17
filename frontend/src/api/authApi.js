import apiClient from "./apiClient";

export async function registerUser(username, password) {
  const response = await apiClient.post("/auth/register", {
    username,
    password,
  });

  return response.data;
}

export async function loginUser(username, password) {
  const response = await apiClient.post("/auth/login", {
    username,
    password,
  });

  return response.data;
}

export async function logoutUser() {
  const response = await apiClient.post("/auth/logout");

  return response.data;
}