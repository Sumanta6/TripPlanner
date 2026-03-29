export function DestinationSkeletons({ count = 6 }) {
  return (
    <div className="destination-grid" aria-busy="true" aria-label="Loading destinations">
      {Array.from({ length: count }).map((_, index) => (
        <div className="destination-card destination-card--skeleton" key={index} aria-hidden="true">
          <div className="destination-card__skeleton destination-card__skeleton--image" />
          <div className="destination-card__body">
            <div className="destination-card__skeleton destination-card__skeleton--title" />
            <div className="destination-card__skeleton destination-card__skeleton--copy" />
            <div className="destination-card__skeleton destination-card__skeleton--copy" />
            <div className="destination-card__skeleton destination-card__skeleton--actions" />
          </div>
        </div>
      ))}
    </div>
  );
}
