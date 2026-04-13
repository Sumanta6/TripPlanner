import { useState, useEffect, useMemo } from 'react';
import {
    FaSearch, FaFilter, FaEnvelope, FaComments, FaTimes,
    FaStickyNote, FaMapMarkerAlt, FaCalendarAlt,
    FaChevronDown, FaChevronUp
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { createOptimisticChatMessage, normalizeChatMessage, normalizeChatThread } from '../utils/chatMessages';
import GuideBookingChatModal from '../components/GuideBookingChatModal';
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
const CLOSED_CHAT_STATUSES = new Set(['completed', 'cancelled', 'expired']);

function isClosedBookingStatus(status) {
    return CLOSED_CHAT_STATUSES.has(status);
}

function syncBookingStatus(currentBookings, bookingId, nextStatus) {
    if (!bookingId || !nextStatus) return currentBookings;
    return currentBookings.map((booking) =>
        booking.id === bookingId && booking.status !== nextStatus
            ? {
                ...booking,
                status: nextStatus,
                can_view_chat: true,
                can_send_chat: !isClosedBookingStatus(nextStatus),
                can_chat: !isClosedBookingStatus(nextStatus),
                chat_locked_message: isClosedBookingStatus(nextStatus)
                    ? 'This conversation is closed because the booking has ended.'
                    : booking.chat_locked_message,
            }
            : booking
    );
}

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
    const [activeChatBookingId, setActiveChatBookingId] = useState(null);
    const [chatThread, setChatThread] = useState(null);
    const [chatDraft, setChatDraft] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatSending, setChatSending] = useState(false);
    const [chatError, setChatError] = useState('');
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedTraveler, setSelectedTraveler] = useState(null);
    const { refreshProfile, profile } = useAuth();
    const navigate = useNavigate();
    const chatBooking = useMemo(
        () => bookings.find((booking) => String(booking.id) === String(activeChatBookingId)) || null,
        [bookings, activeChatBookingId]
    );
    const isSelectedChatClosed = isClosedBookingStatus(chatThread?.booking_status || chatBooking?.status);

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
        if (!chatOpen || !activeChatBookingId) return undefined;

        let active = true;
        const bookingId = activeChatBookingId;

        async function refreshChat(silent = true) {
            if (!silent) setChatLoading(true);
            try {
                const data = normalizeChatThread(await getBookingChat(bookingId));
                if (!active) return;
                setChatThread(data);
                if (data?.booking_status) {
                    setBookings((current) => syncBookingStatus(current, bookingId, data.booking_status));
                }
                setChatError('');
            } catch (err) {
                if (!active) return;
                setChatError(err.message || 'Unable to load chat.');
            } finally {
                if (active && !silent) setChatLoading(false);
            }
        }

        refreshChat(false);
        if (isSelectedChatClosed) {
            return () => {
                active = false;
            };
        }

        const timer = window.setInterval(() => refreshChat(true), 6000);

        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [chatOpen, activeChatBookingId, isSelectedChatClosed]);

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
        if (!booking?.can_view_chat) {
            toast.error(booking?.chat_locked_message || 'Chat available after acceptance.');
            return;
        }
        setActiveChatBookingId(booking.id);
        setChatThread(null);
        setChatDraft('');
        setChatError('');
        setChatLoading(true);
        setChatOpen(true);
    };

    const closeChat = () => {
        setChatOpen(false);
        setActiveChatBookingId(null);
        setChatThread(null);
        setChatDraft('');
        setChatError('');
        setChatLoading(false);
    };

    const openTravelerProfile = (booking) => {
        setSelectedTraveler(booking);
        setProfileOpen(true);
    };

    const closeTravelerProfile = () => {
        setProfileOpen(false);
        setSelectedTraveler(null);
    };

    const handleSendChat = async (event) => {
        event.preventDefault();
        if (!activeChatBookingId || !chatDraft.trim() || chatSending || isSelectedChatClosed) return;

        const content = chatDraft.trim();
        const optimisticMessage = createOptimisticChatMessage({
            bookingId: activeChatBookingId,
            currentUserId: profile?.user_id ?? null,
            senderName: profile?.full_name || 'You',
            senderRole: 'guide',
            senderAvatar: profile?.profile_image || '',
            receiverId: chatThread?.traveler_user_id ?? null,
            message: content,
        });

        setChatSending(true);
        setChatError('');
        setChatThread((current) => current ? {
            ...current,
            messages: [...current.messages, optimisticMessage],
        } : current);
        setChatDraft('');
        try {
            await initCsrf();
            const created = normalizeChatMessage(await sendBookingChatMessage(activeChatBookingId, content), optimisticMessage);
            setChatThread((current) => current ? {
                ...current,
                messages: current.messages.map((message) =>
                    message.id === optimisticMessage.id ? created : message
                ),
            } : current);
        } catch (err) {
            setChatThread((current) => current ? {
                ...current,
                messages: current.messages.filter((message) => message.id !== optimisticMessage.id),
            } : current);
            setChatDraft(content);
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
                        const canViewChat = Boolean(t.can_view_chat ?? (canCommunicate || isClosedBookingStatus(t.status)));
                        const bookingStateMessage = getBookingStateMessage(t.status);
                        const openProfileFromCard = () => openTravelerProfile(t);

                        return (
                            <div
                                className="tv-card tv-card-clickable"
                                key={t.id}
                                onClick={openProfileFromCard}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        openProfileFromCard();
                                    }
                                }}
                            >
                                {/* Card Header */}
                                <div
                                    className="tv-card-head tv-card-head-clickable"
                                >
                                    <div className="tv-avatar">
                                        {t.avatar && t.avatar.length > 2 ? (
                                            <img src={t.avatar} alt={t.traveler_name} />
                                        ) : initials}
                                    </div>
                                    <div className="tv-name-block">
                                        <h3 className="tv-name">{t.traveler_name}</h3>
                                        <span className={`tv-badge ${cfg.badge}`}>{cfg.label}</span>
                                    </div>
                                    <span className="tv-profile-link">View Profile</span>
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
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setExpandedNote(expandedNote === t.id ? null : t.id);
                                            }}
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
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleStatusChange(t.id, 'accepted');
                                                }}
                                                disabled={processing[t.id]}
                                            >
                                                {processing[t.id] ? '...' : '✓ Accept'}
                                            </button>
                                            <button
                                                className="tv-action-btn tv-btn-reject"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleStatusChange(t.id, 'rejected');
                                                }}
                                                disabled={processing[t.id]}
                                            >
                                                {processing[t.id] ? '...' : '✕ Reject'}
                                            </button>
                                        </>
                                    ) : canViewChat ? (
                                        <>
                                            <button
                                                type="button"
                                                className="tv-action-btn tv-btn-chat"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openChat(t);
                                                }}
                                            >
                                                <FaComments /> Chat
                                            </button>
                                            {canCommunicate && t.traveler_email && (
                                                <a
                                                    href={`mailto:${t.traveler_email}`}
                                                    className="tv-action-btn tv-btn-email"
                                                    onClick={(event) => event.stopPropagation()}
                                                >
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

            {profileOpen && selectedTraveler && (
                <div className="tv-profile-modal-overlay" onClick={closeTravelerProfile}>
                    <div className="tv-profile-modal" onClick={(event) => event.stopPropagation()}>
                        <button
                            type="button"
                            className="tv-profile-close"
                            onClick={closeTravelerProfile}
                            aria-label="Close traveler profile"
                        >
                            <FaTimes />
                        </button>

                        <div className="tv-profile-head">
                            <div className="tv-profile-identity">
                                <div className="tv-profile-avatar">
                                    {selectedTraveler.avatar && selectedTraveler.avatar.length > 2 ? (
                                        <img src={selectedTraveler.avatar} alt={selectedTraveler.traveler_name} />
                                    ) : (
                                        getInitials(selectedTraveler.traveler_name)
                                    )}
                                </div>
                                <div>
                                    <span className="tv-profile-kicker">Traveler Profile</span>
                                    <h3>{selectedTraveler.traveler_name}</h3>
                                    <p>{selectedTraveler.destination} · {fmtDate(selectedTraveler.trip_start)} – {fmtDate(selectedTraveler.trip_end)}</p>
                                </div>
                            </div>
                            <span className={`tv-badge ${STATUS_MAP[selectedTraveler.status]?.badge || STATUS_MAP.pending.badge}`}>
                                {STATUS_MAP[selectedTraveler.status]?.label || selectedTraveler.status}
                            </span>
                        </div>

                        <div className="tv-profile-grid">
                            <div className="tv-profile-card">
                                <span className="tv-profile-label">Travel style</span>
                                <strong>{selectedTraveler.traveler_travel_style || 'Not added yet'}</strong>
                            </div>
                            <div className="tv-profile-card">
                                <span className="tv-profile-label">Email</span>
                                <strong>{selectedTraveler.traveler_email || 'Available after acceptance'}</strong>
                            </div>
                            <div className="tv-profile-card">
                                <span className="tv-profile-label">Phone</span>
                                <strong>{selectedTraveler.traveler_phone || 'Available after acceptance'}</strong>
                            </div>
                            <div className="tv-profile-card">
                                <span className="tv-profile-label">Address</span>
                                <strong>{selectedTraveler.traveler_address || 'Not added yet'}</strong>
                            </div>
                        </div>

                        <div className="tv-profile-section">
                            <span className="tv-profile-section-label">About traveler</span>
                            <p>{selectedTraveler.traveler_bio || 'This traveler has not added a bio yet.'}</p>
                        </div>

                        <div className="tv-profile-section">
                            <span className="tv-profile-section-label">Preferred destinations</span>
                            {selectedTraveler.traveler_preferred_destinations?.length ? (
                                <div className="tv-profile-tags">
                                    {selectedTraveler.traveler_preferred_destinations.map((destination) => (
                                        <span key={destination} className="tv-profile-tag">{destination}</span>
                                    ))}
                                </div>
                            ) : (
                                <p>No destination preferences shared yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {chatOpen && chatBooking && (
                <GuideBookingChatModal
                    isOpen={chatOpen}
                    onClose={closeChat}
                    booking={chatBooking}
                    thread={chatThread}
                    currentUserId={profile?.user_id ?? null}
                    loading={chatLoading}
                    error={chatError}
                    draft={chatDraft}
                    onDraftChange={setChatDraft}
                    onSend={handleSendChat}
                    sending={chatSending}
                />
            )}
        </div>
    );
}
