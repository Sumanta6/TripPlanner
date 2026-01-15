import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import "./Landing.css";

const backgrounds = [
  "/images/himal.jpg",
  "/images/bhaktapur.jpg",
  "/images/pasupati.jpg",
];

export default function Landing({ setIsLoggedIn }) {
  const location = useLocation();

  const [showAuth, setShowAuth] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

  // =========================
  // AUTO OPEN LOGIN AFTER RESET
  // =========================
  useEffect(() => {
    if (location.state?.openLogin) {
      setShowAuth(true);
    }
  }, [location.state]);

  // =========================
  // BACKGROUND SLIDER
  // =========================
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* ===== HERO ===== */}
      <div
        className="landing-hero"
        style={{ backgroundImage: `url(${backgrounds[bgIndex]})` }}
      >
        <div className="overlay" />

        {/* Logo only */}
        <div className="brand">TripPlanner</div>

        <div className="hero-content">
          <h1>
            Discover Nepal <br />
            <span>Your Way</span>
          </h1>

          <p>
            AI-powered travel planning that builds trips around your
            time, budget, and interests.
          </p>

          <button onClick={() => setShowAuth(true)}>
            Start Planning
          </button>
        </div>

        <div className="scroll-hint">Scroll ↓</div>
      </div>

      {/* ===== SCROLL SECTION ===== */}
      <section className="story-section">
        <h2>Travel without the stress</h2>

        <p>
          From mountains to heritage cities, TripPlanner creates
          personalized itineraries so you can focus on the journey,
          not the planning.
        </p>

        <img
          src="/images/bhaktapur.jpg"
          alt="Bhaktapur"
          className="story-image"
        />

        <div className="story-cards">
          <div className="card">
            <h4>Smart Itineraries</h4>
            <p>Day-by-day AI generated travel plans</p>
          </div>

          <div className="card">
            <h4>Local Budgets</h4>
            <p>Optimized for real travel costs</p>
          </div>

          <div className="card">
            <h4>One Platform</h4>
            <p>Plan, save, and manage trips easily</p>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="final-cta">
        <h2>Your next journey starts here</h2>
        <button onClick={() => setShowAuth(true)}>
          Create Your Trip
        </button>
      </section>

      {/* ===== AUTH MODAL ===== */}
      {showAuth && (
        <AuthModal
          close={() => setShowAuth(false)}
          setIsLoggedIn={setIsLoggedIn}
        />
      )}
    </>
  );
}
