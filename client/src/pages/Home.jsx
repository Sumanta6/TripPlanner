import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getMyProfile,
  getMyItineraries,
  getMyGuideRequests,
  getGuides,
} from "../services/api";
import api from "../services/api";
import "./Home.css";

/* ─── Scroll Reveal Hook ─────────────────────────────────────────────── */
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("ch-revealed");
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

function RevealSection({ children, className = "", delay = 0 }) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`ch-reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Static Data ────────────────────────────────────────────────────── */
const HERO_IMAGES = [
  "/images/hero-everest.jpg",
  "/images/hero-pokhara.jpg",
  "/images/hero-stupa.jpg",
];

const QUICK_ACTIONS = [
  { id: "plan", icon: "🗺️", label: "Plan a Trip", sub: "AI-powered", to: "/plan-trip", color: "#4f7cff", bg: "rgba(79,124,255,0.1)" },
  { id: "destinations", icon: "🏔️", label: "Explore Destinations", sub: "50+ places", to: "/destinations", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  { id: "guides", icon: "🧭", label: "Find a Guide", sub: "Verified locals", to: "/guides", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { id: "ai", icon: "🤖", label: "AI Planner", sub: "Smart itinerary", to: "/plan-trip", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  { id: "mytrips", icon: "🎒", label: "My Trips", sub: "Your journeys", to: "/my-trips", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  { id: "saved", icon: "❤️", label: "Saved Itineraries", sub: "Wishlist", to: "/saved-trips", color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  { id: "profile", icon: "👤", label: "Profile", sub: "Account settings", to: "/profile", color: "#14b8a6", bg: "rgba(20,184,166,0.1)" },
];

const FEATURED_DESTINATIONS = [
  {
    id: 1,
    name: "Everest Base Camp",
    desc: "Trek through the legendary Khumbu Valley to the foot of the world's highest peak.",
    image: "/images/hero-everest.jpg",
    region: "Khumbu Region",
    season: "Mar–May, Sep–Nov",
    budget: "Mid-Range",
    rating: 4.9,
    tag: "Most Popular",
  },
  {
    id: 2,
    name: "Pokhara",
    desc: "Paraglide over Phewa Lake with the Annapurna range as your backdrop.",
    image: "/images/hero-pokhara.jpg",
    region: "Gandaki Province",
    season: "Oct–Apr",
    budget: "Budget-Friendly",
    rating: 4.8,
    tag: "Top Rated",
  },
  {
    id: 3,
    name: "Kathmandu Valley",
    desc: "Step into a living museum of ancient temples, royal squares, and Buddhist stupas.",
    image: "/images/dest-temple.jpg",
    region: "Bagmati Province",
    season: "Sep–Nov, Mar–May",
    budget: "Budget-Friendly",
    rating: 4.7,
    tag: "Cultural",
  },
  {
    id: 4,
    name: "Upper Mustang",
    desc: "Journey to the forbidden kingdom — an arid Tibetan plateau hidden beyond the Himalayas.",
    image: "/images/dest-mustang.jpg",
    region: "Gandaki Province",
    season: "May–Sep",
    budget: "Luxury",
    rating: 4.9,
    tag: "Hidden Gem",
  },
];

const TRUST_POINTS = [
  { icon: "🤖", title: "AI-Powered Planning", desc: "Generate a full day-by-day itinerary in seconds, tailored to your budget and style." },
  { icon: "✅", title: "Verified Local Guides", desc: "Every guide is vetted, rated, and reviewed by real travelers like you." },
  { icon: "📱", title: "Easy Booking Flow", desc: "Request a guide, attach your itinerary, and confirm — all in one seamless step." },
  { icon: "🇳🇵", title: "Nepal-First Focus", desc: "We specialize exclusively in Nepal travel — no generic platform, just deep local knowledge." },
];

const SMART_SUGGESTIONS = [
  { icon: "🌸", text: "Spring trekking season starts in 3 weeks — perfect for Everest Base Camp!", type: "seasonal" },
  { icon: "💡", text: "You have unfinished itineraries — pick up where you left off.", type: "reminder" },
  { icon: "🧭", text: "5 guides are available for your preferred dates this month.", type: "guide" },
  { icon: "🌟", text: "Pokhara in April: Perfect weather, fewer crowds, best value.", type: "insight" },
];

const SEASONAL_BANNER = {
  title: "Spring Season in Nepal",
  sub: "March–May 2026 · Ideal trekking weather · Rhododendrons in bloom",
  cta: "Explore Spring Destinations",
  badge: "🌸 Now Open",
  gradient: "linear-gradient(135deg, #1e3a8a 0%, #4f7cff 50%, #7c3aed 100%)",
};

/* ─── Greet by Time ──────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function shortDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const navigate = useNavigate();
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroFading, setHeroFading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [itineraries, setItineraries] = useState([]);
  const [guideRequests, setGuideRequests] = useState([]);
  const [guides, setGuides] = useState([]);
  const [trips, setTrips] = useState([]);

  const isLoggedIn =
    localStorage.getItem("isLoggedIn") === "true" ||
    sessionStorage.getItem("isLoggedIn") === "true";

  /* ── Fetch Dashboard Data ── */
  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    let alive = true;
    async function load() {
      try {
        const [profileRes, itinsRes, requestsRes, guidesRes, tripsRes] = await Promise.allSettled([
          getMyProfile(),
          getMyItineraries(),
          getMyGuideRequests(),
          getGuides(),
          api.get("/api/guides/my-trips/").then(r => r.data),
        ]);
        if (!alive) return;
        if (profileRes.status === "fulfilled") setUser(profileRes.value);
        if (itinsRes.status === "fulfilled") setItineraries(Array.isArray(itinsRes.value) ? itinsRes.value : []);
        if (requestsRes.status === "fulfilled") setGuideRequests(Array.isArray(requestsRes.value) ? requestsRes.value : []);
        if (guidesRes.status === "fulfilled") setGuides(Array.isArray(guidesRes.value) ? guidesRes.value.filter(g => g.availability_badge === "Available").slice(0, 3) : []);
        if (tripsRes.status === "fulfilled") setTrips(Array.isArray(tripsRes.value) ? tripsRes.value : []);
      } catch { }
      finally { if (alive) setLoading(false); }
    }
    load();
    return () => { alive = false; };
  }, [isLoggedIn]);

  /* ── Hero Carousel ── */
  useEffect(() => {
    const id = setInterval(() => {
      setHeroFading(true);
      setTimeout(() => {
        setHeroIdx(i => (i + 1) % HERO_IMAGES.length);
        setHeroFading(false);
      }, 600);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  /* ── Computed ── */
  const displayName = user?.full_name || user?.username || user?.first_name || "Traveler";
  const avatarInitial = displayName[0]?.toUpperCase() || "T";
  const upcomingTrips = trips.filter(t => new Date(t.trip_start) >= new Date());
  const completedTrips = trips.filter(t => new Date(t.trip_end) < new Date());
  const confirmedBookings = guideRequests.filter(r => r.status === "accepted");
  const recentItin = itineraries[0];

  /* ── Activity Timeline items ── */
  const activityItems = [
    ...itineraries.slice(0, 2).map(it => ({
      id: `itin-${it.id}`,
      emoji: "📋",
      text: `Itinerary saved: ${it.destination || it.title || "Trip"}`,
      time: it.created_at,
      bg: "rgba(79,124,255,0.15)",
    })),
    ...guideRequests.slice(0, 2).map(r => ({
      id: `req-${r.id}`,
      emoji: r.status === "accepted" ? "✅" : "🧭",
      text: r.status === "accepted"
        ? `Guide booking confirmed for ${r.destination}`
        : `Guide requested for ${r.destination}`,
      time: r.created_at,
      bg: r.status === "accepted" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

  /* ── Summary cards ── */
  const summaryCards = [
    { label: "Upcoming Trips", value: upcomingTrips.length, icon: "🗺️", color: "#4f7cff", bg: "rgba(79,124,255,0.1)" },
    { label: "Saved Itineraries", value: itineraries.length, icon: "📋", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
    { label: "Booked Guides", value: confirmedBookings.length, icon: "🧭", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
    { label: "Completed Trips", value: completedTrips.length, icon: "✅", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    { label: "Wishlist", value: itineraries.length, icon: "❤️", color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  ];

  if (loading) {
    return (
      <div className="ch-loading">
        <div className="ch-spinner" />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="ch-root">

      {/* ══════════════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════════════ */}
      <section className="ch-hero">
        {HERO_IMAGES.map((img, i) => (
          <div
            key={i}
            className={`ch-hero-bg ${i === heroIdx ? (heroFading ? "ch-fade-out" : "ch-fade-in") : "ch-fade-out"}`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
        <div className="ch-hero-overlay" />

        <div className="ch-hero-content">
          {isLoggedIn && user ? (
            /* ── Logged-in Personalized Hero ── */
            <div className="ch-hero-dashboard">
              <div className="ch-welcome-glass">
                <div className="ch-welcome-left">
                  <div className="ch-avatar-ring">
                    <div className="ch-avatar-circle">{avatarInitial}</div>
                    <span className="ch-avatar-badge">✈️</span>
                  </div>
                  <div className="ch-welcome-text">
                    <p className="ch-greeting">{getGreeting()},</p>
                    <h1 className="ch-username">{displayName} 👋</h1>
                    <p className="ch-tagline">
                      {upcomingTrips.length > 0
                        ? `You have ${upcomingTrips.length} upcoming trip${upcomingTrips.length > 1 ? "s" : ""} — let's make them unforgettable.`
                        : "Ready to plan your next Nepal adventure?"}
                    </p>
                  </div>
                </div>
                <div className="ch-welcome-actions">
                  <Link to="/plan-trip" className="ch-hero-btn-primary">
                    <span>🤖</span> Plan New Trip
                  </Link>
                  <Link to="/destinations" className="ch-hero-btn-ghost">
                    Explore
                  </Link>
                </div>
              </div>

              {/* Summary Cards in Hero */}
              <div className="ch-hero-stats">
                {summaryCards.map(card => (
                  <div key={card.label} className="ch-stat-glass">
                    <div className="ch-stat-icon" style={{ color: card.color, background: card.bg }}>
                      {card.icon}
                    </div>
                    <div>
                      <div className="ch-stat-value">{card.value}</div>
                      <div className="ch-stat-label">{card.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── Guest Hero ── */
            <div className="ch-hero-guest">
              <div className="ch-hero-badge">🇳🇵 Nepal's #1 Travel Planner</div>
              <h1 className="ch-hero-title">
                Your Dream Nepal<br />
                <span className="ch-hero-highlight">Adventure Awaits</span>
              </h1>
              <p className="ch-hero-sub">
                AI-powered itinerary planning, verified local guides, and curated Nepal travel experiences — all in one place.
              </p>
              <div className="ch-hero-ctas">
                <Link to="/" className="ch-hero-btn-primary">
                  Get Started Free →
                </Link>
                <Link to="/destinations" className="ch-hero-btn-ghost">
                  Explore Destinations
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Dot Indicators */}
        <div className="ch-hero-dots">
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              className={`ch-hero-dot ${i === heroIdx ? "active" : ""}`}
              onClick={() => setHeroIdx(i)}
            />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CONTINUE YOUR JOURNEY  (Logged-in only)
      ══════════════════════════════════════════════════════════ */}
      {isLoggedIn && recentItin && (
        <section className="ch-section ch-journey-section">
          <RevealSection>
            <div className="ch-section-header">
              <div className="ch-section-badge">⚡ Pick Up Where You Left Off</div>
              <h2 className="ch-section-title">Continue Your Journey</h2>
            </div>
            <div className="ch-journey-card">
              <div className="ch-journey-icon">📍</div>
              <div className="ch-journey-info">
                <span className="ch-journey-label">Last saved itinerary</span>
                <h3 className="ch-journey-dest">{recentItin.destination || recentItin.title || "Your Itinerary"}</h3>
                <p className="ch-journey-meta">
                  {recentItin.num_days || recentItin.duration || "—"} days ·
                  Created {shortDate(recentItin.created_at?.split("T")[0])}
                </p>
                <div className="ch-journey-progress-bar">
                  <div className="ch-journey-progress-fill" style={{ width: "65%" }} />
                </div>
                <p className="ch-journey-progress-label">65% planned</p>
              </div>
              <div className="ch-journey-actions">
                <Link to={`/trips/${recentItin.id}`} className="ch-btn-primary">
                  View Full Plan →
                </Link>
                <Link to="/plan-trip" className="ch-btn-secondary">
                  New Plan
                </Link>
              </div>
            </div>
          </RevealSection>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          QUICK ACTIONS GRID
      ══════════════════════════════════════════════════════════ */}
      <section className="ch-section ch-actions-section">
        <RevealSection>
          <div className="ch-section-header text-center">
            <div className="ch-section-badge">⚡ Quick Access</div>
            <h2 className="ch-section-title">What would you like to do?</h2>
          </div>
        </RevealSection>
        <div className="ch-actions-grid">
          {QUICK_ACTIONS.map((action, i) => (
            <RevealSection key={action.id} delay={i * 60}>
              <Link to={action.to} className="ch-action-card" style={{ "--card-color": action.color, "--card-bg": action.bg }}>
                <div className="ch-action-icon" style={{ color: action.color, background: action.bg }}>
                  {action.icon}
                </div>
                <div className="ch-action-text">
                  <span className="ch-action-label">{action.label}</span>
                  <span className="ch-action-sub">{action.sub}</span>
                </div>
                <span className="ch-action-arrow">→</span>
              </Link>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SEASONAL BANNER
      ══════════════════════════════════════════════════════════ */}
      <section className="ch-section ch-banner-section">
        <RevealSection>
          <div className="ch-seasonal-banner" style={{ background: SEASONAL_BANNER.gradient }}>
            <div className="ch-banner-badge">{SEASONAL_BANNER.badge}</div>
            <h2 className="ch-banner-title">{SEASONAL_BANNER.title}</h2>
            <p className="ch-banner-sub">{SEASONAL_BANNER.sub}</p>
            <Link to="/destinations" className="ch-banner-cta">
              {SEASONAL_BANNER.cta} →
            </Link>
            <div className="ch-banner-decor">🌸 🏔️ 🌿</div>
          </div>
        </RevealSection>
      </section>

      {/* ══════════════════════════════════════════════════════════
          UPCOMING TRIP SPOTLIGHT  (Logged-in + has trip)
      ══════════════════════════════════════════════════════════ */}
      {isLoggedIn && upcomingTrips.length > 0 && (
        <section className="ch-section ch-spotlight-section">
          <RevealSection>
            <div className="ch-section-header">
              <div className="ch-section-badge">🎯 Coming Up</div>
              <h2 className="ch-section-title">Upcoming Trip Spotlight</h2>
            </div>
          </RevealSection>
          <RevealSection delay={100}>
            <div className="ch-spotlight-card">
              <div className="ch-spotlight-image" style={{ backgroundImage: `url(/images/hero-everest.jpg)` }}>
                <div className="ch-spotlight-image-overlay" />
                <div className="ch-spotlight-badge">Upcoming</div>
              </div>
              <div className="ch-spotlight-body">
                <div className="ch-spotlight-header">
                  <h3 className="ch-spotlight-title">
                    {upcomingTrips[0].destination || `${upcomingTrips[0].from_city} → ${upcomingTrips[0].to_city}` || "Nepal Adventure"}
                  </h3>
                  <span className="ch-spotlight-status available">Confirmed</span>
                </div>

                <div className="ch-spotlight-meta-grid">
                  <div className="ch-meta-item">
                    <span className="ch-meta-icon">📅</span>
                    <div>
                      <span className="ch-meta-label">Dates</span>
                      <span className="ch-meta-value">
                        {shortDate(upcomingTrips[0].trip_start)} – {shortDate(upcomingTrips[0].trip_end)}
                      </span>
                    </div>
                  </div>
                  <div className="ch-meta-item">
                    <span className="ch-meta-icon">⏱️</span>
                    <div>
                      <span className="ch-meta-label">Duration</span>
                      <span className="ch-meta-value">
                        {upcomingTrips[0].trip_start && upcomingTrips[0].trip_end
                          ? Math.round((new Date(upcomingTrips[0].trip_end) - new Date(upcomingTrips[0].trip_start)) / 86400000)
                          : "—"} days
                      </span>
                    </div>
                  </div>
                  <div className="ch-meta-item">
                    <span className="ch-meta-icon">🧭</span>
                    <div>
                      <span className="ch-meta-label">Guide</span>
                      <span className={`ch-meta-value ${confirmedBookings.length > 0 ? "text-green" : "text-amber"}`}>
                        {confirmedBookings.length > 0 ? "Booked ✓" : "Not booked yet"}
                      </span>
                    </div>
                  </div>
                  <div className="ch-meta-item">
                    <span className="ch-meta-icon">🌤️</span>
                    <div>
                      <span className="ch-meta-label">Weather</span>
                      <span className="ch-meta-value">22°C · Clear</span>
                    </div>
                  </div>
                </div>

                <div className="ch-spotlight-progress">
                  <div className="ch-progress-header">
                    <span>Itinerary Progress</span>
                    <span>65%</span>
                  </div>
                  <div className="ch-progress-bar">
                    <div className="ch-progress-fill" style={{ width: "65%" }} />
                  </div>
                </div>

                <div className="ch-spotlight-actions">
                  <Link to="/my-trips" className="ch-btn-primary">View Full Plan →</Link>
                  {confirmedBookings.length === 0 && (
                    <Link to="/guides" className="ch-btn-secondary">Book a Guide</Link>
                  )}
                </div>
              </div>
            </div>
          </RevealSection>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          RECOMMENDED DESTINATIONS
      ══════════════════════════════════════════════════════════ */}
      <section className="ch-section ch-destinations-section">
        <RevealSection>
          <div className="ch-section-header text-center">
            <div className="ch-section-badge">✨ Curated for You</div>
            <h2 className="ch-section-title">Recommended Destinations</h2>
            <p className="ch-section-sub">Handpicked Nepal experiences based on what travelers love most.</p>
          </div>
        </RevealSection>
        <div className="ch-dest-grid">
          {FEATURED_DESTINATIONS.map((dest, i) => (
            <RevealSection key={dest.id} delay={i * 80}>
              <div className="ch-dest-card">
                <div className="ch-dest-image" style={{ backgroundImage: `url(${dest.image})` }}>
                  <div className="ch-dest-overlay" />
                  <span className="ch-dest-tag">{dest.tag}</span>
                  <div className="ch-dest-rating">⭐ {dest.rating}</div>
                </div>
                <div className="ch-dest-body">
                  <h3 className="ch-dest-name">{dest.name}</h3>
                  <p className="ch-dest-desc">{dest.desc}</p>
                  <div className="ch-dest-meta">
                    <span>📍 {dest.region}</span>
                    <span>🗓️ {dest.season}</span>
                    <span className={`ch-budget-badge ${dest.budget.toLowerCase().replace(" ", "-")}`}>
                      💰 {dest.budget}
                    </span>
                  </div>
                  <div className="ch-dest-actions">
                    <Link to="/destinations" className="ch-dest-btn-outline">Explore</Link>
                    <Link to="/plan-trip" className="ch-dest-btn-primary">Plan Now</Link>
                  </div>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
        <div className="text-center" style={{ marginTop: 48 }}>
          <Link to="/destinations" className="ch-btn-outline-dark">View All Destinations →</Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TOP AVAILABLE GUIDES
      ══════════════════════════════════════════════════════════ */}
      <section className="ch-section ch-guides-section">
        <RevealSection>
          <div className="ch-section-header text-center">
            <div className="ch-section-badge">🧭 Verified Experts</div>
            <h2 className="ch-section-title">Top Available Local Guides</h2>
            <p className="ch-section-sub">Connect with certified Nepal travel experts ready for your next adventure.</p>
          </div>
        </RevealSection>
        {guides.length > 0 ? (
          <div className="ch-guides-grid">
            {guides.map((guide, i) => (
              <RevealSection key={guide.id} delay={i * 80}>
                <div className="ch-guide-card">
                  <div className="ch-guide-header">
                    <div className="ch-guide-avatar-wrap">
                      {guide.profile_image ? (
                        <img src={guide.profile_image} alt={guide.full_name} className="ch-guide-avatar-img" />
                      ) : (
                        <div className="ch-guide-avatar-placeholder">
                          {(guide.full_name || "G").substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="ch-guide-online-dot" />
                    </div>
                    <div className="ch-guide-id">
                      <h3 className="ch-guide-name">{guide.full_name}</h3>
                      <p className="ch-guide-spec">{guide.specialization || "General Guide"}</p>
                      <div className="ch-guide-rating">
                        <span className="ch-stars">{"★".repeat(Math.round(guide.rating || 5))}</span>
                        <span className="ch-rating-num">{guide.rating || "5.0"}</span>
                        <span className="ch-tours">· {guide.tours_completed || 0} tours</span>
                      </div>
                    </div>
                    <span className="ch-avail-badge available">{guide.availability_badge}</span>
                  </div>
                  <div className="ch-guide-meta">
                    <div className="ch-guide-meta-row">
                      <span>🌏</span>
                      <span>{Array.isArray(guide.languages) ? guide.languages.join(", ") : guide.languages || "English"}</span>
                    </div>
                    <div className="ch-guide-meta-row">
                      <span>📍</span>
                      <span>{Array.isArray(guide.destinations) ? guide.destinations.slice(0, 2).join(", ") : "Nepal"}</span>
                    </div>
                    {guide.years_experience && (
                      <div className="ch-guide-meta-row">
                        <span>🏅</span>
                        <span>{guide.years_experience} years experience</span>
                      </div>
                    )}
                  </div>
                  <div className="ch-guide-actions">
                    <Link to="/guides" className="ch-btn-secondary ch-guide-btn">View Profile</Link>
                    <Link to="/guides" className="ch-btn-primary ch-guide-btn">Book Guide</Link>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        ) : (
          <RevealSection>
            <div className="ch-empty-guides">
              <div className="ch-empty-icon">🧭</div>
              <h3>Checking guide availability...</h3>
              <p>Browse all our verified local guides to find your perfect match.</p>
              <Link to="/guides" className="ch-btn-primary">Find a Guide</Link>
            </div>
          </RevealSection>
        )}
        <div className="text-center" style={{ marginTop: 40 }}>
          <Link to="/guides" className="ch-btn-outline-dark">View All Guides →</Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          SAVED TRIPS / WISHLIST  (Logged-in only)
      ══════════════════════════════════════════════════════════ */}
      {isLoggedIn && (
        <section className="ch-section ch-saved-section">
          <RevealSection>
            <div className="ch-section-header">
              <div>
                <div className="ch-section-badge">❤️ Your Wishlist</div>
                <h2 className="ch-section-title">Saved Itineraries</h2>
              </div>
              <Link to="/saved-trips" className="ch-see-all-link">See All →</Link>
            </div>
          </RevealSection>
          {itineraries.length === 0 ? (
            <RevealSection>
              <div className="ch-empty-state">
                <div className="ch-empty-icon">📝</div>
                <h3>No saved itineraries yet</h3>
                <p>Generate your first AI-powered itinerary and save it here.</p>
                <Link to="/plan-trip" className="ch-btn-primary">Try AI Planner →</Link>
              </div>
            </RevealSection>
          ) : (
            <div className="ch-saved-grid">
              {itineraries.slice(0, 4).map((it, i) => (
                <RevealSection key={it.id} delay={i * 60}>
                  <div className="ch-saved-card">
                    <div className="ch-saved-icon">📍</div>
                    <div className="ch-saved-info">
                      <h4>{it.destination || it.title || "Itinerary"}</h4>
                      <p>{it.num_days || it.duration || "—"} days · {shortDate(it.created_at?.split("T")[0])}</p>
                    </div>
                    <Link to={`/trips/${it.id}`} className="ch-saved-view">View →</Link>
                  </div>
                </RevealSection>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          RECENT ACTIVITY TIMELINE  (Logged-in only)
      ══════════════════════════════════════════════════════════ */}
      {isLoggedIn && activityItems.length > 0 && (
        <section className="ch-section ch-activity-section">
          <RevealSection>
            <div className="ch-section-header">
              <div>
                <div className="ch-section-badge">🕐 Activity</div>
                <h2 className="ch-section-title">Recent Activity</h2>
              </div>
            </div>
          </RevealSection>
          <RevealSection delay={100}>
            <div className="ch-activity-timeline">
              {activityItems.map((item, i) => (
                <div className="ch-timeline-item" key={item.id}>
                  <div className="ch-timeline-dot" style={{ background: item.bg }}>
                    {item.emoji}
                  </div>
                  <div className="ch-timeline-connector" style={{ display: i === activityItems.length - 1 ? "none" : "block" }} />
                  <div className="ch-timeline-content">
                    <p className="ch-timeline-text">{item.text}</p>
                    <span className="ch-timeline-time">{timeAgo(item.time)}</span>
                  </div>
                </div>
              ))}
            </div>
          </RevealSection>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          SMART SUGGESTIONS / AI INSIGHTS
      ══════════════════════════════════════════════════════════ */}
      <section className="ch-section ch-insights-section">
        <RevealSection>
          <div className="ch-section-header text-center">
            <div className="ch-section-badge">🤖 AI Powered</div>
            <h2 className="ch-section-title">Travel Insights & Smart Suggestions</h2>
            <p className="ch-section-sub">Personalized recommendations to help you travel smarter.</p>
          </div>
        </RevealSection>
        <div className="ch-insights-grid">
          {SMART_SUGGESTIONS.map((s, i) => (
            <RevealSection key={i} delay={i * 70}>
              <div className={`ch-insight-card ch-insight-${s.type}`}>
                <div className="ch-insight-icon">{s.icon}</div>
                <p className="ch-insight-text">{s.text}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          WHY TRIPPLANNER
      ══════════════════════════════════════════════════════════ */}
      <section className="ch-section ch-why-section">
        <RevealSection>
          <div className="ch-section-header text-center">
            <div className="ch-section-badge">💎 Why Us</div>
            <h2 className="ch-section-title">Why TripPlanner Works For You</h2>
            <p className="ch-section-sub">Everything you need to plan the perfect Nepal adventure, built into one elegant platform.</p>
          </div>
        </RevealSection>
        <div className="ch-trust-grid">
          {TRUST_POINTS.map((t, i) => (
            <RevealSection key={t.title} delay={i * 80}>
              <div className="ch-trust-card">
                <div className="ch-trust-icon">{t.icon}</div>
                <h3 className="ch-trust-title">{t.title}</h3>
                <p className="ch-trust-desc">{t.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CTA FOOTER BANNER  (Guest only)
      ══════════════════════════════════════════════════════════ */}
      {!isLoggedIn && (
        <section className="ch-section ch-cta-section">
          <RevealSection>
            <div className="ch-cta-card">
              <div className="ch-cta-badge">🚀 Start Your Journey</div>
              <h2 className="ch-cta-title">Ready to Explore Nepal?</h2>
              <p className="ch-cta-sub">Join 8,500+ travelers who've already discovered Nepal with TripPlanner.</p>
              <div className="ch-cta-actions">
                <Link to="/" className="ch-hero-btn-primary">Create Free Account →</Link>
                <Link to="/destinations" className="ch-hero-btn-ghost">Browse Destinations</Link>
              </div>
            </div>
          </RevealSection>
        </section>
      )}

    </div>
  );
}
