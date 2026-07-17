import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import axios from "axios";

import { registerUser } from "../api/authApi";
import "./Auth.css";

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await registerUser(normalizedUsername, password);

      navigate("/login", {
        replace: true,
        state: {
          message: "Registration completed. You can now log in.",
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        setErrorMessage(
          typeof detail === "string"
            ? detail
            : "Registration failed."
        );
      } else {
        setErrorMessage("Registration failed. Please try again.");
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
          <h1>Create Account</h1>
          <p>Register to access the venue seat map.</p>
        </div>

        {errorMessage && (
          <div className="auth-message auth-error">
            {errorMessage}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="register-username">Username</label>

          <input
            id="register-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder="Choose a username"
            disabled={isSubmitting}
          />

          <label htmlFor="register-password">Password</label>

          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="Choose a password"
            disabled={isSubmitting}
          />

          <button
            className="auth-submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Account..." : "Register"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;