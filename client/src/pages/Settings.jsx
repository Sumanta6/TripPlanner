import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  Laptop,
  LogOut,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  UserCog
} from "lucide-react";
import { changeMyPassword, getCookie } from "../services/api";
import AppPopupModal from "../components/AppPopupModal";
import "./Settings.css";

function PwStrength({ pw }) {
  const level = useMemo(() => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s += 1;
    if (pw.length >= 12) s += 1;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 1;
    if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s += 1;
    return Math.min(4, s);
  }, [pw]);

  const meta = [
    { label: "Too weak", color: "#94a3b8" },
    { label: "Weak", color: "#ef4444" },
    { label: "Fair", color: "#f59e0b" },
    { label: "Good", color: "#3b82f6" },
    { label: "Strong", color: "#10b981" }
  ];

  if (!pw) return null;

  return (
    <div className="pw-strength">
      <div className="pw-bars">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="pw-bar"
            style={{ background: i <= level ? meta[level].color : "rgba(148, 163, 184, 0.22)" }}
          />
        ))}
      </div>
      <span className="pw-label" style={{ color: meta[level].color }}>
        {meta[level].label}
      </span>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "appearance", label: "Appearance", icon: <Palette size={16} /> },
  { id: "security", label: "Password & Security", icon: <ShieldCheck size={16} /> },
  { id: "preferences", label: "Account Preferences", icon: <UserCog size={16} /> },
  { id: "account", label: "Account", icon: <LogOut size={16} /> }
];

const THEME_OPTIONS = [
  {
    id: "light",
    label: "Light",
    helper: "Bright and airy for daytime planning.",
    icon: <Sun size={18} />
  },
  {
    id: "dark",
    label: "Dark",
    helper: "Cinematic contrast for night sessions.",
    icon: <Moon size={18} />
  },
  {
    id: "system",
    label: "System",
    helper: "Follow your device preference automatically.",
    icon: <Laptop size={18} />
  }
];

function resolveTheme(nextTheme) {
  if (nextTheme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return nextTheme;
}

export default function Settings() {
  const [tab, setTab] = useState("appearance");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [toast, setToast] = useState(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errors, setErrors] = useState({});
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    const appliedTheme = resolveTheme(theme);
    document.documentElement.setAttribute("data-theme", appliedTheme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const clearFieldError = (field) => {
    setErrors((current) => ({ ...current, [field]: null, form: null }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!pw.current.trim()) nextErrors.current = "Current password is required.";
    if (!pw.next) nextErrors.next = "New password is required.";
    else if (pw.next.length < 8) nextErrors.next = "New password must be at least 8 characters.";
    if (!pw.confirm) nextErrors.confirm = "Please confirm your new password.";
    else if (pw.next !== pw.confirm) nextErrors.confirm = "Passwords do not match.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePasswordSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setErrors({});

    try {
      await changeMyPassword({
        current_password: pw.current,
        new_password: pw.next,
        confirm_password: pw.confirm
      });
      setPw({ current: "", next: "", confirm: "" });
      setErrors({});
      showToast("Password updated successfully");
    } catch (error) {
      const responseErrors = error?.response?.data?.errors;
      const responseMessage = error?.response?.data?.error || error?.response?.data?.message;

      if (responseErrors && typeof responseErrors === "object") {
        setErrors({
          current: responseErrors.current_password?.[0] || null,
          next: responseErrors.new_password?.[0] || null,
          confirm: responseErrors.confirm_password?.[0] || null,
          form: responseErrors.non_field_errors?.[0] || null
        });
      } else {
        setErrors({
          form: responseMessage || "Unable to update your password right now. Please try again."
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const csrfToken = getCookie("csrftoken");
      await fetch("http://localhost:8000/accounts/logout/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {})
        }
      });
    } catch {
      // Keep client-side logout consistent even if the request fails.
    }

    localStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("plantrip_step");
    localStorage.removeItem("plantrip_formData");
    localStorage.removeItem("plantrip_itinerary");
    window.location.href = "/";
  };

  return (
    <div className="sg-page">
      <div className="sg-shell">
        <AppPopupModal
          isOpen={logoutOpen}
          type="warning"
          title="Log out of TripPlanner?"
          message="You’ll need to sign in again to access your trips and planner."
          onClose={() => setLogoutOpen(false)}
          closeOnOverlay
          secondaryAction={{
            label: "Cancel",
            onClick: () => setLogoutOpen(false)
          }}
          primaryAction={{
            label: loggingOut ? "Logging Out..." : "Log Out",
            onClick: handleLogout
          }}
        />

        {toast && (
          <div className={`sg-toast ${toast.type}`}>
            {toast.type === "ok" ? <Check size={14} /> : <ShieldCheck size={14} />}
            {toast.msg}
          </div>
        )}

        <header className="sg-head">
          <div className="sg-head-copy">
            <span className="sg-kicker">Account Center</span>
            <h1>Settings</h1>
            <p>Personalize your TripPlanner experience, secure your account, and manage important account actions from one polished dashboard.</p>
          </div>
          <div className="sg-head-summary">
            <div className="sg-summary-card">
              <span>Theme</span>
              <strong>{theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}</strong>
            </div>
            <div className="sg-summary-card">
              <span>Security</span>
              <strong>Password ready</strong>
            </div>
          </div>
        </header>

        <div className="sg-layout">
          <aside className="sg-nav">
            <div className="sg-nav-card">
              <div className="sg-nav-label">Sections</div>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sg-nav-btn ${tab === item.id ? "active" : ""}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </aside>

          <main className="sg-panel">
            {tab === "appearance" && (
              <section className="sg-section fade-in">
                <div className="sg-section-head">
                  <div>
                    <h2>Appearance</h2>
                    <p className="sg-sub">Choose the look that feels best for planning, browsing, and reviewing your trips.</p>
                  </div>
                </div>

                <div className="sg-card sg-card-spacious">
                  <div className="sg-card-copy">
                    <h3>Theme Mode</h3>
                    <p>Pick a visual style that matches your device and planning rhythm.</p>
                  </div>

                  <div className="sg-theme-grid">
                    {THEME_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`sg-theme-card ${theme === option.id ? "active" : ""}`}
                        onClick={() => setTheme(option.id)}
                      >
                        <div className={`sg-preview sg-preview-${option.id}`}>
                          <div className="pvw-bar" />
                          <div className="pvw-body">
                            <div className="pvw-card pvw-card-lg" />
                            <div className="pvw-card-row">
                              <div className="pvw-card pvw-card-sm" />
                              <div className="pvw-card pvw-card-sm" />
                            </div>
                          </div>
                        </div>
                        <div className="sg-theme-footer">
                          <div className="sg-theme-title">
                            {option.icon}
                            <span>{option.label}</span>
                          </div>
                          {theme === option.id && <Check size={14} className="sg-chk" />}
                        </div>
                        <p className="sg-theme-helper">{option.helper}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {tab === "security" && (
              <section className="sg-section fade-in">
                <div className="sg-section-head">
                  <div>
                    <h2>Password &amp; Security</h2>
                    <p className="sg-sub">Keep your account safe with a strong password and a clearly structured update flow.</p>
                  </div>
                </div>

                <div className="sg-card sg-security-card">
                  <div className="sg-card-copy">
                    <h3>Change Password</h3>
                    <p>Update your sign-in password regularly to keep your trips, saved itineraries, and planner history protected.</p>
                  </div>

                  <div className="sg-form">
                    {errors.form && <div className="sg-form-alert">{errors.form}</div>}

                    <div className={`sg-field ${errors.current ? "has-error" : ""}`}>
                      <label>Current Password</label>
                      <div className="sg-input-wrap">
                        <input
                          type={show.current ? "text" : "password"}
                          className="sg-input"
                          value={pw.current}
                          onChange={(event) => {
                            setPw({ ...pw, current: event.target.value });
                            clearFieldError("current");
                          }}
                          placeholder="Enter current password"
                        />
                        <button type="button" className="sg-eye" onClick={() => setShow({ ...show, current: !show.current })}>
                          {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {errors.current && <span className="sg-err">{errors.current}</span>}
                    </div>

                    <div className={`sg-field ${errors.next ? "has-error" : ""}`}>
                      <label>New Password</label>
                      <div className="sg-input-wrap">
                        <input
                          type={show.next ? "text" : "password"}
                          className="sg-input"
                          value={pw.next}
                          onChange={(event) => {
                            setPw({ ...pw, next: event.target.value });
                            clearFieldError("next");
                          }}
                          placeholder="Minimum 8 characters"
                        />
                        <button type="button" className="sg-eye" onClick={() => setShow({ ...show, next: !show.next })}>
                          {show.next ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <PwStrength pw={pw.next} />
                      {errors.next && <span className="sg-err">{errors.next}</span>}
                    </div>

                    <div className={`sg-field ${errors.confirm ? "has-error" : ""}`}>
                      <label>Confirm New Password</label>
                      <div className="sg-input-wrap">
                        <input
                          type={show.confirm ? "text" : "password"}
                          className="sg-input"
                          value={pw.confirm}
                          onChange={(event) => {
                            setPw({ ...pw, confirm: event.target.value });
                            clearFieldError("confirm");
                          }}
                          placeholder="Re-enter new password"
                        />
                        <button type="button" className="sg-eye" onClick={() => setShow({ ...show, confirm: !show.confirm })}>
                          {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {errors.confirm && <span className="sg-err">{errors.confirm}</span>}
                    </div>

                    <div className="sg-form-footer">
                      <button className="sg-btn sg-btn-primary" onClick={handlePasswordSave} disabled={saving}>
                        {saving ? "Updating..." : "Change Password"}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {tab === "preferences" && (
              <section className="sg-section fade-in">
                <div className="sg-section-head">
                  <div>
                    <h2>Account Preferences</h2>
                    <p className="sg-sub">A lightweight control area for how TripPlanner supports your planning workflow.</p>
                  </div>
                </div>

                <div className="sg-card-grid">
                  <div className="sg-card">
                    <div className="sg-card-copy">
                      <h3>Planner Experience</h3>
                      <p>Your planner saves design preferences like theme instantly, so your next planning session feels familiar and consistent.</p>
                    </div>
                    <div className="sg-mini-note">Synced locally for a smoother travel planning workflow.</div>
                  </div>

                  <div className="sg-card">
                    <div className="sg-card-copy">
                      <h3>Session &amp; Privacy</h3>
                      <p>Use the account action area below whenever you need to exit securely on a shared device or reset your working session.</p>
                    </div>
                    <div className="sg-mini-note">Designed to keep your trips and profile details controlled.</div>
                  </div>
                </div>
              </section>
            )}

            {tab === "account" && (
              <section className="sg-section fade-in">
                <div className="sg-section-head">
                  <div>
                    <h2>Account</h2>
                    <p className="sg-sub">Important actions for your TripPlanner account should feel deliberate, polished, and easy to understand.</p>
                  </div>
                </div>

                <div className="sg-card sg-account-card">
                  <div className="sg-card-copy">
                    <h3>Log Out</h3>
                    <p>End your current session on this device. You can sign back in any time to access saved trips, planner history, and guide requests.</p>
                  </div>

                  <div className="sg-account-action">
                    <button type="button" className="sg-btn sg-btn-danger" onClick={() => setLogoutOpen(true)}>
                      <LogOut size={16} /> Log Out
                    </button>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
