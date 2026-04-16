import { FaExclamationTriangle, FaMapMarkerAlt, FaCalendarAlt, FaTimes } from 'react-icons/fa';
import './BookingStatusActionModal.css';

function fmtDate(dateStr) {
    if (!dateStr) return 'Flexible';
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BookingStatusActionModal({
    isOpen,
    booking,
    title,
    eyebrow = 'Guide Action',
    description,
    warningTitle = 'Before you confirm',
    warningText,
    confirmLabel,
    cancelLabel = 'Keep Booking',
    reasons,
    reasonCode,
    reasonNote,
    loading = false,
    error = '',
    onReasonCodeChange,
    onReasonNoteChange,
    onClose,
    onConfirm,
}) {
    if (!isOpen || !booking) return null;

    const selectedReason = reasons.find((reason) => reason.value === reasonCode);
    const requiresNote = selectedReason?.requiresNote || reasonCode === 'other';
    const confirmDisabled = loading || !reasonCode || (requiresNote && !reasonNote.trim());

    return (
        <div className="g-status-modal-overlay" onClick={loading ? undefined : onClose}>
            <div className="g-status-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="g-status-modal-title">
                <button type="button" className="g-status-modal-close" onClick={onClose} disabled={loading} aria-label="Close">
                    <FaTimes />
                </button>

                <div className="g-status-modal-head">
                    <span className="g-status-modal-icon"><FaExclamationTriangle /></span>
                    <div>
                        <span className="g-status-modal-eyebrow">{eyebrow}</span>
                        <h3 id="g-status-modal-title">{title}</h3>
                        <p>{description}</p>
                    </div>
                </div>

                <div className="g-status-modal-summary">
                    <div className="g-status-modal-detail">
                        <FaMapMarkerAlt />
                        <div>
                            <span>Destination</span>
                            <strong>{booking.destination}</strong>
                        </div>
                    </div>
                    <div className="g-status-modal-detail">
                        <FaCalendarAlt />
                        <div>
                            <span>Dates</span>
                            <strong>{fmtDate(booking.trip_start)} – {fmtDate(booking.trip_end)}</strong>
                        </div>
                    </div>
                </div>

                <div className="g-status-modal-warning">
                    <strong>{warningTitle}</strong>
                    <p>{warningText}</p>
                </div>

                <div className="g-status-modal-form">
                    <label className="g-status-modal-field">
                        <span>Reason</span>
                        <select value={reasonCode} onChange={(event) => onReasonCodeChange?.(event.target.value)} disabled={loading}>
                            <option value="">Select a reason</option>
                            {reasons.map((reason) => (
                                <option key={reason.value} value={reason.value}>{reason.label}</option>
                            ))}
                        </select>
                    </label>

                    {requiresNote ? (
                        <label className="g-status-modal-field">
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

                {error ? <div className="tv-error g-status-modal-error">⚠️ {error}</div> : null}

                <div className="g-status-modal-actions">
                    <button type="button" className="g-status-btn g-status-btn-secondary" onClick={onClose} disabled={loading}>
                        {cancelLabel}
                    </button>
                    <button type="button" className="g-status-btn g-status-btn-danger" onClick={onConfirm} disabled={confirmDisabled}>
                        {loading ? 'Submitting...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
