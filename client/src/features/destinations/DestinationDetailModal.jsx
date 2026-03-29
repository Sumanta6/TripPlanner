import { useEffect } from "react";

import { chooseDestinationImage, formatDestinationMeta } from "./helpers";

export function DestinationDetailModal({
  destination,
  open,
  loading,
  error,
  onClose,
  onPlan,
}) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const image = destination ? chooseDestinationImage(destination) : "/images/hero-nepal-premium.png";

  return (
    <div className="destination-modal" role="dialog" aria-modal="true" aria-labelledby="destination-detail-title">
      <button type="button" className="destination-modal__backdrop" aria-label="Close destination details" onClick={onClose} />

      <div className="destination-modal__panel">
        <button type="button" className="destination-modal__close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        {loading ? (
          <div className="destination-modal__loading">
            <div className="destination-spinner" />
            <p>Loading destination details…</p>
          </div>
        ) : error ? (
          <div className="destination-modal__state">
            <h2>Unable to load destination</h2>
            <p>{error}</p>
          </div>
        ) : destination ? (
          <>
            <div className="destination-modal__hero">
              <img src={image} alt={destination.name} />
              <div className="destination-modal__hero-overlay" />
              <div className="destination-modal__hero-content">
                <h2 id="destination-detail-title">{destination.name}</h2>
                <p>{formatDestinationMeta(destination)}</p>
              </div>
            </div>

            <div className="destination-modal__content">
              <section>
                <h3>Overview</h3>
                <p>{destination.description || destination.short_description}</p>
              </section>

              {destination.highlights?.length > 0 && (
                <section className="destination-modal__highlights-section">
                  <h3>Highlights</h3>
                  <div className="destination-modal__chips">
                    {destination.highlights.map((highlight) => (
                      <span key={highlight} className="destination-card__highlight">
                        {highlight}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {destination.travel_tips?.length > 0 && (
                <section>
                  <h3>Travel Notes</h3>
                  <ul className="destination-modal__notes">
                    {destination.travel_tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="destination-modal__actions">
                <button type="button" className="destination-btn destination-btn--secondary" onClick={onClose}>
                  Close
                </button>
                <button type="button" className="destination-btn destination-btn--primary" onClick={() => onPlan(destination)}>
                  Plan Trip
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
