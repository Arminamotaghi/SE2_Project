import axios from "axios";

axios.defaults.withCredentials = true;

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 8000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("ticketing_authenticated");
      localStorage.removeItem("ticketing_username");
      localStorage.removeItem("ticketing_role");

      const publicPaths = ["/login", "/register"];

      if (!publicPaths.includes(window.location.pathname)) {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;