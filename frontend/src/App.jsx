import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { useAuth } from "./auth/AuthContext";
import AdminRoute from "./components/AdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VenuePage from "./pages/VenuePage";
import "./App.css";

function App() {
  const {
    isAuthenticated,
    isAdmin,
  } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated
            ? (
              <Navigate
                to={isAdmin ? "/admin" : "/"}
                replace
              />
            )
            : <Login />
        }
      />

      <Route
        path="/register"
        element={
          isAuthenticated
            ? (
              <Navigate
                to={isAdmin ? "/admin" : "/"}
                replace
              />
            )
            : <Register />
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <VenuePage />
          </ProtectedRoute>
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
        path="*"
        element={
          <Navigate
            to={
              isAuthenticated
                ? isAdmin
                  ? "/admin"
                  : "/"
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