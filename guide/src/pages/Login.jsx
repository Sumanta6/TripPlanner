import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';
import './Auth.css';

const GOOGLE_CLIENT_ID =
    '320492427698-7se212gnd06b14a41a3jsca1sqiv4pn7.apps.googleusercontent.com';
const API = 'http://127.0.0.1:8000/accounts';

export default function Login({ onLogin }) {
    const navigate = useNavigate();

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
                    `${API}/google-login/`,
                    { token: response.credential },
                    { withCredentials: true }
                );

                // Role guard – reject traveler accounts on this portal
                const role = res.data?.role;
                if (role && role !== 'guide') {
                    setError('This account belongs to a traveler. Please use the Traveler portal.');
                    return;
                }

                onLogin(true); // remember = true for Google
                navigate('/dashboard');
            } catch {
                setError('Google sign-in failed. Please try again.');
            }
        },
        [navigate, onLogin]
    );

    useEffect(() => {
        const timer = setInterval(() => {
            const btn = document.getElementById('guide-google-btn');
            if (window.google && btn) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse,
                    ux_mode: 'popup',
                });
                window.google.accounts.id.renderButton(btn, {
                    theme: 'outline',
                    size: 'large',
                    width: 300,
                });
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
                `${API}/login/`,
                { email: form.email, password: form.password, remember_me: rememberMe },
                { withCredentials: true }
            );

            // Role guard
            const role = res.data?.role;
            if (role && role !== 'guide') {
                setError('This account belongs to a traveler. Please use the Traveler portal.');
                return;
            }

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
