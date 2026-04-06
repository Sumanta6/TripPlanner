import { Link } from "react-router-dom";
import TripPlannerBrand from "./TripPlannerBrand";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-shell">
        <div className="footer-main">
          <div className="footer-brand">
            <TripPlannerBrand subtitle="Traveler Workspace" compact />
            <p className="footer-desc">Smart planning, trusted guides, and cleaner trip management.</p>
          </div>

          <nav className="footer-links" aria-label="Footer">
            <Link to="/how-it-works">How It Works</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Contact</Link>
          </nav>

          <a className="footer-contact" href="mailto:sumanta.tripplanner@gmail.com">
            sumanta.tripplanner@gmail.com
          </a>
        </div>

        <div className="footer-bottom">
          <p>© 2026 TripPlanner. All rights reserved.</p>
          <div className="footer-policy">
            <span>Terms</span>
            <span>Privacy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
