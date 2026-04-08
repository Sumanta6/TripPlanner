import { useState, useEffect, useMemo } from 'react';
import {
    FaSearch, FaFilter, FaEnvelope, FaComments, FaPaperPlane, FaTimes,
    FaStickyNote, FaMapMarkerAlt, FaCalendarAlt,
    FaChevronDown, FaChevronUp
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
    getMyBookings,
    updateBookingStatus,
    initCsrf,
    getBookingChat,
    sendBookingChatMessage,
} from '../services/guidesService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Travelers.css';

/* ── Status config ───────────────────────────────────────────────────────────── */
const STATUS_MAP = {
    pending:       { label: 'Pending',       badge: 'tv-badge-pending',   chip: 'tv-chip-pending',   emoji: '⏳' },
    accepted:      { label: 'Accepted',      badge: 'tv-badge-accepted',  chip: 'tv-chip-accepted',  emoji: '✅' },
    active:        { label: 'Active',        badge: 'tv-badge-active',    chip: 'tv-chip-active',    emoji: '🚀' },
    completed:     { label: 'Completed',     badge: 'tv-badge-completed', chip: 'tv-chip-completed', emoji: '🏆' },
    rejected:      { label: 'Rejected',      badge: 'tv-badge-rejected',  chip: 'tv-chip-rejected',  emoji: '❌' },
    auto_rejected: { label: 'Auto Rejected', badge: 'tv-badge-auto_rejected', chip: 'tv-chip-auto_rejected', emoji: '⚡' },
};

const STATUS_KEYS = ['pending', 'accepted', 'active', 'completed', 'rejected', 'auto_rejected'];
const COMMUNICATION_ENABLED_STATUSES = new Set(['accepted', 'active']);

/* ── Date formatter ──────────────────────────────────────────────────────────── */
function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(name) {
    if (!name) return 'U';
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'U';
}

function getBookingStateMessage(status) {
    switch (status) {
        case 'pending':
            return 'Waiting for guide confirmation';
        case 'rejected':
            return 'This request was not accepted';
        case 'auto_rejected':
            return 'This request expired';
        case 'completed':
            return 'Trip completed';
        default:
            return '';
    }
}

function isOwnChatMessage(message, currentUserId, thread) {
    const senderId = message?.sender_id;

    if (senderId != null && currentUserId != null) {
        const ownById = String(senderId) === String(currentUserId);
        if (process.env.NODE_ENV !== 'production') {
            console.debug('Guide chat ownership', {
                viewerRole: 'guide',
                currentUserId,
                messageId: message?.id,
                senderId,
                senderName: message?.sender_name,
                senderRole: message?.sender_role,
                isMine: ownById,
            });
        }
        return ownById;
    }

    if (message?.sender_role) {
        const ownByRole = String(message.sender_role) === 'guide';
        if (process.env.NODE_ENV !== 'production') {
            console.debug('Guide chat ownership role fallback', {
                viewerRole: 'guide',
                currentUserId,
                messageId: message?.id,
                senderId,
                senderName: message?.sender_name,
                senderRole: message?.sender_role,
                isMine: ownByRole,
            });
        }
        return ownByRole;
    }

    if (process.env.NODE_ENV !== 'production') {
        console.warn('Guide chat sender ownership could not be resolved.', {
            currentUserId,
            viewerRole: 'guide',
            messageId: message?.id,
            senderId,
            senderName: message?.sender_name,
            senderRole: message?.sender_role,
            senderEmail: message?.sender_email,
        });
    }

    return false;
}

/* ── Skeleton Card ───────────────────────────────────────────────────────────── */
function SkeletonCard() {
    return (
        <div className="tv-card skeleton">
            <div className="tv-card-head">
                <div className="tv-avatar" />
                <div className="skeleton-info" style={{ flex: 1 }}>
                    <div className="skeleton-line short" />
                    <div className="skeleton-line" style={{ width: '35%' }} />
                </div>
            </div>
            <div className="tv-card-body">
                {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className="skeleton-icon" style={{ width: 30, height: 30, borderRadius: 8 }} />
                        <div className="skeleton-line long" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function Travelers() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [expandedNote, setExpandedNote] = useState(null);
    const [processing, setProcessing] = useState({});
    const [chatOpen, setChatOpen] = useState(false);
    const [chatBooking, setChatBooking] = useState(null);
    const [chatThread, setChatThread] = useState(null);
    const [chatDraft, setChatDraft] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatSending, setChatSending] = useState(false);
    const [chatError, setChatError] = useState('');
    const { refreshProfile, profile } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (process.env.NODE_ENV !== 'production' && chatOpen) {
            console.debug('Guide chat current user', profile, 'resolvedId', profile?.user_id ?? chatThread?.current_user_id ?? null);
        }
    }, [chatOpen, profile, chatThread]);

    /* ── Fetch bookings ──────────────────────────────────────────────────────── */
    useEffect(() => {
        let alive = true;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const data = await getMyBookings();
                if (alive) setBookings(Array.isArray(data) ? data : data.results || []);
            } catch (err) {
                if (alive) setError(err.message);
            } finally {
                if (alive) setLoading(false);
            }
        }
        load();
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        if (!chatOpen || !chatBooking?.id) return undefined;

        let active = true;

        async function refreshChat(silent = true) {
            if (!silent) setChatLoading(true);
            try {
                const data = await getBookingChat(chatBooking.id);
                if (!active) return;
                setChatThread(data);
                setChatError('');
            } catch (err) {
                if (!active) return;
                setChatError(err.message || 'Unable to load chat.');
            } finally {
                if (active && !silent) setChatLoading(false);
            }
        }

        refreshChat(false);
        const timer = window.setInterval(() => refreshChat(true), 6000);

        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [chatOpen, chatBooking]);

    /* ── Status change handler ───────────────────────────────────────────────── */
    const handleStatusChange = async (id, newStatus) => {
        if (processing[id]) return;
        setProcessing(prev => ({ ...prev, [id]: true }));
        try {
            await initCsrf();
            const updated = await updateBookingStatus(id, newStatus);
            setBookings(prev => prev.map(b => b.id === id ? updated : b));
            await refreshProfile();

            if (newStatus === 'accepted') {
                toast.success('Booking accepted!');
                navigate('/itineraries', { state: { autoOpenBookingId: id } });
            } else if (newStatus === 'rejected') {
                toast.success('Booking rejected.');
            }
        } catch (err) {
            toast.error(err.message || 'Failed to update status');
        } finally {
            setProcessing(prev => ({ ...prev, [id]: false }));
        }
    };

    /* ── Status counts ───────────────────────────────────────────────────────── */
    const statusCounts = useMemo(() => {
        const counts = {};
        STATUS_KEYS.forEach(s => { counts[s] = 0; });
        bookings.forEach(b => { if (counts[b.status] !== undefined) counts[b.status]++; });
        return counts;
    }, [bookings]);

    /* ── Filter ──────────────────────────────────────────────────────────────── */
    const filtered = useMemo(() => {
        return bookings.filter(t => {
            const q = search.toLowerCase();
            const matchSearch = !q ||
                t.traveler_name.toLowerCase().includes(q) ||
                t.destination.toLowerCase().includes(q);
            const matchStatus = filterStatus === 'all' || t.status === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [bookings, search, filterStatus]);

    const openChat = async (booking) => {
        if (!booking?.can_chat) {
            toast.error(booking?.chat_locked_message || 'Chat available after acceptance.');
            return;
        }
        setChatBooking(booking);
        setChatThread(null);
        setChatDraft('');
        setChatError('');
        setChatOpen(true);
    };

    const closeChat = () => {
        setChatOpen(false);
        setChatBooking(null);
        setChatThread(null);
        setChatDraft('');
        setChatError('');
    };

    const handleSendChat = async (event) => {
        event.preventDefault();
        if (!chatBooking?.id || !chatDraft.trim() || chatSending) return;

        setChatSending(true);
        setChatError('');
        try {
            await initCsrf();
            const created = await sendBookingChatMessage(chatBooking.id, chatDraft.trim());
            setChatThread((current) => current ? {
                ...current,
                messages: [...current.messages, created],
            } : current);
            setChatDraft('');
        } catch (err) {
            setChatError(err.message || 'Unable to send message.');
        } finally {
            setChatSending(false);
        }
    };

    /* ════════════════════════════════════════════════════════════════════════── */
    return (
        <div className="tv-page">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header className="tv-header">
                <div className="tv-header-left">
                    <h1>👥 Travelers Directory</h1>
                    <p>Manage all travelers assigned to you</p>
                </div>
                <div className="tv-count-badge">{bookings.length} Total Travelers</div>
            </header>

            {/* ── Filters ────────────────────────────────────────────────────── */}
            <div className="tv-filters">
                <div className="tv-search">
                    <FaSearch className="tv-search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name or destination..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="tv-filter-select">
                    <FaFilter className="tv-filter-icon" />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                        <option value="auto_rejected">Auto Rejected</option>
                    </select>
                </div>
            </div>

            {/* ── Status Chips ────────────────────────────────────────────────── */}
            <div className="tv-status-chips">
                {STATUS_KEYS.map(s => {
                    const cfg = STATUS_MAP[s];
                    const isActive = filterStatus === s;
                    return (
                        <div
                            key={s}
                            className={`tv-chip ${cfg.chip} ${isActive ? 'active' : ''}`}
                            onClick={() => setFilterStatus(isActive ? 'all' : s)}
                            title={`Filter by ${cfg.label}`}
                        >
                            <span className="tv-chip-count">{statusCounts[s]}</span>
                            <span>{cfg.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* ── Error ──────────────────────────────────────────────────────── */}
            {error && <div className="tv-error">⚠️ {error}</div>}

            {/* ── Cards ──────────────────────────────────────────────────────── */}
            {loading ? (
                <div className="tv-grid">
                    {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="tv-empty">
                    <div className="tv-empty-icon">
                        {bookings.length === 0 ? '👤' : '🔍'}
                    </div>
                    <p className="tv-empty-title">
                        {bookings.length === 0 ? 'No travelers assigned yet' : 'No travelers match your search'}
                    </p>
                    <p className="tv-empty-sub">
                        {bookings.length === 0
                            ? 'Once travelers request you as their guide, they will appear here. Stay available and keep your profile updated!'
                            : 'Try adjusting your search terms or clearing the status filter to see more results.'}
                    </p>
                </div>
            ) : (
                <div className="tv-grid">
                    {filtered.map(t => {
                        const cfg = STATUS_MAP[t.status] || STATUS_MAP.pending;
                        const initials = (t.traveler_name || '?').charAt(0).toUpperCase();
                        const canCommunicate = Boolean(t.can_chat ?? COMMUNICATION_ENABLED_STATUSES.has(t.status));
                        const bookingStateMessage = getBookingStateMessage(t.status);

                        return (
                            <div className="tv-card" key={t.id}>
                                {/* Card Header */}
                                <div className="tv-card-head">
                                    <div className="tv-avatar">
                                        {t.avatar && t.avatar.length > 2 ? (
                                            <img src={t.avatar} alt={t.traveler_name} />
                                        ) : initials}
                                    </div>
                                    <div className="tv-name-block">
                                        <h3 className="tv-name">{t.traveler_name}</h3>
                                        <span className={`tv-badge ${cfg.badge}`}>{cfg.label}</span>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="tv-card-body">
                                    <div className="tv-info-row">
                                        <div className="tv-info-icon dest"><FaMapMarkerAlt /></div>
                                        <span className="tv-info-label">Destination</span>
                                        <span className="tv-info-value">{t.destination}</span>
                                    </div>
                                    <div className="tv-info-row">
                                        <div className="tv-info-icon date"><FaCalendarAlt /></div>
                                        <span className="tv-info-label">Dates</span>
                                        <span className="tv-info-value">{fmtDate(t.trip_start)} – {fmtDate(t.trip_end)}</span>
                                    </div>
                                    {canCommunicate && t.traveler_email && (
                                        <div className="tv-info-row">
                                            <div className="tv-info-icon email"><FaEnvelope /></div>
                                            <span className="tv-info-label">Email</span>
                                            <span className="tv-info-value">{t.traveler_email}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Notes Toggle */}
                                {t.notes && (
                                    <>
                                        <div
                                            className="tv-notes-toggle"
                                            onClick={() => setExpandedNote(expandedNote === t.id ? null : t.id)}
                                        >
                                            <FaStickyNote />
                                            <span>{expandedNote === t.id ? 'Hide Notes' : 'View Notes'}</span>
                                            {expandedNote === t.id ? <FaChevronUp style={{ marginLeft: 'auto', fontSize: 11 }} /> : <FaChevronDown style={{ marginLeft: 'auto', fontSize: 11 }} />}
                                        </div>
                                        {expandedNote === t.id && (
                                            <div className="tv-notes-body">
                                                <p>{t.notes}</p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Actions */}
                                <div className="tv-card-actions">
                                    {t.status === 'pending' ? (
                                        <>
                                            <button
                                                className="tv-action-btn tv-btn-accept"
                                                onClick={() => handleStatusChange(t.id, 'accepted')}
                                                disabled={processing[t.id]}
                                            >
                                                {processing[t.id] ? '...' : '✓ Accept'}
                                            </button>
                                            <button
                                                className="tv-action-btn tv-btn-reject"
                                                onClick={() => handleStatusChange(t.id, 'rejected')}
                                                disabled={processing[t.id]}
                                            >
                                                {processing[t.id] ? '...' : '✕ Reject'}
                                            </button>
                                        </>
                                    ) : canCommunicate ? (
                                        <>
                                            <button
                                                type="button"
                                                className="tv-action-btn tv-btn-chat"
                                                onClick={() => openChat(t)}
                                            >
                                                <FaComments /> Chat
                                            </button>
                                            {t.traveler_email && (
                                                <a href={`mailto:${t.traveler_email}`} className="tv-action-btn tv-btn-email">
                                                    <FaEnvelope /> Email
                                                </a>
                                            )}
                                        </>
                                    ) : bookingStateMessage ? (
                                        <div className="tv-booking-state-message" aria-live="polite">
                                            {bookingStateMessage}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {chatOpen && chatBooking && (
                <div className="tv-chat-modal-overlay" onClick={closeChat}>
                    <div className="tv-chat-modal" onClick={(event) => event.stopPropagation()}>
                        <button type="button" className="tv-chat-close" onClick={closeChat} aria-label="Close chat">
                            <FaTimes />
                        </button>

                        <div className="tv-chat-head">
                            <div className="tv-chat-person">
                                <div className="tv-chat-avatar">
                                    {getInitials(chatThread?.counterpart_name || chatBooking.traveler_name)}
                                </div>
                                <div>
                                    <span className="tv-chat-kicker">Booking Chat</span>
                                    <h3>{chatThread?.counterpart_name || chatBooking.traveler_name}</h3>
                                    <p>{chatBooking.destination} · {fmtDate(chatBooking.trip_start)} – {fmtDate(chatBooking.trip_end)}</p>
                                </div>
                            </div>
                            {chatThread?.counterpart_email ? (
                                <a className="tv-chat-email" href={`mailto:${chatThread.counterpart_email}`}>
                                    <FaEnvelope /> Email
                                </a>
                            ) : null}
                        </div>

                        <div className="tv-chat-body">
                            {chatLoading ? (
                                <div className="tv-chat-state">Loading conversation…</div>
                            ) : chatError ? (
                                <div className="tv-chat-state tv-chat-state-error">{chatError}</div>
                            ) : chatThread?.messages?.length ? (
                                <div className="tv-chat-messages">
                                    {chatThread.messages.map((message) => {
                                        const currentUserId = profile?.user_id ?? chatThread?.current_user_id ?? null;
                                        const ownMessage = isOwnChatMessage(message, currentUserId, chatThread);
                                        return (
                                        <div key={message.id} className={`tv-chat-row ${ownMessage ? 'own' : 'peer'}`}>
                                            <div className={`tv-chat-message ${ownMessage ? 'own' : ''}`}>
                                                <div className="tv-chat-message-meta">
                                                    <strong>{ownMessage ? 'You' : message.sender_name}</strong>
                                                </div>
                                                <p>{message.content ?? message.message}</p>
                                            </div>
                                            <span className={`tv-chat-time ${ownMessage ? 'own' : ''}`}>
                                                {new Date(message.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    );})}
                                </div>
                            ) : (
                                <div className="tv-chat-state">Start the conversation for this accepted booking.</div>
                            )}
                        </div>

                        <form className="tv-chat-form" onSubmit={handleSendChat}>
                            <textarea
                                rows="3"
                                value={chatDraft}
                                onChange={(event) => setChatDraft(event.target.value)}
                                placeholder="Write a message to the traveler…"
                            />
                            <button type="submit" className="tv-chat-send" disabled={chatSending || !chatDraft.trim()}>
                                <FaPaperPlane /> {chatSending ? 'Sending…' : 'Send'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
