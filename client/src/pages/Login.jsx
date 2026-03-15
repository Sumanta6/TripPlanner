import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import axios from "axios";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const googleInit = useRef(false);

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ======================
  // GOOGLE LOGIN RESPONSE
  // ======================
  const handleGoogleResponse = useCallback(async (response) => {
    try {
      await axios.post(
        "http://localhost:8000/accounts/google-login/",
        { token: response.credential },
        { withCredentials: true }
      );

      localStorage.setItem("is_logged_in", "true");
      navigate("/");
    } catch {
      setError("Google login failed");
    }
  }, [navigate]);

  // ======================
  // GOOGLE BUTTON LOAD
  // ======================
  useEffect(() => {
    const interval = setInterval(() => {
      const btn = document.getElementById("google-btn");

      if (window.google && btn) {
        if (!googleInit.current) {
          window.google.accounts.id.initialize({
            client_id: "320492427698-7se212gnd06b14a41a3jsca1sqiv4pn7.apps.googleusercontent.com",
            callback: handleGoogleResponse,
          });
          googleInit.current = true;
        }

        try {
          window.google.accounts.id.renderButton(btn, {
            theme: "outline",
            size: "large",
            width: 320,
          });
        } catch (e) {
          console.error("Google button render error:", e);
        }

        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [handleGoogleResponse]);

  // ======================
  // NORMAL LOGIN
  // ======================
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post(
        "http://localhost:8000/accounts/login/",
        form,
        { withCredentials: true }
      );

      localStorage.setItem("is_logged_in", "true");
      navigate("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <button className="close-btn" onClick={() => navigate("/")}>✕</button>

        <h2>Log In</h2>

        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            required
          />

          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
              required
            />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />
              Remember me
            </label>

            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>

        <div className="google-divider"><span>OR</span></div>

        <div id="google-btn"></div>

        <p className="login-footer">
          Don’t have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;