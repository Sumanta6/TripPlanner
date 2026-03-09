import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaBars, FaTimes, FaCompass, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import './GuideNavbar.css';

export default function GuideNavbar({ onLogout }) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav className="guide-navbar">
            <div className="guide-navbar-container">
                {/* Logo Section */}
                <NavLink to="/home" className="guide-navbar-logo">
                    <FaCompass className="guide-logo-icon" />
                    <span>TripPlanner <strong>Guide</strong></span>
                </NavLink>

                {/* Hamburger Menu Icon */}
                <div
                    className="guide-menu-icon"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    {menuOpen ? <FaTimes /> : <FaBars />}
                </div>

                {/* Nav Links */}
                <ul className={menuOpen ? 'guide-nav-menu active' : 'guide-nav-menu'}>
                    <li className="guide-nav-item">
                        <NavLink to="/home" className="guide-nav-link" onClick={() => setMenuOpen(false)}>
                            Home
                        </NavLink>
                    </li>
                    <li className="guide-nav-item">
                        <NavLink to="/dashboard" className="guide-nav-link" onClick={() => setMenuOpen(false)}>
                            Dashboard
                        </NavLink>
                    </li>
                    <li className="guide-nav-item">
                        <NavLink to="/travelers" className="guide-nav-link" onClick={() => setMenuOpen(false)}>
                            Travelers
                        </NavLink>
                    </li>
                    <li className="guide-nav-item">
                        <NavLink to="/itineraries" className="guide-nav-link" onClick={() => setMenuOpen(false)}>
                            Itineraries
                        </NavLink>
                    </li>

                    {/* Divider for mobile */}
                    <div className="guide-nav-divider"></div>

                    <li className="guide-nav-item">
                        <NavLink to="/profile" className="guide-nav-link" onClick={() => setMenuOpen(false)}>
                            <FaUserCircle className="guide-nav-icon" /> Profile
                        </NavLink>
                    </li>
                    <li className="guide-nav-item">
                        <NavLink to="/settings" className="guide-nav-link" onClick={() => setMenuOpen(false)}>
                            Settings
                        </NavLink>
                    </li>
                    <li className="guide-nav-item">
                        <button className="guide-nav-logout-btn" onClick={() => { setMenuOpen(false); onLogout(); }}>
                            <FaSignOutAlt className="guide-nav-icon" /> Logout
                        </button>
                    </li>
                </ul>
            </div>
        </nav>
    );
}
