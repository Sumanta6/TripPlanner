import "./TripPlannerBrand.css";

function TripPlannerBrand({ subtitle, className = "", compact = false }) {
  return (
    <span
      className={`tp-brand ${compact ? "tp-brand-compact" : ""} ${className}`.trim()}
      aria-label={subtitle ? `TripPlanner ${subtitle}` : "TripPlanner"}
    >
      <img className="tp-brand-image" src="/brand-logo.png" alt="" aria-hidden="true" />
      {subtitle ? <span className="tp-brand-subtitle sr-only">{subtitle}</span> : null}
    </span>
  );
}

export default TripPlannerBrand;
