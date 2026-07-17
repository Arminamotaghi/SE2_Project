import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VenuePage from "./pages/VenuePage";
import "./App.css";

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to="/" replace />
            : <Login />
        }
      />

      <Route
        path="/register"
        element={
          isAuthenticated
            ? <Navigate to="/" replace />
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
        path="*"
        element={
          <Navigate
            to={isAuthenticated ? "/" : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;