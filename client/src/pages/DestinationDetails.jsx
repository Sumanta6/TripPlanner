import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import "./DestinationDetails.css";

function DestinationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDestination() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/destinations/${id}/`);
        if (!cancelled) setDestination(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
              err.message ||
              "Failed to load destination."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) fetchDestination();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="dest-details-page lp-root">
          <div className="dd-loading">
            <div className="dd-spinner"></div>
            <p>Loading destination...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !destination) {
    return (
      <Layout>
        <div className="dest-details-page lp-root">
          <div className="dd-error">
            <p>{error || "Destination not found."}</p>
            <button
              className="lp-btn-primary"
              onClick={() => navigate("/destinations")}
            >
              Back to Destinations
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const imageUrl =
    destination.image_url || "/images/hero-everest.jpg";

  return (
    <Layout>
      <div className="dest-details-page lp-root">
        {/* HERO HEADER */}
        <section
          className="dd-hero"
          style={{ backgroundImage: `url(${imageUrl})` }}
        >
          <div className="dd-hero-overlay"></div>
          <div className="dd-hero-content pt-nav">
            <div
              className="lp-section-badge"
              style={{
                borderColor: "rgba(255,255,255,0.3)",
                color: "white",
                background: "rgba(255,255,255,0.1)",
              }}
            >
              {destination.category || "Sight"}
            </div>
            <h1 className="dd-title">{destination.name}</h1>
            {destination.location && (
              <div className="dd-meta">
                <span className="dd-location">📍 {destination.location}</span>
              </div>
            )}
          </div>
        </section>

        {/* MAIN CONTENT */}
        <section className="dd-main lp-section">
          <div className="dd-grid">
            {/* Left Column: Info */}
            <div className="dd-info">
              <h2 className="dd-section-title">Overview</h2>
              <p className="dd-desc">
                {destination.description ||
                  `Discover ${destination.name} in Nepal. A must-visit destination for travelers.`}
              </p>

              {destination.coordinates && (
                <div className="dd-coords-box">
                  <h3 className="dd-section-subtitle">Location</h3>
                  <p className="dd-coords">
                    Lat: {destination.coordinates.lat?.toFixed(4)}, Lon:{" "}
                    {destination.coordinates.lon?.toFixed(4)}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Action Card */}
            <div className="dd-sidebar">
              <div className="dd-booking-card">
                <div className="dd-info-row">
                  <span className="info-icon">📍</span>
                  <div>
                    <strong>Location</strong>
                    <p>{destination.location || "Nepal"}</p>
                  </div>
                </div>

                <div className="dd-info-row">
                  <span className="info-icon">📅</span>
                  <div>
                    <strong>Best Time to Visit</strong>
                    <p>September to November, February to April</p>
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
                    navigate("/plan-trip", {
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
