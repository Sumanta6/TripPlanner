import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import {
  FaMapMarkerAlt, FaUsers, FaRoute, FaCalendarCheck,
  FaRobot, FaMoneyBillWave, FaCompass, FaStar,
  FaChevronDown, FaArrowRight, FaShieldAlt,
} from "react-icons/fa";
import "./Landing.css";

/* ── Data ─────────────────────────────────────────────────────────────── */
const HERO_SLIDES = [
  {
    img: "/images/hero-everest.jpg",
    title: <>Plan Your Perfect Trip<br /><span className="hero-highlight">Across Nepal</span></>,
    sub: "AI-powered travel planning that builds custom itineraries around your time, budget, and interests.",
  },
  {
    img: "/images/raimond-klavins-KKm1ua7MSf0-unsplash.jpg",
    title: <>Discover the<br /><span className="hero-highlight">Beauty of Nepal</span></>,
    sub: "From the serene lakes of Pokhara to the rooftop of the world — explore every corner effortlessly.",
  },
  {
    img: "/images/hero-stupa.jpg",
    title: <>Experience Rich<br /><span className="hero-highlight">Culture & Heritage</span></>,
    sub: "Immerse yourself in ancient temples, vibrant festivals, and local traditions across Nepal.",
  },
];

const STATS = [
  { icon: <FaMapMarkerAlt />, value: "50+", label: "Destinations" },
  { icon: <FaUsers />, value: "8,500+", label: "Happy Travelers" },
  { icon: <FaShieldAlt />, value: "120+", label: "Expert Guides" },
  { icon: <FaRoute />, value: "3,200+", label: "Itineraries Created" },
];

const DESTINATIONS = [
  {
    name: "Kathmandu",
    tagline: "City of Temples",
    desc: "Explore ancient Durbar Squares, sacred stupas, and vibrant bazaars in the capital of Nepal.",
    img: "/images/raimond-klavins-59Al83Zjtf8-unsplash.jpg",
  },
  {
    name: "Pokhara",
    tagline: "Valley of Lakes",
    desc: "Paraglide over Phewa Lake with Annapurna in the backdrop — Nepal's adventure capital.",
    img: "/images/meera-pankhania-7cENZhgyf7c-unsplash.jpg",
  },
  {
    name: "Everest Region",
    tagline: "Top of the World",
    desc: "Trek to Everest Base Camp and witness the world's highest peaks up close.",
    img: "/images/sabin-kumar-3YJwXr_xh8E-unsplash.jpg",
  },
  {
    name: "Mustang",
    tagline: "Desert Kingdom",
    desc: "Step into the mystical walled city of Lo Manthang in the rain-shadow desert plateau.",
    img: "/images/chandan-chaurasia-tM7p9GOBPwk-unsplash.jpg",
  },
  {
    name: "Chitwan",
    tagline: "Wildlife Sanctuary",
    desc: "Spot one-horned rhinos and Bengal tigers on a jungle safari in Chitwan National Park.",
    img: "/images/vince-russell-FXVY6ZIOkhM-unsplash.jpg",
  },
  {
    name: "Lumbini",
    tagline: "Birthplace of Buddha",
    desc: "Walk in the footsteps of the Buddha at this sacred UNESCO World Heritage Site.",
    img: "/images/kabita-darlami-v_iTE6Zy28A-unsplash.jpg",
  },
];

const STEPS = [
  { num: "01", icon: <FaMapMarkerAlt />, title: "Choose Your Destination", desc: "Pick from 50+ verified Nepal destinations — from mountain treks to cultural heritage sites." },
  { num: "02", icon: <FaRobot />, title: "Generate AI Itinerary", desc: "Our AI crafts a custom day-by-day plan based on your budget, dates, and travel style." },
  { num: "03", icon: <FaUsers />, title: "Connect with a Guide", desc: "Get matched with a certified local guide who knows your destination inside out." },
  { num: "04", icon: <FaCalendarCheck />, title: "Enjoy Your Trip", desc: "Travel confidently with your personalized plan, local support, and real-time assistance." },
];

const FEATURES = [
  { icon: <FaRobot />, color: "#4f7cff", bg: "rgba(79,124,255,0.1)", title: "AI Trip Generator", desc: "Get day-by-day plans instantly, tailored to your preferences, time, and budget." },
  { icon: <FaMoneyBillWave />, color: "#10b981", bg: "rgba(16,185,129,0.1)", title: "Smart Budgeting", desc: "Real-time cost optimization with accurate local pricing and continuous budget tracking." },
  { icon: <FaCompass />, color: "#f59e0b", bg: "rgba(245,158,11,0.1)", title: "Discover Hidden Gems", desc: "Find local favorites and rich cultural experiences that match your travel style." },
];

/* ── Scroll-reveal hook ───────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("revealed"); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Sub-components ──────────────────────────────────────────────────── */
function RevealSection({ children, className = "" }) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal-section ${className}`}>{children}</div>;
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function Landing({ setIsLoggedIn }) {
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [slideIdx, setSlideIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-open login from route state / query params
  useEffect(() => {
    if (location.state?.openLogin) { setAuthMode("login"); setShowAuth(true); return; }
    const p = new URLSearchParams(location.search);
    const m = p.get("mode");
    if (m === "login" || m === "register") { setAuthMode(m); setShowAuth(true); }
  }, [location.state, location.search]);

  // Hero slider
  useEffect(() => {
    const id = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setSlideIdx(i => (i + 1) % HERO_SLIDES.length);
        setIsTransitioning(false);
      }, 600);
    }, 5500);
    return () => clearInterval(id);
  }, []);

  const openAuth = (mode) => { setAuthMode(mode); setShowAuth(true); };

  const slide = HERO_SLIDES[slideIdx];

  return (
    <div className="lp-root">

      {/* ═══════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════ */}
      <section className="lp-hero">
        <div
          className={`lp-hero-bg ${isTransitioning ? "fade-out" : "fade-in"}`}
          style={{ backgroundImage: `url(${slide.img})` }}
        />
        <div className="lp-hero-overlay" />

        {/* Dot indicators */}
        <div className="lp-hero-dots">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              className={`hero-dot ${i === slideIdx ? "active" : ""}`}
              onClick={() => setSlideIdx(i)}
            />
          ))}
        </div>

        <div className="lp-hero-content">
          <div className="lp-hero-badge">🇳🇵 Nepal's #1 Travel Planner</div>
          <h1 className="lp-hero-title">{slide.title}</h1>
          <p className="lp-hero-sub">{slide.sub}</p>

          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={() => openAuth("login")}>
              Plan Your Trip <FaArrowRight className="btn-icon" />
            </button>
            <a className="lp-btn-outline" href="http://localhost:3001/register">
              Become a Guide
            </a>
          </div>

          <div className="lp-hero-trust">
            <div className="trust-stars">
              {[1, 2, 3, 4, 5].map(n => <FaStar key={n} />)}
            </div>
            <span>Trusted by 8,500+ travelers across Nepal</span>
          </div>
        </div>

        <a href="#stats" className="lp-scroll-indicator">
          <span>Scroll to explore</span>
          <FaChevronDown className="scroll-chevron" />
        </a>
      </section>

      {/* ═══════════════════════════════════════════════════════
          STATS BAR
      ═══════════════════════════════════════════════════════ */}
      <section className="lp-stats-bar" id="stats">
        {STATS.map(s => (
          <div className="lp-stat-item" key={s.label}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ═══════════════════════════════════════════════════════
          DESTINATIONS
      ═══════════════════════════════════════════════════════ */}
      <section className="lp-section lp-destinations">
        <RevealSection>
          <div className="lp-section-badge">🗺️ Explore Nepal</div>
          <h2 className="lp-section-title">Popular Destinations</h2>
          <p className="lp-section-sub">From towering Himalayan peaks to lush jungles and ancient temples — discover Nepal's most breathtaking destinations.</p>
        </RevealSection>

        <div className="lp-dest-grid">
          {DESTINATIONS.map((dest, i) => (
            <RevealSection key={dest.name} className={`dest-reveal-delay-${i}`}>
              <div className="lp-dest-card">
                <div className="dest-img-wrap">
                  <img
                    src={dest.img}
                    alt={dest.name}
                    className="dest-img"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "/images/hero-nepal-premium.png";
                    }}
                  />
                  <div className="dest-img-overlay">
                    <h3>{dest.name}</h3>
                    <span className="dest-tagline">{dest.tagline}</span>
                  </div>
                </div>
                <div className="dest-card-body">
                  <p>{dest.desc}</p>
                  <button className="dest-explore-btn" onClick={() => openAuth("login")}>
                    Explore <FaArrowRight />
                  </button>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════════════ */}
      <section className="lp-section lp-hiw">
        <RevealSection>
          <div className="lp-section-badge">⚡ Simple Process</div>
          <h2 className="lp-section-title">How It Works</h2>
          <p className="lp-section-sub">Plan your entire Nepal adventure in under 5 minutes — no travel agent needed.</p>
        </RevealSection>

        <div className="lp-steps-grid">
          {STEPS.map((step, i) => (
            <RevealSection key={step.num} className={`step-reveal-delay-${i}`}>
              <div className="lp-step-card">
                <div className="step-num">{step.num}</div>
                <div className="step-icon-circle">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
                {i < STEPS.length - 1 && <div className="step-connector" />}
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════════════ */}
      <section className="lp-section lp-features">
        <RevealSection>
          <div className="lp-section-badge">✨ Why TripPlanner</div>
          <h2 className="lp-section-title">Everything You Need for the Perfect Trip</h2>
          <p className="lp-section-sub">Intelligent travel planning powered by AI, designed to make your Nepal adventure unforgettable.</p>
        </RevealSection>

        <div className="lp-features-grid">
          {FEATURES.map((f, i) => (
            <RevealSection key={f.title} className={`feat-reveal-delay-${i}`}>
              <div className="lp-feature-card">
                <div className="feat-icon-wrap" style={{ color: f.color, background: f.bg }}>
                  {f.icon}
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          GUIDE PROMO
      ═══════════════════════════════════════════════════════ */}
      <section className="lp-guide-promo">
        <RevealSection className="guide-promo-inner">
          <div className="guide-promo-text">
            <div className="lp-section-badge" style={{ color: "#fbbf24", borderColor: "rgba(251,191,36,0.3)" }}>🧭 For Local Guides</div>
            <h2>Turn Your Expertise Into a Career</h2>
            <p>Are you a passionate local guide who knows Nepal inside out? Join our growing community of certified travel guides and connect with thousands of eager travelers.</p>
            <ul className="guide-benefits">
              <li><FaCalendarCheck className="benefit-icon" /> Flexible schedule — work on your terms</li>
              <li><FaMoneyBillWave className="benefit-icon" /> Earn competitive income per trip</li>
              <li><FaStar className="benefit-icon" /> Build your reputation with traveler reviews</li>
              <li><FaShieldAlt className="benefit-icon" /> Verified guide badge for credibility</li>
            </ul>
            <div className="guide-promo-actions">
              <a className="lp-btn-gold" href="http://localhost:3001/register">
                Join as a Guide <FaArrowRight className="btn-icon" />
              </a>
              <a className="lp-btn-ghost-white" href="http://localhost:3001/login">
                Guide Login
              </a>
            </div>
          </div>
          <div className="guide-promo-visual">
            <div className="guide-avatar-stack">
              <div className="guide-avatar" style={{ background: "linear-gradient(135deg,#4f7cff,#7c3aed)" }}>SG</div>
              <div className="guide-avatar" style={{ background: "linear-gradient(135deg,#10b981,#047857)" }}>ST</div>
              <div className="guide-avatar" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>PK</div>
            </div>
            <div className="guide-stat-cards">
              <div className="guide-stat-card">
                <span className="gs-num">120+</span>
                <span className="gs-label">Active Guides</span>
              </div>
              <div className="guide-stat-card">
                <span className="gs-num">4.9★</span>
                <span className="gs-label">Avg. Rating</span>
              </div>
              <div className="guide-stat-card">
                <span className="gs-num">NPR 85K</span>
                <span className="gs-label">Avg. Monthly</span>
              </div>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════ */}
      <section className="lp-final-cta">
        <RevealSection>
          <div className="final-cta-badge">🚀 Start Today</div>
          <h2>Ready to Pack Your Bags?</h2>
          <p>Join 8,500+ travelers who've already explored Nepal with TripPlanner. Your perfect trip is just a few clicks away.</p>
          <div className="lp-hero-actions" style={{ justifyContent: "center" }}>
            <button className="lp-btn-primary" onClick={() => openAuth("register")}>
              Create Your Free Account <FaArrowRight className="btn-icon" />
            </button>
            <button className="lp-btn-outline-dark" onClick={() => openAuth("login")}>
              Sign In
            </button>
          </div>
        </RevealSection>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-bottom">
          <p>© 2026 TripPlanner. All rights reserved. Made with ❤️ in Nepal.</p>
          <div className="footer-policy-links">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>FAQ</span>
          </div>
        </div>
      </footer>

      {/* AUTH MODAL */}
      {showAuth && (
        <AuthModal
          close={() => setShowAuth(false)}
          setIsLoggedIn={setIsLoggedIn}
          mode={authMode}
        />
      )}
    </div>
  );
}
