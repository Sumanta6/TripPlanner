import { useState } from 'react';
import {
    FaUser, FaLock, FaBell, FaSignOutAlt, FaEye, FaEyeSlash,
    FaToggleOn, FaToggleOff, FaSave, FaChevronRight
} from 'react-icons/fa';
import './Settings.css';

export default function Settings() {
    const [activeSection, setActiveSection] = useState('profile');
    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfPass, setShowConfPass] = useState(false);
    const [notifications, setNotifications] = useState({
        newAssignment: true,
        tripReminders: true,
        messages: true,
        ratings: false,
        systemUpdates: false,
    });

    const [profileForm, setProfileForm] = useState({
        name: 'Sumanta Gautam',
        phone: '+977-9841-234567',
        address: 'Thamel, Kathmandu, Nepal',
    });

    const [savedProfile, setSavedProfile] = useState(false);
    const [savedPassword, setSavedPassword] = useState(false);

    const handleProfileSave = (e) => {
        e.preventDefault();
        setSavedProfile(true);
        setTimeout(() => setSavedProfile(false), 2500);
    };

    const handlePasswordSave = (e) => {
        e.preventDefault();
        setSavedPassword(true);
        setTimeout(() => setSavedPassword(false), 2500);
    };

    const sections = [
        { key: 'profile', icon: FaUser, label: 'Update Profile' },
        { key: 'password', icon: FaLock, label: 'Change Password' },
        { key: 'notifications', icon: FaBell, label: 'Notifications' },
        { key: 'logout', icon: FaSignOutAlt, label: 'Logout' },
    ];

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>⚙️ Account Settings</h1>
                <p>Manage your profile, security, and preferences</p>
            </div>

            <div className="settings-layout">
                {/* Sidebar */}
                <div className="settings-sidebar">
                    {sections.map(sec => {
                        const Icon = sec.icon;
                        return (
                            <button
                                key={sec.key}
                                className={`settings-sidebar-item ${activeSection === sec.key ? 'active' : ''} ${sec.key === 'logout' ? 'logout-item' : ''}`}
                                onClick={() => setActiveSection(sec.key)}
                            >
                                <Icon className="sidebar-icon" />
                                <span>{sec.label}</span>
                                <FaChevronRight className="sidebar-arrow" />
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="settings-content">

                    {/* Update Profile */}
                    {activeSection === 'profile' && (
                        <div className="settings-section">
                            <h2>Update Profile</h2>
                            <p className="section-desc">Keep your guide information up to date</p>
                            <form onSubmit={handleProfileSave} className="settings-form">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        value={profileForm.name}
                                        onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                                        placeholder="Your full name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={profileForm.phone}
                                        onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                                        placeholder="+977-XXXX-XXXXXX"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Address</label>
                                    <input
                                        type="text"
                                        value={profileForm.address}
                                        onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                                        placeholder="Your address"
                                    />
                                </div>
                                <button type="submit" className={`settings-save-btn ${savedProfile ? 'saved' : ''}`}>
                                    <FaSave />
                                    {savedProfile ? '✓ Saved!' : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Change Password */}
                    {activeSection === 'password' && (
                        <div className="settings-section">
                            <h2>Change Password</h2>
                            <p className="section-desc">Use a strong password to protect your account</p>
                            <form onSubmit={handlePasswordSave} className="settings-form">
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <div className="password-input-wrap">
                                        <input
                                            type={showOldPass ? 'text' : 'password'}
                                            placeholder="Enter current password"
                                        />
                                        <button type="button" className="toggle-pass" onClick={() => setShowOldPass(p => !p)}>
                                            {showOldPass ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <div className="password-input-wrap">
                                        <input
                                            type={showNewPass ? 'text' : 'password'}
                                            placeholder="Enter new password"
                                        />
                                        <button type="button" className="toggle-pass" onClick={() => setShowNewPass(p => !p)}>
                                            {showNewPass ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <div className="password-input-wrap">
                                        <input
                                            type={showConfPass ? 'text' : 'password'}
                                            placeholder="Confirm new password"
                                        />
                                        <button type="button" className="toggle-pass" onClick={() => setShowConfPass(p => !p)}>
                                            {showConfPass ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>
                                <div className="password-requirements">
                                    <p>Password must be at least 8 characters, containing uppercase, lowercase, numbers, and symbols.</p>
                                </div>
                                <button type="submit" className={`settings-save-btn ${savedPassword ? 'saved' : ''}`}>
                                    <FaSave />
                                    {savedPassword ? '✓ Updated!' : 'Update Password'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Notifications */}
                    {activeSection === 'notifications' && (
                        <div className="settings-section">
                            <h2>Notification Preferences</h2>
                            <p className="section-desc">Choose what you want to be notified about</p>
                            <div className="notification-list">
                                {[
                                    { key: 'newAssignment', label: 'New Traveler Assignments', desc: 'Alert when a new traveler is assigned to you' },
                                    { key: 'tripReminders', label: 'Trip Reminders', desc: 'Reminders 3 days and 1 day before a trip starts' },
                                    { key: 'messages', label: 'Messages from Travelers', desc: 'Get notified when travelers send you messages' },
                                    { key: 'ratings', label: 'New Ratings & Reviews', desc: 'When a traveler leaves a rating for you' },
                                    { key: 'systemUpdates', label: 'System Updates', desc: 'Platform announcements and feature updates' },
                                ].map(item => (
                                    <div key={item.key} className="notification-item">
                                        <div className="notification-info">
                                            <span className="notification-label">{item.label}</span>
                                            <span className="notification-desc">{item.desc}</span>
                                        </div>
                                        <button
                                            className={`toggle-btn ${notifications[item.key] ? 'on' : 'off'}`}
                                            onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                            title={notifications[item.key] ? 'Turn off' : 'Turn on'}
                                        >
                                            {notifications[item.key] ? <FaToggleOn /> : <FaToggleOff />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Logout */}
                    {activeSection === 'logout' && (
                        <div className="settings-section logout-section">
                            <div className="logout-icon-wrap">
                                <FaSignOutAlt className="logout-big-icon" />
                            </div>
                            <h2>Logout</h2>
                            <p className="section-desc">You will be signed out of your guide account.</p>
                            <div className="logout-info-box">
                                <p>Make sure you have saved any unsaved changes before logging out.</p>
                            </div>
                            <div className="logout-actions">
                                <button className="logout-cancel-btn" onClick={() => setActiveSection('profile')}>
                                    Cancel
                                </button>
                                <button
                                    className="logout-confirm-btn"
                                    onClick={() => {
                                        localStorage.removeItem('guideLoggedIn');
                                        sessionStorage.removeItem('guideLoggedIn');
                                        window.location.href = '/login';
                                    }}
                                >
                                    <FaSignOutAlt /> Confirm Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
