import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard({ onLogout }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="dashboard-brand">
                    <span className="dashboard-icon">🧭</span>
                    <span className="dashboard-name">TripPlanner Guide</span>
                </div>
                <button className="dashboard-logout-btn" onClick={handleLogout}>
                    Log Out
                </button>
            </header>

            <main className="dashboard-main">
                <div className="dashboard-welcome-card">
                    <div className="dashboard-welcome-icon">🎉</div>
                    <h1>Welcome, Guide!</h1>
                    <p>
                        You are now logged into the Guide Dashboard. More features are
                        coming soon — stay tuned!
                    </p>
                </div>
            </main>
        </div>
    );
}
