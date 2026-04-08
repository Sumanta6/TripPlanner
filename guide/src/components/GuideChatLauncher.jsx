import { useEffect, useMemo, useState } from 'react';
import { FaComments, FaEnvelope, FaPaperPlane, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import {
    getMyBookings,
    initCsrf,
    getBookingChat,
    sendBookingChatMessage,
} from '../services/guidesService';
import '../pages/Travelers.css';
import './GuideChatLauncher.css';

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

function pickPrimaryBooking(bookings) {
    const eligible = (Array.isArray(bookings) ? bookings : []).filter((booking) => booking?.can_view_chat);
    const active = eligible.find((booking) => booking.status === 'active');
    if (active) return active;
    const accepted = eligible.find((booking) => booking.status === 'accepted');
    if (accepted) return accepted;
    return eligible[0] || null;
}

function isOwnChatMessage(message, currentUserId) {
    if (message?.sender_id != null && currentUserId != null) {
        return String(message.sender_id) === String(currentUserId);
    }
    return String(message?.sender_role) === 'guide';
}

export default function GuideChatLauncher() {
    const { profile } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatBooking, setChatBooking] = useState(null);
    const [chatThread, setChatThread] = useState(null);
    const [chatDraft, setChatDraft] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatSending, setChatSending] = useState(false);
    const [chatError, setChatError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadBookings() {
            try {
                const data = await getMyBookings();
                if (!active) return;
                setBookings(Array.isArray(data) ? data : data?.results || []);
            } catch {
                if (!active) return;
                setBookings([]);
            }
        }

        loadBookings();
        return () => {
            active = false;
        };
    }, []);

    const primaryBooking = useMemo(() => pickPrimaryBooking(bookings), [bookings]);

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

    if (!primaryBooking) return null;

    const openChat = () => {
        setChatBooking(primaryBooking);
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

    return (
        <>
            {!chatOpen ? (
                <button type="button" className="guide-chat-launcher" onClick={openChat} aria-label="Open messages">
                    <FaComments />
                    <span>Messages</span>
                </button>
            ) : null}

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
                                        const ownMessage = isOwnChatMessage(message, currentUserId);
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
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="tv-chat-state">Start the conversation for this booking.</div>
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
        </>
    );
}
