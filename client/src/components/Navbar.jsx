import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Moon, Sun } from "lucide-react";
import AppPopupModal from "./AppPopupModal";
import AuthModal from "./AuthModal";
import TripPlannerBrand from "./TripPlannerBrand";
import "./Navbar.css";

export default function Navbar({ isLoggedIn, setIsLoggedIn, userEmail }) {
  const [showAuth, setShowAuth] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("theme") || "light");
  const location = useLocation();
  const navigate = useNavigate();
  const moreMenuRef = useRef(null);
  const accountMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const displayName = userEmail ? userEmail.split("@")[0] : "Traveler";

  const coreLinks = [
    { to: "/home", label: "Home" },
    { to: "/destinations", label: "Destinations" },
    { to: "/plan-trip", label: "AI Planner" },
    { to: "/guides", label: "Find a Guide" },
    ...(isLoggedIn ? [{ to: "/my-trips", label: "My Trips" }] : []),
  ];

  const accountLinks = isLoggedIn
    ? [
        { to: "/profile", label: "Profile" },
        { to: "/saved-trips", label: "Saved Trips" },
        { to: "/settings", label: "Settings" },
      ]
    : [];

  const moreLinks = [
    { to: "/how-it-works", label: "How It Works" },
    { to: "/blog", label: "Blog" },
    { to: "/faq", label: "FAQ" },
    { to: "/contact", label: "Contact Us" },
  ];

  const mobileSections = [
    { title: "Primary", items: coreLinks.map((item) => ({ ...item, icon: "•" })) },
    {
      title: "Explore",
      items: [
        { to: "/destinations", label: "All Destinations", icon: "○" },
        { to: "/blog", label: "Blog", icon: "○" },
        { to: "/faq", label: "FAQ", icon: "○" },
        { to: "/contact", label: "Contact Us", icon: "○" },
      ],
    },
    {
      title: "Planning",
      items: [
        { to: "/plan-trip", label: "AI Planner", icon: "○" },
        ...(isLoggedIn ? [{ to: "/saved-trips", label: "Saved Trips", icon: "○" }] : []),
        { to: "/profile", label: "Travel Preferences", icon: "○" },
        { to: "/how-it-works", label: "How It Works", icon: "○" },
      ],
    },
    {
      title: "Guides",
      items: [
        { to: "/guides", label: "Find a Guide", icon: "○" },
        { to: "/how-it-works", label: "How Guide Booking Works", icon: "○" },
      ],
    },
    ...(isLoggedIn
      ? [
          {
            title: "Account",
            items: [
              { to: "/profile", label: "Profile", icon: "○" },
              { to: "/saved-trips", label: "Saved Trips", icon: "○" },
              { to: "/settings", label: "Settings", icon: "○" },
            ],
          },
        ]
      : []),
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem("theme") || root.getAttribute("data-theme") || "light";
    setThemeMode(savedTheme);

    const observer = new MutationObserver(() => {
      const nextTheme = root.getAttribute("data-theme") || localStorage.getItem("theme") || "light";
      setThemeMode(nextTheme);
    });

    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loggedIn =
      localStorage.getItem("isLoggedIn") === "true" ||
      sessionStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedIn);
  }, [setIsLoggedIn]);

  useEffect(() => {
    setShowMoreMenu(false);
    setShowMobileMenu(false);
    setShowProfile(false);
  }, [location]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 980) {
        setShowMobileMenu(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        showMoreMenu &&
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target)
      ) {
        setShowMoreMenu(false);
      }

      if (
        showProfile &&
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target)
      ) {
        setShowProfile(false);
      }

      if (
        showMobileMenu &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setShowMobileMenu(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowMoreMenu(false);
        setShowProfile(false);
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMoreMenu, showMobileMenu, showProfile]);

  const logout = async () => {
    try {
      await fetch("http://localhost:8000/accounts/logout/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } catch {}

    localStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("plantrip_step");
    localStorage.removeItem("plantrip_formData");
    localStorage.removeItem("plantrip_itinerary");

    setIsLoggedIn(false);
    setShowLogoutConfirm(false);
    toast.success("Logged out successfully");
    navigate("/");
  };

  const renderNavLink = (item, className) => (
    <NavLink
      key={`${className}-${item.to}-${item.label}`}
      to={item.to}
      className={({ isActive }) => `${className}${isActive ? " active" : ""}`}
    >
      {item.label}
    </NavLink>
  );

  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || themeMode || "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    setThemeMode(nextTheme);
  };

  return (
    <>
      <nav className={`navbar ${isScrolled ? "scrolled" : ""}`}>
        <div className="navbar-container">
          <Link to="/home" className="logo">
            <TripPlannerBrand subtitle="Smart travel platform" compact />
          </Link>

          <div className="nav-menu-core">
            {coreLinks.map((item) => renderNavLink(item, "nav-link"))}

            <div
              className="more-menu-wrapper"
              ref={moreMenuRef}
            >
              <button
                className={`nav-link nav-link-button ${showMoreMenu ? "active" : ""}`}
                onClick={() => {
                  setShowProfile(false);
                  setShowMoreMenu((current) => !current);
                }}
                aria-expanded={showMoreMenu}
                aria-haspopup="true"
              >
                More
                <span className={`nav-link-chevron ${showMoreMenu ? "open" : ""}`}>▾</span>
              </button>

              <div className={`more-menu-panel ${showMoreMenu ? "open" : ""}`}>
                <div className="more-menu-links">
                  {moreLinks.map((item) => renderNavLink(item, "more-menu-link"))}
                </div>
              </div>
            </div>
          </div>

          <div className="nav-actions">
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {themeMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {!isLoggedIn ? (
              <div className="auth-buttons">
                <button className="btn-login" onClick={() => setShowAuth(true)}>
                  Log In
                </button>
                <button className="btn-signup" onClick={() => setShowAuth(true)}>
                  Sign Up
                </button>
              </div>
            ) : (
              <div className="profile-wrapper" ref={accountMenuRef}>
                <button
                  className="profile-btn"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowMobileMenu(false);
                    setShowProfile((current) => !current);
                  }}
                  aria-label="Open account menu"
                  aria-expanded={showProfile}
                >
                  <span className="avatar-circle">{userEmail ? userEmail[0].toUpperCase() : "U"}</span>
                  <span className="profile-copy">
                    <span className="profile-name">{displayName}</span>
                    <span className="profile-meta">Account</span>
                  </span>
                  <span className={`profile-chevron ${showProfile ? "open" : ""}`}>▾</span>
                </button>

                <div className={`profile-dropdown ${showProfile ? "show" : ""}`}>
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">{userEmail ? userEmail[0].toUpperCase() : "U"}</div>
                    <div className="dropdown-header-copy">
                      <span className="user-name">{displayName}</span>
                      <span className="user-email">{userEmail || "User"}</span>
                      <Link to="/profile" className="view-profile-link">
                        View Profile
                      </Link>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  {accountLinks.map((item) => renderNavLink(item, "dropdown-item"))}
                  <div className="dropdown-divider"></div>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="dropdown-item logout-btn"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}

            <button
              className={`hamburger-btn ${showMobileMenu ? "active" : ""}`}
              onClick={() => {
                setShowMoreMenu(false);
                setShowProfile(false);
                setShowMobileMenu((current) => !current);
              }}
              aria-label="Menu"
              aria-expanded={showMobileMenu}
            >
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </button>
          </div>
        </div>

        <div ref={mobileMenuRef} className={`side-menu ${showMobileMenu ? "open" : ""}`}>
          <div className="side-menu-header">
            <div className="side-menu-copy">
              <span className="side-menu-eyebrow">Navigation</span>
              <strong>{isLoggedIn ? displayName : "TripPlanner"}</strong>
              <span>
                {isLoggedIn
                  ? "Everything you need to plan, book, and manage your trip."
                  : "Explore trips, planners, guides, and travel resources."}
              </span>
            </div>
            <button
              className="close-btn"
              onClick={() => setShowMobileMenu(false)}
              aria-label="Close menu"
            >
              ×
            </button>
          </div>

          <div className="side-menu-content">
            {mobileSections.map((section) => (
              <div key={section.title} className="drawer-section">
                <div className="drawer-section-label">{section.title}</div>
                <div className="secondary-links">
                  {section.items.map((item) => (
                    <NavLink
                      key={`${section.title}-${item.label}`}
                      to={item.to}
                      className={({ isActive }) => `secondary-link${isActive ? " active" : ""}`}
                    >
                      <span className="secondary-link-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}

            {!isLoggedIn ? (
              <div className="mobile-auth-actions">
                <button className="btn-login mobile-auth-btn" onClick={() => setShowAuth(true)}>
                  Log In
                </button>
                <button className="btn-signup mobile-auth-btn" onClick={() => setShowAuth(true)}>
                  Sign Up
                </button>
              </div>
            ) : (
              <div className="mobile-account-footer">
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="secondary-link secondary-link-logout"
                >
                  <span className="secondary-link-icon">•</span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className={`side-menu-overlay ${showMobileMenu ? "open" : ""}`}
          onClick={() => setShowMobileMenu(false)}
        ></div>
      </nav>

      {showAuth && (
        <AuthModal
          close={() => setShowAuth(false)}
          setIsLoggedIn={setIsLoggedIn}
          mode="login"
        />
      )}

      <AppPopupModal
        isOpen={showLogoutConfirm}
        type="error"
        icon="⎋"
        title="Ready to leave?"
        message="You will be securely signed out and will need to log in again to access your dashboard."
        onClose={() => setShowLogoutConfirm(false)}
        closeOnOverlay
        initialFocus="secondary"
        secondaryAction={{
          label: "Cancel",
          onClick: () => setShowLogoutConfirm(false),
        }}
        primaryAction={{
          label: "Yes, Log me out",
          onClick: logout,
        }}
      />
    </>
  );
}
