import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import AuthModal from "./AuthModal";
import "./Navbar.css";

export default function Navbar({ isLoggedIn, setIsLoggedIn, userEmail }) {
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Handle Scroll Effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sync Login State
  useEffect(() => {
    const loggedIn =
      localStorage.getItem("isLoggedIn") === "true" ||
      sessionStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedIn);
  }, [setIsLoggedIn]);

  // Close menus on route change
  useEffect(() => {
    setShowMobileMenu(false);
    setShowProfile(false);
  }, [location]);

  // Logout Function
  const logout = async () => {
    try {
      await fetch("http://127.0.0.1:8000/accounts/logout/", {
        method: "POST",
        credentials: "include",
      });
    } catch { }

    localStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  return (
    <>
      <nav className={`navbar ${isScrolled ? "scrolled" : ""}`}>
        <div className="navbar-container">
          {/* LEFT: LOGO */}
          <Link to="/home" className="logo">
            <span className="logo-icon">✈️</span>
            <span className="logo-text">TripPlanner</span>
          </Link>

          {/* CENTER: CORE NAVIGATION (Desktop Only) */}
          <div className="nav-menu-core">
            <Link to="/home" className={`nav-link ${location.pathname === "/home" ? "active" : ""}`}>Home</Link>
            <Link to="/destinations" className={`nav-link ${location.pathname === "/destinations" ? "active" : ""}`}>Destinations</Link>
            <Link to="/plan-trip" className={`nav-link ${location.pathname === "/plan-trip" ? "active" : ""}`}>AI Planner</Link>
            {isLoggedIn && (
              <Link to="/profile" className={`nav-link ${location.pathname === "/profile" ? "active" : ""}`}>My Trips</Link>
            )}
          </div>

          {/* RIGHT: ACTIONS & HAMBURGER */}
          <div className="nav-actions">
            {!isLoggedIn ? (
              <div className="auth-buttons">
                <button className="btn-login" onClick={() => setShowAuth(true)}>Log In</button>
                <button className="btn-signup" onClick={() => setShowAuth(true)}>Sign Up</button>
              </div>
            ) : (
              <div className="profile-wrapper">
                <button
                  className="profile-btn"
                  onClick={() => setShowProfile(!showProfile)}
                  aria-label="User Profile"
                >
                  <div className="avatar-circle">
                    {userEmail ? userEmail[0].toUpperCase() : "U"}
                    {/* Notification Dot */}
                    <span className="notification-dot"></span>
                  </div>
                </button>

                {/* PROFILE DROPDOWN */}
                <div className={`profile-dropdown ${showProfile ? "show" : ""}`}>
                  <div className="dropdown-header">
                    <span className="user-email">{userEmail || "User"}</span>
                  </div>
                  <Link to="/profile" className="dropdown-item">
                    <span className="icon">👤</span> My Profile
                  </Link>
                  <Link to="/profile" className="dropdown-item">
                    <span className="icon">❤️</span> Saved Trips
                  </Link>
                  <Link to="/profile" className="dropdown-item">
                    <span className="icon">⚙️</span> Settings
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button onClick={logout} className="dropdown-item logout-btn">
                    <span className="icon">🚪</span> Logout
                  </button>
                </div>
              </div>
            )}

            {/* HAMBURGER MENU TOGGLE (Secondary Navigation) */}
            <button
              className={`hamburger-btn ${showMobileMenu ? "active" : ""}`}
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Menu"
            >
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </button>
          </div>
        </div>

        {/* SIDE MENU OVERLAY */}
        <div className={`side-menu-overlay ${showMobileMenu ? "open" : ""}`} onClick={() => setShowMobileMenu(false)}></div>

        {/* SIDE MENU PANEL */}
        <div className={`side-menu ${showMobileMenu ? "open" : ""}`}>
          <div className="side-menu-header">
            {isLoggedIn ? (
              <div className="side-profile-section">
                <div className="side-avatar">
                  {userEmail ? userEmail[0].toUpperCase() : "U"}
                </div>
                <div className="side-user-info">
                  <span className="side-welcome">Welcome back,</span>
                  <span className="side-email">{userEmail || "Traveler"}</span>
                </div>
              </div>
            ) : (
              <h3>Menu</h3>
            )}
            <button className="close-btn" onClick={() => setShowMobileMenu(false)}>×</button>
          </div>

          <div className="side-menu-content">
            {/* Core Links (Visible here only on Mobile) */}
            <div className="mobile-only-links">
              <Link to="/home">Home</Link>
              <Link to="/destinations">Destinations</Link>
              <Link to="/plan-trip">AI Planner</Link>
              {isLoggedIn && <Link to="/profile">My Trips</Link>}
              <div className="side-divider"></div>
            </div>

            {/* Secondary Links (Always visible in side menu) */}
            <div className="secondary-links">
              <Link to="/how-it-works" className="secondary-link">
                <span className="icon">💡</span> How It Works
              </Link>
              <Link to="/blog" className="secondary-link">
                <span className="icon">✍️</span> Blog
              </Link>
              <Link to="/contact" className="secondary-link">
                <span className="icon">📞</span> Contact Us
              </Link>
              <Link to="#" className="secondary-link">
                <span className="icon">❓</span> FAQ
              </Link>
              <Link to="#" className="secondary-link">
                <span className="icon">⭐</span> Reviews
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* AUTH MODAL */}
      {showAuth && (
        <AuthModal
          close={() => setShowAuth(false)}
          setIsLoggedIn={setIsLoggedIn}
        />
      )}
    </>
  );
}
