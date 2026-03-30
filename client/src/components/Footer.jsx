import { Link } from "react-router-dom";
import TripPlannerBrand from "./TripPlannerBrand";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">

        {/* BRAND */}
        <div className="footer-brand">
          <div className="footer-logo">
            <TripPlannerBrand />
          </div>
          <p className="footer-desc">
            AI-powered travel planning system focused exclusively on Nepal.
            Plan smarter, travel better.
          </p>

          <div className="footer-social">
            <span>f</span>
            <span>t</span>
            <span>i</span>
            <span>▶</span>
          </div>
        </div>

        {/* EXPLORE */}
        <div className="footer-links">
          <h4>Explore</h4>
          <ul>
            <li>Popular Destinations</li>
            <li>Plan Your Trip</li>
            <li>How It Works</li>
          </ul>
        </div>

        {/* COMPANY */}
        <div className="footer-links">
          <h4>Company</h4>
          <ul>
            <li>About Us</li>
            <li>Testimonials</li>
            <li>Contact</li>
          </ul>
        </div>

        {/* CONTACT */}
        <div className="footer-contact">
          <h4>Contact</h4>
          <p>📍 Kathmandu, Nepal</p>
          <p>✉️ sumanta.tripplanner@gmail.com</p>
          <p>📞 +977 98XXXXXXXX</p>
        </div>

      </div>

      {/* BOTTOM */}
      <div className="footer-bottom">
        <p>© 2026 TripPlanner. All rights reserved.</p>
        <div className="footer-policy">
          <span>Terms</span>
          <span>Privacy</span>
          <Link to="/faq">FAQ</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
