import { useEffect, useMemo, useState } from 'react';
import { FaComments } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { createOptimisticChatMessage, normalizeChatMessage, normalizeChatThread } from '../utils/chatMessages';
import GuideBookingChatModal from './GuideBookingChatModal';
import {
    getMyBookings,
    initCsrf,
    getBookingChat,
    sendBookingChatMessage,
} from '../services/guidesService';
import './GuideChatLauncher.css';

const CLOSED_CHAT_STATUSES = new Set(['completed', 'cancelled', 'expired']);
const CHAT_LAUNCHER_BOOKED_STATUSES = new Set(['accepted', 'active']);

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

function pickPrimaryBooking(bookings) {
    const eligible = (Array.isArray(bookings) ? bookings : []).filter(
        (booking) => booking?.can_view_chat && CHAT_LAUNCHER_BOOKED_STATUSES.has(booking?.status)
    );
    const active = eligible.find((booking) => booking.status === 'active');
    if (active) return active;
    const accepted = eligible.find((booking) => booking.status === 'accepted');
    if (accepted) return accepted;
    return eligible[0] || null;
}

export default function GuideChatLauncher() {
    const { profile } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [chatOpen, setChatOpen] = useState(false);
    const [activeBookingId, setActiveBookingId] = useState(null);
    const [chatThread, setChatThread] = useState(null);
    const [chatDraft, setChatDraft] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatSending, setChatSending] = useState(false);
    const [chatError, setChatError] = useState('');
    const [hasUnread, setHasUnread] = useState(false);

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
    const chatBooking = useMemo(
        () => bookings.find((booking) => String(booking.id) === String(activeBookingId)) || null,
        [bookings, activeBookingId]
    );
    const isPrimaryChatClosed = isClosedBookingStatus(primaryBooking?.status);
    const isSelectedChatClosed = isClosedBookingStatus(chatThread?.booking_status || chatBooking?.status);

    useEffect(() => {
        const currentUserId = profile?.user_id ?? null;
        if (!primaryBooking?.id || !currentUserId || chatOpen || isPrimaryChatClosed) {
            if (chatOpen) setHasUnread(false);
            if (isPrimaryChatClosed) setHasUnread(false);
            return undefined;
        }

        let active = true;

        async function refreshUnread() {
            try {
                const data = normalizeChatThread(await getBookingChat(primaryBooking.id));
                if (!active) return;
                if (data?.booking_status && data.booking_status !== primaryBooking.status) {
                    setBookings((current) => syncBookingStatus(current, primaryBooking.id, data.booking_status));
                }
                if (isClosedBookingStatus(data?.booking_status)) {
                    setHasUnread(false);
                    return;
                }
                const latestMessage = data?.messages?.[data.messages.length - 1];
                const unread = Boolean(
                    latestMessage &&
                    String(latestMessage.sender_id) !== String(currentUserId)
                );
                setHasUnread(unread);
            } catch {
                if (!active) return;
            }
        }

        refreshUnread();
        const timer = window.setInterval(refreshUnread, 6000);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [primaryBooking, profile, chatOpen, isPrimaryChatClosed]);

    useEffect(() => {
        if (!chatOpen || !activeBookingId) return undefined;

        let active = true;
        const bookingId = activeBookingId;

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
    }, [chatOpen, activeBookingId, isSelectedChatClosed]);

    if (!primaryBooking) return null;

    const openChat = () => {
        setActiveBookingId(primaryBooking.id);
        setChatThread(null);
        setChatDraft('');
        setChatError('');
        setChatLoading(true);
        setHasUnread(false);
        setChatOpen(true);
    };

    const closeChat = () => {
        setChatOpen(false);
        setActiveBookingId(null);
        setChatThread(null);
        setChatDraft('');
        setChatError('');
        setChatLoading(false);
    };

    const handleSendChat = async (event) => {
        event.preventDefault();
        if (!activeBookingId || !chatDraft.trim() || chatSending || isSelectedChatClosed) return;

        const content = chatDraft.trim();
        const optimisticMessage = createOptimisticChatMessage({
            bookingId: activeBookingId,
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
            const created = normalizeChatMessage(await sendBookingChatMessage(activeBookingId, content), optimisticMessage);
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

    return (
        <>
            {!chatOpen ? (
                <button type="button" className="guide-chat-launcher" onClick={openChat} aria-label="Open messages">
                    {hasUnread ? <span className="guide-chat-launcher-badge" aria-hidden="true" /> : null}
                    <FaComments />
                    <span>Messages</span>
                </button>
            ) : null}

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
        </>
    );
}
