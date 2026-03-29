import {
  chooseDestinationImage,
  formatDestinationMeta,
  getProvinceGradient,
} from "./helpers";

export function DestinationCard({ destination, onOpen, onPlan }) {
  const image = chooseDestinationImage(destination);

  return (
    <article className="destination-card">
      <div className="destination-card__media">
        <img src={image} alt={destination.name} loading="lazy" />
        <div
          className="destination-card__media-overlay"
          style={{ background: getProvinceGradient(destination) }}
        />
      </div>

      <div className="destination-card__body">
        <div className="destination-card__heading">
          <div>
            <h3>{destination.name}</h3>
            <p>{formatDestinationMeta(destination)}</p>
          </div>
        </div>

        <p className="destination-card__summary">{destination.short_description || destination.summary}</p>

        {destination.highlights?.length > 0 && (
          <div className="destination-card__highlights" aria-label={`${destination.name} highlights`}>
            {destination.highlights.slice(0, 2).map((highlight) => (
              <span key={highlight} className="destination-card__highlight">
                {highlight}
              </span>
            ))}
          </div>
        )}

        <div className="destination-card__actions">
          <button type="button" className="destination-btn destination-btn--secondary" onClick={() => onOpen(destination.geoname_id)}>
            View Details
          </button>
          <button type="button" className="destination-btn destination-btn--primary" onClick={() => onPlan(destination)}>
            Plan Trip
          </button>
        </div>
      </div>
    </article>
  );
}
