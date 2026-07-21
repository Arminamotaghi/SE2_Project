import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { useAuth } from "./auth/AuthContext";
import AdminRoute from "./components/AdminRoute";
import OrganizerRoute from "./components/OrganizerRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import CreateEventPage from "./pages/CreateEventPage";
import EventSeatsPage from "./pages/EventSeatsPage";
import EventsPage from "./pages/EventsPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TicketsPage from "./pages/TicketsPage";
import "./App.css";

function App() {
  const { isAuthenticated } =
    useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate
              to="/events"
              replace
            />
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate
              to="/events"
              replace
            />
          ) : (
            <Register />
          )
        }
      />

      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <EventsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/events/:id"
        element={
          <ProtectedRoute>
            <EventSeatsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-tickets"
        element={
          <ProtectedRoute>
            <TicketsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organizer/create"
        element={
          <OrganizerRoute>
            <CreateEventPage />
          </OrganizerRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      <Route
        path="/"
        element={
          <Navigate
            to={
              isAuthenticated
                ? "/events"
                : "/login"
            }
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={
              isAuthenticated
                ? "/events"
                : "/login"
            }
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;