import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

export function AdminSectionHeader({ eyebrow, title, subtitle, actions = null }) {
  return (
    <div className="tp-admin-section-head">
      <div>
        {eyebrow ? <p className="tp-admin-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {subtitle ? <p className="tp-admin-section-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="tp-admin-section-actions">{actions}</div> : null}
    </div>
  );
}

export function AdminToolbar({ search, onSearchChange, searchPlaceholder = "Search…", filters = null, actions = null }) {
  return (
    <div className="tp-admin-toolbar">
      <label className="tp-admin-search">
        <Search size={16} />
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} />
      </label>
      {filters}
      {actions ? <div className="tp-admin-toolbar-actions">{actions}</div> : null}
    </div>
  );
}

export function AdminCard({ children, className = "" }) {
  return <section className={`tp-admin-card ${className}`.trim()}>{children}</section>;
}

export function AdminEmptyState({ title, description }) {
  return (
    <div className="tp-admin-empty">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function AdminPagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;

  return (
    <div className="tp-admin-pagination">
      <button type="button" onClick={() => onPageChange(pagination.page - 1)} disabled={!pagination.has_previous}>
        <ChevronLeft size={16} />
        Previous
      </button>
      <span>
        Page {pagination.page} of {pagination.pages}
      </span>
      <button type="button" onClick={() => onPageChange(pagination.page + 1)} disabled={!pagination.has_next}>
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export function AdminStatusBadge({ children, tone = "default" }) {
  return <span className={`tp-admin-pill is-${tone}`}>{children}</span>;
}

export function AdminDrawer({ open, title, subtitle, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="tp-admin-overlay" onClick={onClose}>
      <aside className="tp-admin-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="tp-admin-drawer-head">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="tp-admin-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="tp-admin-drawer-body">{children}</div>
      </aside>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", tone = "danger", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="tp-admin-overlay" onClick={onCancel}>
      <div className="tp-admin-confirm" onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="tp-admin-confirm-actions">
          <button type="button" className="tp-admin-button tp-admin-button-muted" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={`tp-admin-button tp-admin-button-${tone}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function formatDate(value, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString([], includeTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

export function formatRole(row) {
  return [row.is_superuser || row.is_staff ? "Admin" : null, row.is_guide ? "Guide" : null, row.is_traveler ? "Traveler" : null]
    .filter(Boolean)
    .join(", ");
}
