import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./Home.css";

function Home() {
  const [showAuth, setShowAuth] = useState(false);

  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);

  const location = useLocation();

  // 🔥 OPEN LOGIN MODAL AFTER PASSWORD RESET
  useEffect(() => {
    if (location.state?.openLogin) {
      setShowAuth(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // ✅ LOAD USER DATA AFTER LOGIN
  useEffect(() => {
    fetch("http://127.0.0.1:8000/accounts/dashboard/", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setTrips(data.trips);
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  return (
    <div className="home">
      {/* ======================
          ✅ LOGGED-IN USER VIEW
         ====================== */}
      {user && (
        <section className="dashboard">
          <h2>Welcome, {user.username} 👋</h2>

          <h3>Your Planned Trips</h3>

          {trips.length === 0 ? (
            <p>No trips planned yet.</p>
          ) : (
            trips.map((trip) => (
              <div key={trip.id} className="trip-card">
                <strong>{trip.from_city}</strong> →{" "}
                <strong>{trip.to_city}</strong>
                <p>
                  {trip.start_date} – {trip.end_date}
                </p>
              </div>
            ))
          )}
        </section>
      )}

      {/* ======================
          🔴 FALLBACK UI (KEEP AS IS)
         ====================== */}
      {!user && (
        <>
          <section className="hero">
            <span className="hero-badge">
              ✨ Your AI-Powered Travel Companion
            </span>

            <h1 className="hero-title">
              Plan Your Dream <br />
              <span>Adventure Today</span>
            </h1>

            <p className="hero-subtitle">
              Tell us where you want to go in Nepal, your budget, and how long
              you’ll stay.
            </p>

            <div className="hero-actions">
              <button className="btn-primary">
                Start Planning
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Home;
