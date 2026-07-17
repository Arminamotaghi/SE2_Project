import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import SeatMap from "../components/SeatMap";
import "./VenuePage.css";

function VenuePage() {
  const navigate = useNavigate();
  const { username, logout } = useAuth();
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
        <div>
          <span className="venue-user-label">Signed in as</span>
          <strong>{username}</strong>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Logging Out..." : "Logout"}
        </button>
      </header>

      <SeatMap />
    </main>
  );
}

export default VenuePage;