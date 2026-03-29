import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  chooseDestinationImage,
  formatDestinationMeta,
} from "../features/destinations/helpers";
import { getDestinationDetail } from "../services/api";
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
        const data = await getDestinationDetail(id);
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
      <div className="dest-details-page lp-root">
        <div className="dd-loading">
          <div className="dd-spinner"></div>
          <p>Loading destination...</p>
        </div>
      </div>
    );
  }

  if (error || !destination) {
    return (
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
    );
  }

  const imageUrl = chooseDestinationImage(destination);
  const locationLabel = formatDestinationMeta(destination) || "Nepal";

  return (
    <div className="dest-details-page lp-root">
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
            {destination.popularity_badge || destination.category || "Destination"}
          </div>
          <h1 className="dd-title">{destination.name}</h1>
          <div className="dd-meta">
            <span className="dd-location">📍 {locationLabel}</span>
          </div>
        </div>
      </section>

      <section className="dd-main lp-section">
        <div className="dd-grid">
          <div className="dd-info">
            <h2 className="dd-section-title">Overview</h2>
            <p className="dd-desc">{destination.description || destination.short_description || destination.summary}</p>

            <div className="dd-coords-box">
              <h3 className="dd-section-subtitle">Best for</h3>
              <p className="dd-coords">
                {(destination.best_for || destination.trip_suitability || []).join(" · ") || "Flexible trip planning"}
              </p>
            </div>

            <div className="dd-coords-box">
              <h3 className="dd-section-subtitle">Highlights</h3>
              <p className="dd-coords">
                {(destination.highlights || []).join(" · ")}
              </p>
            </div>
          </div>

          <div className="dd-sidebar">
            <div className="dd-booking-card">
              <div className="dd-info-row">
                <span className="info-icon">📍</span>
                <div>
                  <strong>Location</strong>
                  <p>{locationLabel}</p>
                </div>
              </div>

              <div className="dd-info-row">
                <span className="info-icon">📅</span>
                <div>
                  <strong>Travel style</strong>
                  <p>{(destination.best_for || []).slice(0, 2).join(" · ") || "Flexible trip planning"}</p>
                </div>
              </div>

              <div className="dd-info-row">
                <span className="info-icon">💡</span>
                <div>
                  <strong>Highlights</strong>
                  <p>{(destination.highlights || []).slice(0, 2).join(" · ")}</p>
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
  );
}

export default DestinationDetails;
