import React, { useEffect, useRef } from "react";
import "./AppPopupModal.css";

const ICONS = {
  success: "✓",
  warning: "!",
  error: "×",
  info: "i"
};

function AppPopupModal({
  isOpen,
  type = "info",
  title,
  message,
  primaryAction,
  secondaryAction,
  onClose,
  closeOnOverlay = true,
  icon,
  initialFocus = "primary"
}) {
  const primaryButtonRef = useRef(null);
  const secondaryButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const target =
      initialFocus === "secondary" ? secondaryButtonRef.current : primaryButtonRef.current;
    target?.focus();
  }, [initialFocus, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="app-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Notification"}
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div className={`app-popup-card app-popup-${type}`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="app-popup-close" onClick={onClose} aria-label="Close popup">
          ×
        </button>
        <div className="app-popup-icon" aria-hidden="true">{icon || ICONS[type] || ICONS.info}</div>
        <div className="app-popup-content">
          <h3>{title}</h3>
          <p>{message}</p>
        </div>
        <div className="app-popup-actions">
          {secondaryAction && (
            <button
              type="button"
              className="app-popup-btn app-popup-btn-secondary"
              onClick={secondaryAction.onClick}
              ref={secondaryButtonRef}
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              type="button"
              className={`app-popup-btn app-popup-btn-primary app-popup-btn-${type}`}
              onClick={primaryAction.onClick}
              ref={primaryButtonRef}
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AppPopupModal;
