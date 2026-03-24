import React, { useState, useEffect, useMemo } from "react";
import { Sun, Moon, Eye, EyeOff, Check, X, ShieldCheck, Palette } from "lucide-react";
import "./Settings.css";

function PwStrength({ pw }) {
    const level = useMemo(() => {
        if (!pw) return 0;
        let s = 0;
        if (pw.length >= 8) s++;
        if (pw.length >= 12) s++;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
        if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
        return Math.min(4, s);
    }, [pw]);

    const meta = [null,
        { label: "Weak",   color: "#ef4444" },
        { label: "Fair",   color: "#f59e0b" },
        { label: "Good",   color: "#3b82f6" },
        { label: "Strong", color: "#10b981" },
    ];
    if (!pw) return null;
    return (
        <div className="pw-strength">
            <div className="pw-bars">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="pw-bar"
                        style={{ background: i <= level ? meta[level].color : "#e5e7eb" }} />
                ))}
            </div>
            <span className="pw-label" style={{ color: meta[level].color }}>{meta[level].label}</span>
        </div>
    );
}

export default function Settings() {
    const [tab, setTab] = useState("appearance");
    const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
    const [toast, setToast] = useState(null);
    const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
    const [show, setShow] = useState({ current: false, next: false, confirm: false });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const showToast = (msg, type = "ok") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const validate = () => {
        const e = {};
        if (!pw.current) e.current = "Current password is required.";
        if (!pw.next || pw.next.length < 8) e.next = "New password must be at least 8 characters.";
        if (pw.next !== pw.confirm) e.confirm = "Passwords do not match.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handlePasswordSave = async () => {
        if (!validate()) return;
        setSaving(true);
        // TODO: call API — e.g. changePassword(pw.current, pw.next)
        await new Promise(r => setTimeout(r, 800));
        setSaving(false);
        setPw({ current: "", next: "", confirm: "" });
        setErrors({});
        showToast("Password updated successfully");
    };

    return (
        <div className="sg-page">
            <div className="sg-shell">

                {toast && (
                    <div className={`sg-toast ${toast.type}`}>
                        {toast.type === "ok" ? <Check size={14} /> : <X size={14} />}
                        {toast.msg}
                    </div>
                )}

                <div className="sg-head">
                    <h1>Settings</h1>
                    <p>Manage your account preferences.</p>
                </div>

                <div className="sg-layout">
                    {/* ── Sidebar ── */}
                    <nav className="sg-nav">
                        <button className={`sg-nav-btn ${tab === "appearance" ? "active" : ""}`} onClick={() => setTab("appearance")}>
                            <Palette size={16} /> Appearance
                        </button>
                        <button className={`sg-nav-btn ${tab === "security" ? "active" : ""}`} onClick={() => setTab("security")}>
                            <ShieldCheck size={16} /> Password &amp; Security
                        </button>
                    </nav>

                    {/* ── Content ── */}
                    <div className="sg-panel">

                        {/* APPEARANCE */}
                        {tab === "appearance" && (
                            <div className="sg-section fade-in">
                                <h2>Appearance</h2>
                                <p className="sg-sub">Choose how TripPlanner looks on your device.</p>

                                <div className="sg-theme-row">
                                    {[
                                        { id: "light", label: "Light", icon: <Sun size={18} /> },
                                        { id: "dark",  label: "Dark",  icon: <Moon size={18} /> },
                                    ].map(t => (
                                        <button key={t.id}
                                            className={`sg-theme-card ${theme === t.id ? "active" : ""}`}
                                            onClick={() => setTheme(t.id)}>
                                            <div className={`sg-preview sg-preview-${t.id}`}>
                                                <div className="pvw-bar" />
                                                <div className="pvw-body">
                                                    <div className="pvw-card" />
                                                    <div className="pvw-card pvw-card-sm" />
                                                </div>
                                            </div>
                                            <div className="sg-theme-footer">
                                                {t.icon}
                                                <span>{t.label}</span>
                                                {theme === t.id && <Check size={14} className="sg-chk" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* SECURITY */}
                        {tab === "security" && (
                            <div className="sg-section fade-in">
                                <h2>Password &amp; Security</h2>
                                <p className="sg-sub">Update your password to keep your account secure.</p>

                                <div className="sg-form">
                                    {/* Current */}
                                    <div className={`sg-field ${errors.current ? "has-error" : ""}`}>
                                        <label>Current Password</label>
                                        <div className="sg-input-wrap">
                                            <input type={show.current ? "text" : "password"}
                                                className="sg-input"
                                                value={pw.current}
                                                onChange={e => { setPw({ ...pw, current: e.target.value }); setErrors({ ...errors, current: null }); }}
                                                placeholder="Enter current password" />
                                            <button className="sg-eye" onClick={() => setShow({ ...show, current: !show.current })}>
                                                {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {errors.current && <span className="sg-err">{errors.current}</span>}
                                    </div>

                                    {/* New */}
                                    <div className={`sg-field ${errors.next ? "has-error" : ""}`}>
                                        <label>New Password</label>
                                        <div className="sg-input-wrap">
                                            <input type={show.next ? "text" : "password"}
                                                className="sg-input"
                                                value={pw.next}
                                                onChange={e => { setPw({ ...pw, next: e.target.value }); setErrors({ ...errors, next: null }); }}
                                                placeholder="Minimum 8 characters" />
                                            <button className="sg-eye" onClick={() => setShow({ ...show, next: !show.next })}>
                                                {show.next ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <PwStrength pw={pw.next} />
                                        {errors.next && <span className="sg-err">{errors.next}</span>}
                                    </div>

                                    {/* Confirm */}
                                    <div className={`sg-field ${errors.confirm ? "has-error" : ""}`}>
                                        <label>Confirm New Password</label>
                                        <div className="sg-input-wrap">
                                            <input type={show.confirm ? "text" : "password"}
                                                className="sg-input"
                                                value={pw.confirm}
                                                onChange={e => { setPw({ ...pw, confirm: e.target.value }); setErrors({ ...errors, confirm: null }); }}
                                                placeholder="Re-enter new password" />
                                            <button className="sg-eye" onClick={() => setShow({ ...show, confirm: !show.confirm })}>
                                                {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {errors.confirm && <span className="sg-err">{errors.confirm}</span>}
                                    </div>

                                    <div className="sg-form-footer">
                                        <button className="sg-btn sg-btn-primary" onClick={handlePasswordSave} disabled={saving}>
                                            {saving ? "Updating…" : "Update Password"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
