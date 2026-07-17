import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import axios from "axios";

import { useAuth } from "../auth/AuthContext";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const successMessage = location.state?.message || "";

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      setErrorMessage("Username and password are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await login(normalizedUsername, password);
      navigate("/", { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        setErrorMessage(
          typeof detail === "string"
            ? detail
            : "Invalid username or password."
        );
      } else {
        setErrorMessage("Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-heading">
          <p className="auth-eyebrow">Online Ticketing</p>
          <h1>Welcome Back</h1>
          <p>Log in to select and book your seat.</p>
        </div>

        {successMessage && (
          <div className="auth-message auth-success">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="auth-message auth-error">
            {errorMessage}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-username">Username</label>

          <input
            id="login-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder="Enter your username"
            disabled={isSubmitting}
          />

          <label htmlFor="login-password">Password</label>

          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={isSubmitting}
          />

          <button
            className="auth-submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging In..." : "Login"}
          </button>
        </form>

        <p className="auth-footer">
          Do not have an account?{" "}
          <Link to="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;