export function DestinationHero() {
  return (
    <header
      className="destination-hero"
      style={{
        backgroundImage:
          'linear-gradient(140deg, rgba(6, 23, 41, 0.94), rgba(10, 37, 64, 0.84)), url("/images/hero-nepal-premium.png")',
      }}
    >
      <div className="destination-hero__backdrop" />
      <div className="destination-hero__content">
        <div className="destination-hero__intro">
          <span className="destination-kicker">Explore Nepal</span>
          <h1>Find beautiful places worth building a trip around.</h1>
          <p>
            From Himalayan gateways to heritage towns and quiet escapes, discover
            destinations that feel considered, visual, and easy to explore.
          </p>
        </div>
      </div>
    </header>
  );
}
