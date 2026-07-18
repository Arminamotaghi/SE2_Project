import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import SeatMap from "../components/SeatMap";
import "./VenuePage.css";

function VenuePage() {
  const navigate = useNavigate();

  const {
    username,
    role,
    isAdmin,
    logout,
  } = useAuth();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <main className="venue-page">
      <header className="venue-toolbar">
        <div className="venue-user">
          <span className="venue-user-label">
            Signed in as
          </span>

          <div className="venue-user-details">
            <strong>{username}</strong>

            <span className="venue-role">
              {role}
            </span>
          </div>
        </div>

        <nav className="venue-toolbar-actions">
          {isAdmin && (
            <button
              type="button"
              className="admin-panel-button"
              onClick={() => navigate("/admin")}
            >
              Admin Panel
            </button>
          )}

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut
              ? "Logging Out..."
              : "Logout"}
          </button>
        </nav>
      </header>

      <SeatMap />
    </main>
  );
}

export default VenuePage;