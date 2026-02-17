import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import "./Home.css";

// Import images (or reference them if in public folder)
const HERO_IMAGES = [
  "/images/hero-everest.jpg", // Everest
  "/images/hero-pokhara.jpg", // Pokhara Lake
  "/images/hero-stupa.jpg", // Boudhanath Stupa
];

const DESTINATIONS = [
  {
    id: 1,
    name: "Mount Everest",
    image: "/images/dest-everest.jpg",
    desc: "Experience the world's highest peak and surrounding valleys.",
  },
  {
    id: 2,
    name: "Pokhara",
    image: "/images/hero-pokhara.jpg", // Reusing high qual image
    desc: "Serene lakes, mountain views, and adventure activities.",
  },
  {
    id: 3,
    name: "Kathmandu Valley",
    image: "/images/dest-temple.jpg", // Ancient temple
    desc: "Ancient temples, rich culture, and vibrant markets.",
  },
  {
    id: 4,
    name: "Chitwan National Park",
    image: "/images/dest-adventure.jpg", // Nature/Wildlife representative
    desc: "Wildlife safari and rare rhinoceros sightings.",
  },
  {
    id: 5,
    name: "Lumbini",
    image: "/images/hero-stupa.jpg", // Spiritual representation
    desc: "Birthplace of Buddha and spiritual heritage.",
  },
  {
    id: 6,
    name: "Bhaktapur",
    image: "/images/dest-culture.jpg", // Cultural scene
    desc: "Preserved medieval city with exquisite architecture.",
  },
];

function Home() {
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [searchData, setSearchData] = useState({
    destination: "",
    activity: "",
    endDate: "",
  });

  const location = useLocation();

  // Load user data if logged in
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

  // Hero Carousel Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000); // Change every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Search:", searchData);
  };

  return (
    <div className="home">
      {/* HERO SECTION WITH CAROUSEL */}
      <section className="hero-nepal">
        {HERO_IMAGES.map((img, index) => (
          <div
            key={index}
            className={`hero-bg ${index === currentHeroIndex ? "active" : ""}`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}

        <div className="hero-overlay"></div>

        <div className="hero-content">
          <h1 className="hero-title">Explore Nepal</h1>
          <p className="hero-tagline">
            Discover the Beauty, Culture, and Adventure of the Himalayas
          </p>

          {/* HERO CTA ONLY (No Search Bar) */}
          <div className="hero-ctas" style={{ marginTop: "40px" }}>
            <Link to="/plan-trip" className="btn-primary-hero" style={{ padding: "18px 48px", fontSize: "20px" }}>
              Start Planning
            </Link>
          </div>

        </div>
      </section>

      {/* TOP DESTINATIONS SECTION */}
      <section className="top-destinations">
        <h2 className="section-title">Top Destinations</h2>
        <p className="section-subtitle">
          Explore the most stunning places Nepal has to offer
        </p>
        <div className="destinations-grid">
          {DESTINATIONS.map((dest) => (
            <div key={dest.id} className="destination-card">
              <div
                className="card-image"
                style={{ backgroundImage: `url(${dest.image})` }}
              ></div>
              <div className="card-content">
                <h3>{dest.name}</h3>
                <p>{dest.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TAILORED ITINERARIES SECTION */}
      <section className="itineraries">
        <h2 className="section-title">Tailored Itineraries</h2>
        <p className="section-subtitle">
          Personalized trip plans designed just for you
        </p>
        <div className="itineraries-grid">
          <div className="itinerary-card">
            <div className="card-icon">🤖</div>
            <h3>AI Planning</h3>
            <p>
              Smart algorithms create perfect itineraries based on your
              preferences.
            </p>
          </div>
          <div className="itinerary-card">
            <div className="card-icon">📅</div>
            <h3>Custom Schedules</h3>
            <p>Flexible day-by-day plans that fit your timeline and pace.</p>
          </div>
          <div className="itinerary-card">
            <div className="card-icon">💰</div>
            <h3>Budget Optimization</h3>
            <p>Get the most value from your trip with smart cost management.</p>
          </div>
          <div className="itinerary-card">
            <div className="card-icon">🔄</div>
            <h3>Flexible Options</h3>
            <p>Easy modifications and real-time adjustments to your plans.</p>
          </div>
        </div>
      </section>

      {/* EXPERT GUIDES SECTION */}
      <section className="expert-guides">
        <h2 className="section-title">Expert Guides</h2>
        <p className="section-subtitle">
          Travel with confidence backed by local expertise
        </p>
        <div className="guides-grid">
          <div className="guide-card">
            <div className="card-icon">👨‍🏫</div>
            <h3>Local Experts</h3>
            <p>Experienced guides with deep knowledge of Nepal's culture.</p>
          </div>
          <div className="guide-card">
            <div className="card-icon">📞</div>
            <h3>24/7 Support</h3>
            <p>Round-the-clock assistance for any questions or concerns.</p>
          </div>
          <div className="guide-card">
            <div className="card-icon">📚</div>
            <h3>Cultural Insights</h3>
            <p>Learn authentic stories and traditions from locals.</p>
          </div>
          <div className="guide-card">
            <div className="card-icon">🛡️</div>
            <h3>Safety First</h3>
            <p>
              Your wellbeing is our priority with comprehensive safety measures.
            </p>
          </div>
        </div>
      </section>

      {/* LOGGED-IN USER DASHBOARD */}
      {user && (
        <section className="dashboard">
          <div className="dashboard-container">
            <h2>Welcome back, {user.username}! 👋</h2>
            <h3>Your Planned Trips</h3>
            {trips.length === 0 ? (
              <div className="no-trips">
                <p>No trips planned yet.</p>
                <Link to="/plan-trip" className="btn-primary">
                  Plan Your First Trip
                </Link>
              </div>
            ) : (
              <div className="trips-grid">
                {trips.map((trip) => (
                  <div key={trip.id} className="trip-card">
                    <div className="trip-header">
                      <strong>{trip.from_city}</strong> →{" "}
                      <strong>{trip.to_city}</strong>
                    </div>
                    <p className="trip-dates">
                      {trip.start_date} – {trip.end_date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default Home;
