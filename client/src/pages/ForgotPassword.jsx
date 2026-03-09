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
    setLoading(true);

    try {
      await axios.post(
        "http://127.0.0.1:8000/accounts/forgot-password/",
        { email },
        { withCredentials: true }
      );
      setMessage("If an account with this email exists, a password reset link has been sent.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-box">
        <span className="close" onClick={() => { close(); openLogin(); }}>✕</span>

        <h2>Forgot Password</h2>
        <p style={{ textAlign: "center", marginBottom: "16px", color: "#666" }}>
          Enter your email and we'll send you a reset link.
        </p>

        {error && <p className="error-text">{error}</p>}
        {message && <p className="error-text" style={{ color: "#16a34a" }}>{message}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="toggle">
          Remember your password?{' '}
          <span onClick={() => { close(); openLogin(); }}>Back to Login</span>
        </p>
      </div>
    </div>
  );
}