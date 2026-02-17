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

      {/* ===== FEATURES SECTION ===== */}
      <section className="features-section">
        <div className="features-header">
          <h2>Everything you need for the perfect trip</h2>
          <p>
            Intelligent travel planning powered by AI, designed to make
            your Nepal adventure unforgettable.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>Smart Itineraries</h3>
            <p>AI-powered day-by-day travel plans tailored to your preferences, time, and budget</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Local Budgets</h3>
            <p>Real-time cost optimization with accurate local pricing and budget tracking</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>One Platform</h3>
            <p>Plan, save, edit, and manage all your trips in one beautiful interface</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🏔️</div>
            <h3>Local Expertise</h3>
            <p>Discover hidden gems and authentic experiences across Nepal</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Planning</h3>
            <p>Generate complete itineraries in seconds, customize to perfection</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>Flexible Updates</h3>
            <p>Easily modify your plans on the go with real-time adjustments</p>
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
