import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    FaBars, FaTimes, FaCompass, FaUserCircle,
    FaSignOutAlt, FaSun, FaMoon, FaCog
} from 'react-icons/fa';
import LogoutModal from './LogoutModal';
import './GuideNavbar.css';

function getStoredTheme() {
    const stored = localStorage.getItem('guide-theme') || 'light';
    if (stored === 'system') {
        return 'system';
    }
    return stored;
}

export default function GuideNavbar({ onLogout }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [theme, setTheme] = useState(getStoredTheme);
    const [scrolled, setScrolled] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    /* ── Theme application ─────────────────────────────────────────────────── */
    useEffect(() => {
        let resolved = theme;
        if (theme === 'system') {
            resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', resolved);
        localStorage.setItem('guide-theme', theme);
    }, [theme]);

    /* System theme listener */
    useEffect(() => {
        if (theme === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e) => document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            mq.addEventListener('change', handler);
            return () => mq.removeEventListener('change', handler);
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => {
            const resolved = prev === 'system'
                ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                : prev;
            return resolved === 'light' ? 'dark' : 'light';
        });
    };

    /* ── Scroll detection ──────────────────────────────────────────────────── */
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    /* ── Resolve display theme for icon ─────────────────────────────────────── */
    const displayTheme = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;

    return (
        <nav className={`guide-navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="guide-navbar-container">

                {/* ── Brand ── */}
                <NavLink to="/home" className="guide-navbar-logo">
                    <div className="guide-logo-wrap">
                        <FaCompass className="guide-logo-icon" />
                    </div>
                    <span className="guide-logo-text">
                        Trip<strong>Planner</strong>
                    </span>
                </NavLink>

                {/* ── Nav Links ── */}
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

                    <div className="guide-nav-divider" />

                    <li className="guide-nav-item">
                        <NavLink to="/profile" className="guide-nav-link" onClick={() => setMenuOpen(false)}>
                            <FaUserCircle className="guide-nav-icon" /> Profile
                        </NavLink>
                    </li>
                    <li className="guide-nav-item">
                        <NavLink to="/settings" className="guide-nav-link" onClick={() => setMenuOpen(false)}>
                            <FaCog className="guide-nav-icon" /> Settings
                        </NavLink>
                    </li>
                    <li className="guide-nav-item">
                        <button className="guide-nav-logout-btn" onClick={() => { setMenuOpen(false); setShowLogoutModal(true); }}>
                            <FaSignOutAlt className="guide-nav-icon" /> Logout
                        </button>
                    </li>
                </ul>

                {/* ── Right Controls ── */}
                <div className="guide-navbar-right">
                    <button
                        className="theme-toggle-btn"
                        onClick={toggleTheme}
                        title={displayTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                        aria-label="Toggle dark mode"
                    >
                        {displayTheme === 'light'
                            ? <FaMoon className="theme-icon" />
                            : <FaSun className="theme-icon" />
                        }
                    </button>

                    <div className="guide-menu-icon" onClick={() => setMenuOpen(!menuOpen)}>
                        {menuOpen ? <FaTimes /> : <FaBars />}
                    </div>
                </div>

            </div>

            {/* Logout Confirmation Modal */}
            <LogoutModal 
                isOpen={showLogoutModal} 
                onClose={() => setShowLogoutModal(false)}
                onConfirm={() => {
                    setShowLogoutModal(false);
                    onLogout();
                }}
            />
        </nav>
    );
}
