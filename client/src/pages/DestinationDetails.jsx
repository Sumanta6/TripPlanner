import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import "./DestinationDetails.css";

const destinationsData = [
  {
    id: "kathmandu",
    name: "Kathmandu Valley",
    region: "Central Nepal",
    rating: 4.8,
    reviews: 1240,
    price: 25000,
    image: "/images/dest-temple.jpg",
    description:
      "Kathmandu Valley is the cultural and historical heart of Nepal. Known as the city of temples, it boasts a rich tapestry of history, art, and vibrant local life that dates back centuries.",
    highlights: ["Pashupatinath Temple", "Boudhanath Stupa", "Kathmandu Durbar Square", "Swayambhunath (Monkey Temple)"],
    bestTimeToVisit: "Sept to Nov, Feb to April",
  },
  {
    id: "pokhara",
    name: "Pokhara",
    region: "Western Nepal",
    rating: 4.9,
    reviews: 890,
    price: 30000,
    image: "/images/hero-pokhara.jpg",
    description:
      "Pokhara is Nepal's premier adventure and leisure destination. With its tranquil lakes, spectacular mountain views, and laid-back vibe, it's the perfect place to relax or seek thrills.",
    highlights: ["Phewa Lake Boating", "Sarangkot Sunrise", "Davis Falls", "World Peace Pagoda"],
    bestTimeToVisit: "Sept to Nov, March to May",
  },
];

function DestinationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Try to find the exact destination, if not found, use a fallback generic view
  const destination = destinationsData.find((d) => d.id === id) || {
    id: id,
    name: id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' '),
    region: "Nepal",
    rating: 4.7,
    reviews: 320,
    price: 20000,
    image: "/images/hero-everest.jpg", // Fallback image
    description: "Experience the incredible beauty and rich culture of this amazing Nepalese destination. Perfect for adventure seekers and cultural explorers alike.",
    highlights: ["Local Culture", "Scenic Views", "Authentic Cuisine", "Historical Sites"],
    bestTimeToVisit: "Year-round",
  };

  return (
    <Layout>
      <div className="dest-details-page lp-root">

        {/* HERO HEADER */}
        <section className="dd-hero" style={{ backgroundImage: `url(${destination.image})` }}>
          <div className="dd-hero-overlay"></div>
          <div className="dd-hero-content pt-nav">
            <div className="lp-section-badge" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white', background: 'rgba(255,255,255,0.1)' }}>
              {destination.region}
            </div>
            <h1 className="dd-title">{destination.name}</h1>
            <div className="dd-meta">
              <span className="dd-rating">⭐ {destination.rating} <span>({destination.reviews} reviews)</span></span>
            </div>
          </div>
        </section>

        {/* MAIN CONTENT */}
        <section className="dd-main lp-section">
          <div className="dd-grid">

            {/* Left Column: Info */}
            <div className="dd-info">
              <h2 className="dd-section-title">Overview</h2>
              <p className="dd-desc">{destination.description}</p>

              <div className="dd-highlights-box">
                <h3 className="dd-section-subtitle">Top Highlights</h3>
                <ul className="dd-highlights-list">
                  {destination.highlights.map((h, idx) => (
                    <li key={idx}><span className="check-icon">✓</span> {h}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column: Booking Card */}
            <div className="dd-sidebar">
              <div className="dd-booking-card">
                <div className="dd-price-row">
                  <span className="dd-price-label">Starting from</span>
                  <div className="dd-price-value">NPR {destination.price.toLocaleString()}</div>
                </div>

                <div className="dd-info-row">
                  <span className="info-icon">📅</span>
                  <div>
                    <strong>Best Time to Visit</strong>
                    <p>{destination.bestTimeToVisit}</p>
                  </div>
                </div>

                <div className="dd-info-row">
                  <span className="info-icon">🛡️</span>
                  <div>
                    <strong>Secure Booking</strong>
                    <p>Free cancellation up to 48 hours before.</p>
                  </div>
                </div>

                <button
                  className="lp-btn-primary dd-action-btn"
                  onClick={() =>
                    navigate("/plantrip", {
                      state: { destination: destination.name },
                    })
                  }
                >
                  Plan Trip Here <span className="btn-icon">→</span>
                </button>
              </div>
            </div>

          </div>
        </section>

      </div>
    </Layout>
  );
}

export default DestinationDetails;
