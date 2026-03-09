import { FaUserCircle, FaMapMarkedAlt, FaUsers, FaCog, FaChartBar } from 'react-icons/fa';

/**
 * A reusable clean placeholder component for Guide pages
 */
export default function PagePlaceholder({ title, description, icon: Icon }) {
    return (
        <div style={{
            padding: '48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            color: '#475569'
        }}>
            <div style={{
                fontSize: '64px',
                color: '#cbd5e1',
                marginBottom: '24px'
            }}>
                {Icon && <Icon />}
            </div>
            <h1 style={{ fontSize: '28px', color: '#1e293b', marginBottom: '12px' }}>{title}</h1>
            <p style={{ fontSize: '16px', maxWidth: '400px', lineHeight: '1.6' }}>{description}</p>
        </div>
    );
}

// ── Placeholder Pages ──────────────────────────────────────────────────────────

export function Travelers() {
    return <PagePlaceholder
        title="Travelers Directory"
        description="View and manage all the travelers assigned to you. (Coming soon)"
        icon={FaUsers}
    />;
}

export function Itineraries() {
    return <PagePlaceholder
        title="Manage Itineraries"
        description="Review, approve, or modify itineraries for your upcoming trips. (Coming soon)"
        icon={FaMapMarkedAlt}
    />;
}

export function Profile() {
    return <PagePlaceholder
        title="Guide Profile"
        description="Update your bio, languages spoken, and availability status. (Coming soon)"
        icon={FaUserCircle}
    />;
}

export function Settings() {
    return <PagePlaceholder
        title="Settings"
        description="Manage your account preferences, notifications, and security. (Coming soon)"
        icon={FaCog}
    />;
}

export function Dashboard() {
    return <PagePlaceholder
        title="Analytics Dashboard"
        description="View your performance metrics, earnings, and traveler rating statistics. (Coming soon)"
        icon={FaChartBar}
    />;
}
