import { useState, useEffect } from "react";
import AuthModal from "./AuthModal";
import "./Navbar.css";

export default function Navbar({
  isLoggedIn,
  setIsLoggedIn,
  userEmail,
}) {
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // =========================
  // SYNC LOGIN STATE ON LOAD
  // =========================
  useEffect(() => {
    const loggedIn =
      localStorage.getItem("isLoggedIn") === "true" ||
      sessionStorage.getItem("isLoggedIn") === "true";

    setIsLoggedIn(loggedIn);
  }, [setIsLoggedIn]);

  // =========================
  // LOGOUT
  // =========================
  const logout = async () => {
    try {
      await fetch("http://127.0.0.1:8000/accounts/logout/", {
        method: "POST",
        credentials: "include",
      });
    } catch {}

    // clear ALL auth-related storage
    localStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");

    setIsLoggedIn(false);
    window.location.href = "/";
  };

  return (
    <>
      <nav className="navbar">
        <div className="logo">TripPlanner</div>

        <div className="nav-links">
          <button>Home</button>
          <button>Plan Trip</button>
          <button>Destinations</button>
          <button>How It Works</button>
          <button>Blog</button>
        </div>

        <div className="nav-actions">
          {!isLoggedIn ? (
            <>
              <button onClick={() => setShowAuth(true)}>Log In</button>
              <button className="cta" onClick={() => setShowAuth(true)}>
                Start Planning
              </button>
            </>
          ) : (
            <div className="dropdown">
              <button
                className="profile-btn"
                onClick={() => setShowProfile((p) => !p)}
              >
                👤
              </button>

              {showProfile && (
                <div className="dropdown-menu right">
                  <div className="profile-email">
                    {userEmail || "Logged in"}
                  </div>
                  <button onClick={logout}>Logout</button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {showAuth && (
        <AuthModal
          close={() => setShowAuth(false)}
          setIsLoggedIn={setIsLoggedIn}
        />
      )}
    </>
  );
}
