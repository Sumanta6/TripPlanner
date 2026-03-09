import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const API = 'http://127.0.0.1:8000/accounts';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            await axios.post(`${API}/forgot-password/`, { email });
            setMessage(
                'If an account with this email exists, a reset link has been sent.'
            );
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay">
            <div className="auth-box">
                <span className="close" onClick={() => window.location.href = "http://localhost:3000"}>✕</span>

                <h2>Forgot Password</h2>

                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    {error && <p className="error-text">{error}</p>}
                    {message && <p className="error-text" style={{ color: '#16a34a' }}>{message}</p>}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Sending…' : 'Send Reset Link'}
                    </button>
                </form>

                <p className="toggle">
                    Remember your password?{' '}
                    <Link to="/login">Back to Login</Link>
                </p>
            </div>
        </div>
    );
}
