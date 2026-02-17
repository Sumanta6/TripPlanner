import { useState } from "react";
import axios from "axios";
import "../components/AuthModal.css";

export default function ForgotPassword({ close, openLogin }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      setLoading(true);
      await axios.post(
        "http://127.0.0.1:8000/accounts/forgot-password/",
        { email }
      );

      setMessage(
        "If an account with this email exists, a reset link has been sent."
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-box">
        {/* ✅ FIXED CLOSE BUTTON */}
        <span
          className="close"
          onClick={() => {
            close();       // close forgot modal
            openLogin();   // reopen login modal
          }}
        >
          ✕
        </span>

        <h2>Forgot Password</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}