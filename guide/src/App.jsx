import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import GuideLayout from './components/GuideLayout';
import Dashboard from './pages/DashboardNew';
import Travelers from './pages/Travelers';
import Itineraries from './pages/Itineraries';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Reviews from './pages/Reviews';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { clearGuideAuthToken, storeGuideAuthToken } from './services/guidesService';

// ── helpers ──────────────────────────────────────────────────────────────────
const GUIDE_KEY = 'guideLoggedIn';
const LANDING_URL = 'http://localhost:3000/';

function getInitialAuth() {
    return (
        localStorage.getItem(GUIDE_KEY) === 'true' ||
        sessionStorage.getItem(GUIDE_KEY) === 'true'
    );
}

// Protected route – redirects to /login if not authenticated
function Protected({ loggedIn, children }) {
    if (!loggedIn) return <Navigate to="/login" replace />;
    return children;
}

// ── root component ────────────────────────────────────────────────────────────
export default function App() {
    const [loggedIn, setLoggedIn] = useState(getInitialAuth);

    useEffect(() => {
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search || '';

        // Payment callbacks belong to the traveler app. If this route lands in the
        // guide app, bounce it back instead of falling through to guide login.
        if (currentPath === '/guides/payment/callback' || currentPath === '/payment/callback') {
            window.location.replace(`${LANDING_URL}payment/callback${currentSearch}`);
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const guideToken = params.get('guide_token');
        const remember = params.get('remember') === '1';

        if (!guideToken) return;

        storeGuideAuthToken(guideToken, remember);
        if (remember) {
            localStorage.setItem(GUIDE_KEY, 'true');
            sessionStorage.removeItem(GUIDE_KEY);
        } else {
            sessionStorage.setItem(GUIDE_KEY, 'true');
            localStorage.removeItem(GUIDE_KEY);
        }
        setLoggedIn(true);
        params.delete('guide_token');
        params.delete('remember');
        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState({}, '', next);
    }, []);

    // keep in sync across tabs
    useEffect(() => {
        const sync = () => setLoggedIn(getInitialAuth());
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, []);

    function handleLogin(remember = false) {
        if (remember) {
            localStorage.setItem(GUIDE_KEY, 'true');
            sessionStorage.removeItem(GUIDE_KEY);
        } else {
            sessionStorage.setItem(GUIDE_KEY, 'true');
            localStorage.removeItem(GUIDE_KEY);
        }
        setLoggedIn(true);
    }

    function handleLogout() {
        clearGuideAuthToken();
        localStorage.removeItem(GUIDE_KEY);
        sessionStorage.removeItem(GUIDE_KEY);
        setLoggedIn(false);
        window.location.replace(LANDING_URL);
    }

    return (
        <AuthProvider loggedIn={loggedIn} onLogout={handleLogout}>
            <Toaster position="top-right" />
            <Routes>
                {/* default → login */}
                <Route path="/" element={<Navigate to={loggedIn ? "/home" : "/login"} replace />} />

                {/* public routes */}
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

                {/* protected routes wrapped in GuideLayout */}
                <Route
                    element={
                        <Protected loggedIn={loggedIn}>
                            <GuideLayout onLogout={handleLogout} />
                        </Protected>
                    }
                >
                    <Route path="/home" element={<Home />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/travelers" element={<Travelers />} />
                    <Route path="/itineraries" element={<Itineraries />} />
                    <Route path="/reviews" element={<Reviews />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                </Route>

                {/* catch-all */}
                <Route path="*" element={<Navigate to={loggedIn ? "/home" : "/login"} replace />} />
            </Routes>
        </AuthProvider>
    );
}
