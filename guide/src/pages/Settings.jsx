import { useState, useEffect, useMemo } from 'react';
import {
    FaLock, FaSignOutAlt, FaEye, FaEyeSlash, FaCog,
    FaSave, FaChevronRight, FaSpinner, FaPalette,
    FaSun, FaMoon, FaDesktop, FaCheckCircle, FaShieldAlt, FaCircle
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getCookie, getGuideAuthToken } from '../services/guidesService';
import axios from 'axios';
import './Settings.css';

const ACCOUNTS_API = 'http://localhost:8000/accounts';
axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

/* ── Password Strength Helper ────────────────────────────────────────────────── */
function getStrength(pw) {
    if (!pw) return { level: 0, label: '' };
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: 'Weak',   cls: 'weak' };
    if (score <= 2) return { level: 2, label: 'Fair',   cls: 'fair' };
    if (score <= 3) return { level: 3, label: 'Good',   cls: 'good' };
    return              { level: 4, label: 'Strong', cls: 'strong' };
}

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function Settings() {
    const { logout } = useAuth();

    const [activeSection, setActiveSection] = useState('appearance');
    const [showOldPass, setShowOldPass]     = useState(false);
    const [showNewPass, setShowNewPass]     = useState(false);
    const [showConfPass, setShowConfPass]   = useState(false);

    /* ── Theme State ─────────────────────────────────────────────────────────── */
    const [theme, setTheme] = useState(() =>
        localStorage.getItem('guide-theme') || 'light'
    );

    const applyTheme = (t) => {
        setTheme(t);
        let resolved = t;
        if (t === 'system') {
            resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', resolved);
        localStorage.setItem('guide-theme', t);
    };

    useEffect(() => {
        if (theme === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e) => document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            mq.addEventListener('change', handler);
            return () => mq.removeEventListener('change', handler);
        }
    }, [theme]);

    /* ── Password State ──────────────────────────────────────────────────────── */
    const [passwordForm, setPasswordForm] = useState({
        old_password: '', new_password: '', confirm_password: ''
    });
    const [passwordStatus, setPasswordStatus] = useState(null);
    const [passwordError, setPasswordError]   = useState('');

    const strength = useMemo(() => getStrength(passwordForm.new_password), [passwordForm.new_password]);

    const validations = useMemo(() => {
        const pw = passwordForm.new_password;
        return [
            { label: 'At least 8 characters',     passed: pw.length >= 8 },
            { label: 'Contains uppercase letter',  passed: /[A-Z]/.test(pw) },
            { label: 'Contains a number',          passed: /[0-9]/.test(pw) },
            { label: 'Contains special character',  passed: /[^A-Za-z0-9]/.test(pw) },
        ];
    }, [passwordForm.new_password]);

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
            const guideToken = getGuideAuthToken();
            await axios.post(
                `${ACCOUNTS_API}/change-password/`,
                {
                    old_password: passwordForm.old_password,
                    new_password: passwordForm.new_password,
                    confirm_password: passwordForm.confirm_password,
                },
                {
                    withCredentials: true,
                    headers: {
                        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
                        ...(guideToken ? { Authorization: `Bearer ${guideToken}` } : {}),
                    },
                }
            );
            setPasswordStatus('saved');
            setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => setPasswordStatus(null), 3000);
        } catch (err) {
            const data = err?.response?.data || {};
            const fieldErrors = data.errors ? Object.values(data.errors).flat().join(' ') : '';
            setPasswordError(data.error || fieldErrors || 'Password change failed. Check your current password.');
            setPasswordStatus('error');
        }
    };

    /* ── Sidebar Config ──────────────────────────────────────────────────────── */
    const sections = [
        { key: 'appearance', icon: FaPalette,    label: 'Appearance' },
        { key: 'security',   icon: FaLock,       label: 'Security' },
        { key: 'logout',     icon: FaSignOutAlt, label: 'Logout' },
    ];

    /* ════════════════════════════════════════════════════════════════════════── */
    return (
        <div className="settings-page">

            {/* ── Header ── */}
            <div className="settings-header">
                <div className="settings-header-row">
                    <div className="settings-header-icon"><FaCog /></div>
                    <div>
                        <h1>Settings</h1>
                        <p>Manage your appearance, security, and account preferences</p>
                    </div>
                </div>
            </div>

            <div className="settings-layout">

                {/* ── Sidebar ── */}
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

                {/* ── Content ── */}
                <div className="settings-content">

                    {/* ═══ APPEARANCE ═══ */}
                    {activeSection === 'appearance' && (
                        <div className="settings-section" key="appearance">
                            <h2>Appearance</h2>
                            <p className="section-desc">Choose how the guide portal looks for you</p>

                            <div className="theme-cards">
                                {[
                                    { key: 'light',  icon: FaSun,     label: 'Light Mode',     desc: 'Clean and bright',          previewCls: 'light-preview' },
                                    { key: 'dark',   icon: FaMoon,    label: 'Dark Mode',      desc: 'Easy on the eyes',          previewCls: 'dark-preview' },
                                    { key: 'system', icon: FaDesktop, label: 'System Default',  desc: 'Follows your OS setting',  previewCls: 'system-preview' },
                                ].map(t => {
                                    const TIcon = t.icon;
                                    const isSelected = theme === t.key;
                                    return (
                                        <div
                                            key={t.key}
                                            className={`theme-card ${isSelected ? 'selected' : ''}`}
                                            onClick={() => applyTheme(t.key)}
                                        >
                                            <div className={`theme-card-preview ${t.previewCls}`} />
                                            <TIcon className="theme-card-icon" />
                                            <span className="theme-card-label">{t.label}</span>
                                            <span className="theme-card-desc">{t.desc}</span>
                                            {isSelected && (
                                                <span className="selected-check"><FaCheckCircle /> Active</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ═══ SECURITY ═══ */}
                    {activeSection === 'security' && (
                        <div className="settings-section" key="security">
                            <h2>Security</h2>
                            <p className="section-desc">Keep your account safe with a strong password</p>

                            <div className="security-card">
                                <form onSubmit={handlePasswordSave} className="settings-form">
                                    {[
                                        { label: 'Current Password',     key: 'old_password',     show: showOldPass,  toggle: setShowOldPass },
                                        { label: 'New Password',         key: 'new_password',     show: showNewPass,  toggle: setShowNewPass },
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
                                                    disabled={passwordStatus === 'saving'}
                                                />
                                                <button type="button" className="toggle-pass" onClick={() => f.toggle(p => !p)}>
                                                    {f.show ? <FaEyeSlash /> : <FaEye />}
                                                </button>
                                            </div>

                                            {/* Strength meter after new password */}
                                            {f.key === 'new_password' && passwordForm.new_password && (
                                                <>
                                                    <div className="strength-meter">
                                                        {[1, 2, 3, 4].map(i => (
                                                            <div key={i} className={`strength-bar ${i <= strength.level ? `active ${strength.cls}` : ''}`} />
                                                        ))}
                                                    </div>
                                                    {strength.label && (
                                                        <span className={`strength-label ${strength.cls}`}>{strength.label}</span>
                                                    )}
                                                    <ul className="validation-list">
                                                        {validations.map(v => (
                                                            <li key={v.label} className={v.passed ? 'passed' : ''}>
                                                                {v.passed ? <FaCheckCircle className="check-icon" /> : <FaCircle className="check-icon" />}
                                                                {v.label}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    {passwordError && <p className="settings-error">{passwordError}</p>}
                                    {passwordStatus === 'saved' && <p className="settings-success">✓ Password updated successfully!</p>}

                                    <button
                                        type="submit"
                                        className={`settings-save-btn ${passwordStatus === 'saved' ? 'saved' : ''}`}
                                        disabled={passwordStatus === 'saving'}
                                    >
                                        {passwordStatus === 'saving' ? <><FaSpinner className="spin" /> Updating…</> :
                                         passwordStatus === 'saved'  ? '✓ Updated!' :
                                         <><FaSave /> Update Password</>}
                                    </button>
                                </form>
                            </div>

                            {/* Security info */}
                            <div className="security-info-box">
                                <FaShieldAlt className="security-info-icon" />
                                <p>
                                    <strong>Account Safety</strong><br />
                                    Use a unique password with at least 12 characters including uppercase letters, numbers, and special characters. Never reuse passwords across services.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ═══ LOGOUT ═══ */}
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
                                <button className="logout-cancel-btn" onClick={() => setActiveSection('appearance')}>
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
