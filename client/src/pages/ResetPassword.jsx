import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../components/AuthModal.css";

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        `http://127.0.0.1:8000/accounts/reset-password/${uid}/${token}/`,
        { password },
        { withCredentials: true }
      );

      setMessage("Password reset successful. Redirecting to login...");

      setTimeout(() => {
        navigate("/?login=true");
      }, 2500);

    } catch {
      setError("Invalid or expired reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" style={{ background: "#0f172a" }}>
      <div className="auth-box">
        <span className="close" onClick={() => window.location.href = "http://localhost:3000"}>✕</span>

        <h2>Reset Password</h2>
        <p style={{ textAlign: "center", marginBottom: "16px", color: "#666" }}>Enter your new password below.</p>

        {error && <p className="error-text">{error}</p>}
        {message && <p className="error-text" style={{ color: "#16a34a" }}>{message}</p>}

        <form onSubmit={handleSubmit}>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <div className="password-wrapper">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <span
              className="toggle-password"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
