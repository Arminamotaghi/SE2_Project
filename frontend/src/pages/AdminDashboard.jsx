import {
  useCallback,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { getAdminDashboard } from "../api/adminApi";
import { useAuth } from "../auth/AuthContext";
import "./AdminDashboard.css";

function normalizeNumber(value) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : 0;
}

function normalizeOccupancyRate(value) {
  const parsedValue = normalizeNumber(value);

  if (parsedValue >= 0 && parsedValue <= 1) {
    return parsedValue * 100;
  }

  return parsedValue;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const {
    username,
    logout,
  } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const responseData = await getAdminDashboard();

      setDashboard({
        totalSeats: normalizeNumber(
          responseData.total_seats
        ),
        bookedSeats: normalizeNumber(
          responseData.booked_seats
        ),
        revenue: normalizeNumber(
          responseData.revenue
        ),
        occupancyRate: normalizeOccupancyRate(
          responseData.occupancy_rate
        ),
      });
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 403
      ) {
        navigate("/", {
          replace: true,
        });

        return;
      }

      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        return;
      }

      const detail = axios.isAxiosError(error)
        ? error.response?.data?.detail
        : null;

      setErrorMessage(
        typeof detail === "string"
          ? detail
          : "Could not load the admin dashboard."
      );
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <main className="admin-page">
        <div className="admin-loading">
          Loading dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-toolbar">
        <div>
          <p className="admin-toolbar-label">
            Administrator
          </p>

          <strong>{username}</strong>
        </div>

        <nav className="admin-toolbar-actions">
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => navigate("/")}
          >
            Seat Map
          </button>

          <button
            type="button"
            className="admin-logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut
              ? "Logging Out..."
              : "Logout"}
          </button>
        </nav>
      </header>

      <section className="admin-dashboard">
        <div className="admin-dashboard-heading">
          <div>
            <p className="admin-eyebrow">
              Online Ticketing
            </p>

            <h1>Admin Dashboard</h1>

            <p>
              Sales and venue occupancy overview.
            </p>
          </div>

          <button
            type="button"
            className="admin-refresh-button"
            onClick={loadDashboard}
          >
            Refresh Data
          </button>
        </div>

        {errorMessage && (
          <div className="admin-error">
            <span>{errorMessage}</span>

            <button
              type="button"
              onClick={loadDashboard}
            >
              Try Again
            </button>
          </div>
        )}

        {dashboard && (
          <>
            <div className="admin-stats-grid">
              <article className="admin-stat-card">
                <div className="admin-stat-icon">
                  TS
                </div>

                <div>
                  <span>Total Seats</span>

                  <strong>
                    {dashboard.totalSeats.toLocaleString()}
                  </strong>
                </div>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-icon">
                  BS
                </div>

                <div>
                  <span>Booked Seats</span>

                  <strong>
                    {dashboard.bookedSeats.toLocaleString()}
                  </strong>
                </div>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-icon">
                  RV
                </div>

                <div>
                  <span>Total Revenue</span>

                  <strong>
                    {dashboard.revenue.toLocaleString()}
                  </strong>

                  <small>Toman</small>
                </div>
              </article>

              <article className="admin-stat-card">
                <div className="admin-stat-icon">
                  OR
                </div>

                <div>
                  <span>Occupancy Rate</span>

                  <strong>
                    {dashboard.occupancyRate.toFixed(1)}%
                  </strong>
                </div>
              </article>
            </div>

            <section className="occupancy-section">
              <div className="occupancy-heading">
                <div>
                  <h2>Venue Occupancy</h2>

                  <p>
                    {dashboard.bookedSeats.toLocaleString()}
                    {" of "}
                    {dashboard.totalSeats.toLocaleString()}
                    {" seats have been booked."}
                  </p>
                </div>

                <strong>
                  {dashboard.occupancyRate.toFixed(1)}%
                </strong>
              </div>

              <div
                className="occupancy-progress"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={Math.min(
                  dashboard.occupancyRate,
                  100
                )}
              >
                <div
                  className="occupancy-progress-value"
                  style={{
                    width: `${Math.min(
                      Math.max(
                        dashboard.occupancyRate,
                        0
                      ),
                      100
                    )}%`,
                  }}
                />
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

export default AdminDashboard;