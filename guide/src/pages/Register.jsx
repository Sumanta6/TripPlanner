import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';
import './Auth.css';

const API = 'http://localhost:8000/accounts';

axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

export default function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        try {
            await axios.post(
                `${API}/register/`,
                {
                    username: form.username,
                    email: form.email,
                    password: form.password,
                    role: 'guide',
                },
                { withCredentials: true }
            );

            alert('Guide account created! Please log in.');
            navigate('/login');
        } catch (err) {
            const data = err?.response?.data;
            if (data) {
                const msgs = Object.values(data).flat().join(' ');
                setError(msgs || 'Registration failed.');
            } else {
                setError('Cannot reach the server. Is the backend running?');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay">
            <div className="auth-box">
                <span className="close" onClick={() => window.location.href = "http://localhost:3000"}>✕</span>

                <h2>Register Guide</h2>

                <form onSubmit={handleSubmit}>
                    <input
                        name="username"
                        placeholder="Username"
                        value={form.username}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />

                    <div className="password-wrapper">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                        <span
                            className="toggle-password"
                            onClick={() => setShowPassword((v) => !v)}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>

                    <div className="password-wrapper">
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            name="confirmPassword"
                            placeholder="Confirm Password"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                        <span
                            className="toggle-password"
                            onClick={() => setShowConfirm((v) => !v)}
                        >
                            {showConfirm ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>

                    {error && <p className="error-text">{error}</p>}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Creating account…' : 'Sign Up'}
                    </button>
                </form>

                <p className="toggle">
                    Already have a guide account?{' '}
                    <Link to="/login">Log In</Link>
                </p>
            </div>
        </div>
    );
}
