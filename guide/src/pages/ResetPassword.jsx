import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const API = 'http://127.0.0.1:8000/accounts';

export default function ResetPassword() {
    const { uid, token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            await axios.post(`${API}/reset-password/${uid}/${token}/`, { password });
            setMessage('Password reset successful! Redirecting to login…');
            setTimeout(() => navigate('/login'), 2500);
        } catch {
            setError('Invalid or expired reset link.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay">
            <div className="auth-box">
                <span className="close" onClick={() => window.location.href = "http://localhost:3000"}>✕</span>

                <h2>Reset Password</h2>

                <form onSubmit={handleSubmit}>
                    <div className="password-wrapper">
                        <input
                            type="password"
                            placeholder="New password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="password-wrapper">
                        <input
                            type="password"
                            placeholder="Confirm password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="error-text">{error}</p>}
                    {message && <p className="error-text" style={{ color: '#16a34a' }}>{message}</p>}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Resetting…' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
