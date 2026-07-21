import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

function OrganizerRoute({ children }) {
  const {
    isAuthenticated,
    isOrganizer,
  } = useAuth();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (!isOrganizer) {
    return (
      <Navigate
        to="/events"
        replace
      />
    );
  }

  return children;
}

export default OrganizerRoute;