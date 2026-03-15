import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./Home.css";

// Reusing same images as landing page
const HERO_IMAGES = [
  "/images/hero-everest.jpg",
  "/images/hero-pokhara.jpg",
  "/images/hero-stupa.jpg",
];

const DESTINATIONS = [
  { id: 1, name: "Mount Everest", image: "/images/hero-everest.jpg", desc: "Experience the world's highest peak." },
  { id: 2, name: "Pokhara", image: "/images/hero-pokhara.jpg", desc: "Serene lakes and mountain views." },
  { id: 3, name: "Kathmandu", image: "/images/dest-temple.jpg", desc: "Ancient temples and rich culture." },
];

function Home() {
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  // Load user data if logged in
  useEffect(() => {
    // Only attempt fetch if the frontend thinks we are logged in
    if (localStorage.getItem("isLoggedIn") === "true" || sessionStorage.getItem("isLoggedIn") === "true") {
      api.get("/../accounts/dashboard/")
        .then((res) => {
          setUser(res.data.user);
          setTrips(res.data.trips);
        })
        .catch(() => {
          setUser(null);
        });
    }
  }, []);

  // Hero Carousel Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-page lp-root">

      {/* HERO SECTION */}
      <section className="home-hero lp-hero">
        {HERO_IMAGES.map((img, index) => (
          <div
            key={index}
            className={`lp-hero-bg ${index === currentHeroIndex ? "fade-in" : "fade-out"}`}
            style={{ backgroundImage: `url(${img})`, transform: index === currentHeroIndex ? 'scale(1.05)' : 'scale(1)', transition: 'opacity 1s ease, transform 6s ease' }}
          />
        ))}
        <div className="lp-hero-overlay"></div>
        <div className="lp-hero-content pt-nav">
          <div className="lp-hero-badge">Welcome to Nepal</div>
          <h1 className="lp-hero-title">
            Your Journey <br />
            <span className="hero-highlight">Starts Here</span>
          </h1>
          <p className="lp-hero-sub">
            Discover the beauty, culture, and adventure of the Himalayas with expertly crafted itineraries.
          </p>
          <div className="lp-hero-actions">
            <Link to="/plantrip" className="lp-btn-primary">
              Plan Your Trip <span className="btn-icon">→</span>
            </Link>
            <Link to="/destinations" className="lp-btn-outline">
              Explore Destinations
            </Link>
          </div>
        </div>
      </section>

      {/* DASHBOARD SECTION (IF LOGGED IN) */}
      {user && (
        <section className="home-dashboard lp-section">
          <div className="dashboard-header text-center mb-12">
            <span className="lp-section-badge">Dashboard</span>
            <h2 className="lp-section-title">Welcome back, {user.username}! 👋</h2>
            <p className="lp-section-sub mx-auto">Here are your planned adventures.</p>
          </div>

          {trips.length === 0 ? (
            <div className="dashboard-empty-card">
              <div className="empty-icon">🗺️</div>
              <h3>No trips planned yet</h3>
              <p>Your next adventure is waiting to be created.</p>
              <Link to="/plantrip" className="lp-btn-primary mt-6">
                Start Planning <span className="btn-icon">→</span>
              </Link>
            </div>
          ) : (
            <div className="dashboard-trips-grid">
              {trips.map((trip) => (
                <div key={trip.id} className="dash-trip-card">
                  <div className="dash-trip-header">
                    <span className="trip-status">Upcoming</span>
                    <h4 className="trip-route">{trip.from_city} → {trip.to_city}</h4>
                  </div>
                  <div className="dash-trip-body">
                    <div className="trip-date-row">
                      <span>📅</span> {trip.start_date} – {trip.end_date}
                    </div>
                  </div>
                  <div className="dash-trip-footer">
                    <button className="view-trip-link">View Itinerary →</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TOP DESTINATIONS SECTION */}
      <section className="home-destinations lp-section">
        <div className="text-center">
          <span className="lp-section-badge">Popular Choices</span>
          <h2 className="lp-section-title">Top Destinations</h2>
          <p className="lp-section-sub mx-auto">Explore the most stunning places Nepal has to offer.</p>
        </div>

        <div className="lp-dest-grid">
          {DESTINATIONS.map((dest) => (
            <Link to={`/destinations/${dest.id}`} key={dest.id} className="lp-dest-card">
              <div className="dest-img-wrap">
                <div className="dest-img" style={{ backgroundImage: `url(${dest.image})` }}></div>
                <div className="dest-img-overlay">
                  <span className="dest-tagline">Must Visit</span>
                </div>
              </div>
              <div className="dest-card-body">
                <h3>{dest.name}</h3>
                <p>{dest.desc}</p>
                <button className="dest-explore-btn">
                  Explore <span className="btn-icon">→</span>
                </button>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center" style={{ marginTop: '48px' }}>
          <Link to="/destinations" className="lp-btn-outline-dark">
            View All Destinations
          </Link>
        </div>
      </section>

      {/* TAILORED ITINERARIES SECTION */}
      <section className="home-features lp-section bg-light">
        <div className="text-center">
          <span className="lp-section-badge">Why Choose Us</span>
          <h2 className="lp-section-title">Tailored Itineraries</h2>
          <p className="lp-section-sub mx-auto">Personalized trip plans designed just for you.</p>
        </div>

        <div className="lp-features-grid mt-12">
          <div className="lp-feature-card">
            <div className="feat-icon-wrap bg-teal-light text-teal">🤖</div>
            <h3>AI Planning</h3>
            <p>Smart algorithms create perfect itineraries based on your preferences.</p>
          </div>
          <div className="lp-feature-card">
            <div className="feat-icon-wrap bg-purple-light text-purple">📅</div>
            <h3>Custom Schedules</h3>
            <p>Flexible day-by-day plans that fit your timeline and pace.</p>
          </div>
          <div className="lp-feature-card">
            <div className="feat-icon-wrap bg-gold-light text-gold">💰</div>
            <h3>Budget Optimization</h3>
            <p>Get the most value from your trip with smart cost management.</p>
          </div>
        </div>
      </section>

    </div>
  );
}

export default Home;
