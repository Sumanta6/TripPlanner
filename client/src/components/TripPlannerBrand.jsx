import "./TripPlannerBrand.css";

function TripPlannerBrand({ subtitle, className = "", compact = false }) {
  return (
    <span className={`tp-brand ${compact ? "tp-brand-compact" : ""} ${className}`.trim()}>
      <span className="tp-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 44 44" className="tp-brand-mark-svg" focusable="false">
          <defs>
            <linearGradient id="tpBrandGradient" x1="6" y1="6" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#6d7cff" />
              <stop offset="1" stopColor="#5a46f5" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="40" height="40" rx="14" fill="url(#tpBrandGradient)" />
          <circle cx="22" cy="22" r="10.5" fill="none" stroke="#ffffff" strokeWidth="3" />
          <path
            d="M25.7 15.8L18.5 19.2C18 19.5 17.6 19.8 17.3 20.3L14 27.5L21.2 24.2C21.7 23.9 22.1 23.5 22.4 23L25.7 15.8Z"
            fill="#ffffff"
          />
          <circle cx="22" cy="22" r="1.6" fill="#5a46f5" />
        </svg>
      </span>
      <span className="tp-brand-copy">
        <span className="tp-brand-name">TripPlanner</span>
        {subtitle ? <span className="tp-brand-subtitle">{subtitle}</span> : null}
      </span>
    </span>
  );
}

export default TripPlannerBrand;
