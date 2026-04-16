import React from "react";
import { AlertTriangle, CalendarDays, MapPin, X } from "lucide-react";
import "./BookingCancellationModal.css";

function formatDate(dateString) {
  if (!dateString) return "Flexible";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BookingCancellationModal({
  isOpen,
  booking,
  title = "Cancel Booking",
  eyebrow = "Traveler Action",
  description = "This will release your guide booking immediately. You can request the same guide again later if the dates are still available.",
  warningTitle = "Before you confirm",
  warningText = "Payment-pending, pending, and accepted bookings can be cancelled by the traveler. Completed, rejected, and already cancelled bookings cannot be reopened from this action.",
  confirmLabel = "Confirm Cancellation",
  loadingLabel = "Cancelling...",
  cancelLabel = "Keep Booking",
  reasons = [],
  reasonCode = "",
  reasonNote = "",
  loading = false,
  error = "",
  onReasonCodeChange,
  onReasonNoteChange,
  onClose,
  onConfirm,
}) {
  if (!isOpen || !booking) return null;

  const selectedReason = reasons.find((reason) => reason.value === reasonCode);
  const requiresNote = selectedReason?.requiresNote || reasonCode === "other";
  const confirmDisabled = loading || !reasonCode || (requiresNote && !reasonNote.trim());

  return (
    <div className="cancel-booking-overlay" onClick={loading ? undefined : onClose}>
      <div
        className="cancel-booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="cancel-booking-close"
          onClick={onClose}
          disabled={loading}
          aria-label="Close cancellation dialog"
        >
          <X size={18} />
        </button>

        <div className="cancel-booking-head">
          <span className="cancel-booking-icon">
            <AlertTriangle size={18} />
          </span>
          <div>
            <span className="cancel-booking-eyebrow">{eyebrow}</span>
            <h3 id="cancel-booking-title">{title}</h3>
            <p>{description}</p>
          </div>
        </div>

        <div className="cancel-booking-summary">
          <div className="cancel-booking-detail">
            <MapPin size={16} />
            <div>
              <span>Trip</span>
              <strong>{booking.destination}</strong>
            </div>
          </div>
          <div className="cancel-booking-detail">
            <CalendarDays size={16} />
            <div>
              <span>Dates</span>
              <strong>{formatDate(booking.trip_start)} to {formatDate(booking.trip_end)}</strong>
            </div>
          </div>
          <div className="cancel-booking-detail">
            <span className="cancel-booking-reference-label">Reference</span>
            <strong>BOOK-{String(booking.id).padStart(4, "0")}</strong>
          </div>
        </div>

        <div className="cancel-booking-warning">
          <strong>{warningTitle}</strong>
          <p>{warningText}</p>
        </div>

        <div className="cancel-booking-form">
          <label className="cancel-booking-field">
            <span>Reason</span>
            <select
              value={reasonCode}
              onChange={(event) => onReasonCodeChange?.(event.target.value)}
              disabled={loading}
            >
              <option value="">Select a reason</option>
              {reasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </label>

          {requiresNote ? (
            <label className="cancel-booking-field">
              <span>Additional details</span>
              <textarea
                rows="4"
                value={reasonNote}
                onChange={(event) => onReasonNoteChange?.(event.target.value)}
                disabled={loading}
                placeholder="Share the reason in your own words."
              />
            </label>
          ) : null}
        </div>

        {error ? <div className="alert-error cancel-booking-error">{error}</div> : null}

        <div className="cancel-booking-actions">
          <button type="button" className="cancel-booking-btn cancel-booking-btn-secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button type="button" className="cancel-booking-btn cancel-booking-btn-danger" onClick={onConfirm} disabled={confirmDisabled}>
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
