import { useState } from 'react';
import {
    FaLock, FaBell, FaSignOutAlt, FaEye, FaEyeSlash,
    FaToggleOn, FaToggleOff, FaSave, FaChevronRight, FaSpinner
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getCookie } from '../services/guidesService';
import axios from 'axios';
import './Settings.css';

const ACCOUNTS_API = 'http://localhost:8000/accounts';

axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

export default function Settings() {
    const { logout } = useAuth();

    const [activeSection, setActiveSection] = useState('password');
    const [showOldPass, setShowOldPass]     = useState(false);
    const [showNewPass, setShowNewPass]     = useState(false);
    const [showConfPass, setShowConfPass]   = useState(false);
    const [notifications, setNotifications] = useState({
        newAssignment: true,
        tripReminders: true,
        messages: true,
        ratings: false,
        systemUpdates: false,
    });

    // Password form
    const [passwordForm, setPasswordForm] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    });

    const [passwordStatus, setPasswordStatus] = useState(null);
    const [passwordError, setPasswordError] = useState('');

    // ── Save password ─────────────────────────────────────────────────────────
    const handlePasswordSave = async (e) => {
        e.preventDefault();
        setPasswordError('');
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setPasswordError('New passwords do not match.');
            return;
        }
        if (passwordForm.new_password.length < 8) {
            setPasswordError('Password must be at least 8 characters.');
            return;
        }
        setPasswordStatus('saving');
        try {
            const csrfToken = getCookie('csrftoken');
            await axios.post(
                `${ACCOUNTS_API}/change-password/`,
                {
                    old_password: passwordForm.old_password,
                    new_password: passwordForm.new_password,
                },
                { 
                    withCredentials: true,
                    headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {}
                }
            );
            setPasswordStatus('saved');
            setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => setPasswordStatus(null), 2500);
        } catch (err) {
            setPasswordError(
                err?.response?.data?.error || 'Password change failed. Check your current password.'
            );
            setPasswordStatus('error');
        }
    };

    const sections = [
        { key: 'password',      icon: FaLock,       label: 'Security & Password' },
        { key: 'notifications', icon: FaBell,       label: 'Notifications' },
        { key: 'logout',        icon: FaSignOutAlt, label: 'Logout Account' },
    ];

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>⚙️ Account Settings</h1>
                <p>Manage your security, and preferences</p>
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
                    {/* Change Password */}
                    {activeSection === 'password' && (
                        <div className="settings-section">
                            <h2>Change Password</h2>
                            <p className="section-desc">Use a strong password to protect your account</p>
                            <form onSubmit={handlePasswordSave} className="settings-form">
                                {[
                                    { label: 'Current Password', key: 'old_password', show: showOldPass, toggle: setShowOldPass },
                                    { label: 'New Password',     key: 'new_password', show: showNewPass, toggle: setShowNewPass },
                                    { label: 'Confirm New Password', key: 'confirm_password', show: showConfPass, toggle: setShowConfPass },
                                ].map(f => (
                                    <div className="form-group" key={f.key}>
                                        <label>{f.label}</label>
                                        <div className="password-input-wrap">
                                            <input
                                                type={f.show ? 'text' : 'password'}
                                                value={passwordForm[f.key]}
                                                onChange={e => setPasswordForm({ ...passwordForm, [f.key]: e.target.value })}
                                                placeholder={`Enter ${f.label.toLowerCase()}`}
                                                required
                                            />
                                            <button type="button" className="toggle-pass" onClick={() => f.toggle(p => !p)}>
                                                {f.show ? <FaEyeSlash /> : <FaEye />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div className="password-requirements" style={{marginTop: '15px'}}>
                                    <p style={{fontSize: '0.86rem', color: '#64748b'}}>Password must be at least 8 characters.</p>
                                </div>
                                {passwordError && <p className="settings-error">{passwordError}</p>}
                                <button
                                    type="submit"
                                    className={`settings-save-btn ${passwordStatus === 'saved' ? 'saved' : ''}`}
                                    disabled={passwordStatus === 'saving'}
                                    style={{marginTop: '20px'}}
                                >
                                    {passwordStatus === 'saving' ? <><FaSpinner className="spin" /> Updating…</> :
                                     passwordStatus === 'saved'  ? '✓ Updated!' :
                                     <><FaSave /> Update Password</>}
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
                                    { key: 'messages',      label: 'Messages from Travelers', desc: 'Get notified when travelers send you messages' },
                                    { key: 'ratings',       label: 'New Ratings & Reviews', desc: 'When a traveler leaves a rating for you' },
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
                                <button className="logout-cancel-btn" onClick={() => setActiveSection('password')}>
                                    Cancel
                                </button>
                                <button className="logout-confirm-btn" onClick={logout}>
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
