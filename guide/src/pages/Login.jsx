import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';
import { storeGuideAuthToken } from '../services/guidesService';
import './Auth.css';

const GOOGLE_CLIENT_ID =
    '320492427698-7se212gnd06b14a41a3jsca1sqiv4pn7.apps.googleusercontent.com';
const API = 'http://localhost:8000/accounts';

axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

export default function Login({ onLogin }) {
    const navigate = useNavigate();
    const googleRendered = useRef(false);
    const googleCallback = useRef(null);

    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ── Google OAuth ──────────────────────────────────────────────────────────
    const handleGoogleResponse = useCallback(
        async (response) => {
            setError('');
            try {
                const res = await axios.post(
                    `${API}/guide/google-login/`,
                    { token: response.credential },
                    { withCredentials: true }
                );
                storeGuideAuthToken(res.data?.token, true);

                onLogin(true); // remember = true for Google
                navigate('/dashboard');
            } catch {
                setError('Google sign-in failed. Please try again.');
            }
        },
        [navigate, onLogin]
    );

    googleCallback.current = handleGoogleResponse;

    useEffect(() => {
        const timer = setInterval(() => {
            const btn = document.getElementById('guide-google-btn');
            if (window.google && btn) {
                window.__tripPlannerGuideGoogleCallback = (response) => {
                    googleCallback.current?.(response);
                };
                if (!window.__tripPlannerGuideGoogleInitialized) {
                    window.google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: (response) => window.__tripPlannerGuideGoogleCallback?.(response),
                        ux_mode: 'popup',
                    });
                    window.__tripPlannerGuideGoogleInitialized = true;
                }
                if (!googleRendered.current) {
                    window.google.accounts.id.renderButton(btn, {
                        theme: 'outline',
                        size: 'large',
                        width: 300,
                    });
                    googleRendered.current = true;
                }
                clearInterval(timer);
            }
        }, 300);
        return () => clearInterval(timer);
    }, [handleGoogleResponse]);

    // ── Email / Password login ────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await axios.post(
                `${API}/guide/login/`,
                { email: form.email, password: form.password, remember_me: rememberMe },
                { withCredentials: true }
            );
            storeGuideAuthToken(res.data?.token, rememberMe);

            onLogin(rememberMe);
            navigate('/dashboard');
        } catch (err) {
            setError(
                err?.response?.data?.error || 'Invalid email or password.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay">
            <div className="auth-box">
                <span className="close" onClick={() => window.location.href = "http://localhost:3000"}>✕</span>

                <h2>Guide Log In</h2>

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                    />

                    <div className="password-wrapper">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                        />
                        <span
                            className="toggle-password"
                            onClick={() => setShowPassword((v) => !v)}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>

                    <div className="remember-me">
                        <label>
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            Remember me
                        </label>
                    </div>

                    <p className="forgot-link" onClick={() => navigate('/forgot-password')}>
                        Forgot password?
                    </p>

                    {error && <p className="error-text">{error}</p>}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Log In'}
                    </button>
                </form>

                <div className="divider">OR</div>

                <div className="google-btn-center">
                    <div id="guide-google-btn"></div>
                </div>

                <p className="toggle">
                    Don't have a guide account?{' '}
                    <Link to="/register">Sign Up</Link>
                </p>
            </div>
        </div>
    );
}
