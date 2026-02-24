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
    <div className="landing-page-container">
      {/* ===== HERO ===== */}
      <div
        className="landing-hero"
        style={{ backgroundImage: `url(${backgrounds[bgIndex]})` }}
      >
        <div className="hero-overlay" />

        {/* Logo */}
        <div className="brand-logo">TripPlanner</div>

        <div className="hero-content">
          <h1>
            Plan Smart. <span className="highlight">Travel Better.</span>
          </h1>

          <p className="hero-subtitle">
            AI-powered travel planning that builds trips around your time, budget, and interests. Unroll your perfect Nepal adventure in seconds.
          </p>

          <div className="hero-actions">
            <button className="btn-primary" onClick={() => setShowAuth(true)}>
              Start Planning
            </button>
          </div>
        </div>


      </div>

      {/* ===== FEATURES SECTION ===== */}
      <section className="features-section">
        <div className="section-header">
          <h2>Everything you need for the perfect trip</h2>
          <p>Intelligent travel planning powered by AI, designed to make your Nepal adventure unforgettable.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon bg-blue">🤖</div>
            <h3>AI Trip Generator</h3>
            <p>Get day-by-day travel plans instantly, tailored to your distinct preferences, time, and budget.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-teal">💰</div>
            <h3>Smart Budgeting</h3>
            <p>Real-time cost optimization with extremely accurate local pricing and continuous budget tracking.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-orange">🧭</div>
            <h3>Discover Destinations</h3>
            <p>Find hidden gems, local favorites, and rich cultural experiences to match your travel style.</p>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="final-cta-section">
        <div className="cta-content">
          <h2>Ready to pack your bags?</h2>
          <p>Join thousands of travelers exploring the world beautifully and effortlessly.</p>
          <button className="btn-primary large" onClick={() => setShowAuth(true)}>
            Create Your First Trip
          </button>
        </div>
      </section>

      {/* ===== AUTH MODAL ===== */}
      {showAuth && (
        <AuthModal
          close={() => setShowAuth(false)}
          setIsLoggedIn={setIsLoggedIn}
        />
      )}
    </div>
  );
}
