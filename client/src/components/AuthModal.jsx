import { useState, useEffect, useRef } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import ForgotPassword from "../pages/ForgotPassword";
import { handleUnifiedLoginSuccess } from "../utils/smartAuth";
import "./AuthModal.css";

export default function AuthModal({ close, setIsLoggedIn, mode = "login" }) {
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);
  const googleInit = useRef(false);

  const [isLogin, setIsLogin] = useState(mode !== "register");
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  // keep internal mode in sync when the parent changes it
  useEffect(() => {
    setIsLogin(mode !== "register");
  }, [mode]);

  // =========================
  // INPUT CHANGE
  // =========================
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // =========================
  // GOOGLE LOGIN HANDLER
  // =========================
  const handleGoogleResponse = async (response) => {
    try {
      const res = await fetch(
        "http://localhost:8000/accounts/google-login/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token: response.credential }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Google login failed");
        return;
      }

      close();
      handleUnifiedLoginSuccess(data, true, navigate, setIsLoggedIn);
    } catch {
      setError("Google login failed");
    }
  };

  // =========================
  // GOOGLE BUTTON RENDER
  // =========================
  useEffect(() => {
    if (!isLogin || showForgot) return;
    if (!window.google || !googleBtnRef.current) return;

    googleBtnRef.current.innerHTML = "";

    if (!googleInit.current) {
      window.google.accounts.id.initialize({
        client_id:
          "320492427698-7se212gnd06b14a41a3jsca1sqiv4pn7.apps.googleusercontent.com",
        callback: handleGoogleResponse,
        ux_mode: "popup", // ✅ REQUIRED FIX (NO UI CHANGE)
      });
      googleInit.current = true;
    }

    try {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 300,
      });
    } catch (e) {
      console.error("Google button render error:", e);
    }
  }, [isLogin, showForgot]);

  // =========================
  // LOGIN / REGISTER SUBMIT
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const url = isLogin
      ? "http://localhost:8000/accounts/login/"
      : "http://localhost:8000/accounts/register/";

    const body = isLogin
      ? {
        email: formData.email,
        password: formData.password,
        remember_me: rememberMe,
      }
      : {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        return;
      }

      if (isLogin) {
        close();
        handleUnifiedLoginSuccess(data, rememberMe, navigate, setIsLoggedIn);
      } else {
        alert("Registration successful. Please log in.");
        setIsLogin(true);
        setFormData({
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
      }
    } catch {
      setError("Backend server not reachable");
    }
  };

  // =========================
  // UI (UNCHANGED)
  // =========================
  return (
    <div className="auth-overlay">
      <div className="auth-box">
        {showForgot ? (
          <ForgotPassword
            close={() => setShowForgot(false)}
            openLogin={() => setShowForgot(false)}
          />
        ) : (
          <>
            <span className="close" onClick={close}>✕</span>

            <h2>{isLogin ? "Log In" : "Register"}</h2>

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <input
                  name="username"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              )}

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              {!isLogin && (
                <div className="password-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <span
                    className="toggle-password"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              )}

              {isLogin && (
                <div className="remember-me">
                  <label>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me
                  </label>
                </div>
              )}

              {isLogin && (
                <p
                  className="forgot-link"
                  onClick={() => setShowForgot(true)}
                >
                  Forgot password?
                </p>
              )}

              {error && <p className="error-text">{error}</p>}

              <button type="submit">
                {isLogin ? "Log In" : "Sign Up"}
              </button>
            </form>

            {isLogin && (
              <>
                <div className="divider">OR</div>
                <div className="google-btn-center">
                  <div ref={googleBtnRef}></div>
                </div>
              </>
            )}

            <p className="toggle">
              {isLogin ? "Don’t have an account?" : "Already have an account?"}
              <span
                onClick={() => {
                  setError("");
                  setIsLogin(!isLogin);
                }}
              >
                {isLogin ? " Sign Up" : " Log In"}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
