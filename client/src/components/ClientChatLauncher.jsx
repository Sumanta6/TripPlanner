import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import BookingChatModal from "./BookingChatModal";
import {
  getAuthStatus,
  getBookingChat,
  getMyBookedTrips,
  initCsrf,
  sendBookingChatMessage,
} from "../services/api";
import { createOptimisticChatMessage, normalizeChatMessage, normalizeChatThread } from "../utils/chatMessages";
import "./ClientChatLauncher.css";

const CLOSED_CHAT_STATUSES = new Set(["completed", "cancelled", "expired"]);

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
            ? "This conversation is closed because the booking has ended."
            : booking.chat_locked_message,
        }
      : booking
  );
}

function pickPrimaryBooking(bookings) {
  const eligible = (Array.isArray(bookings) ? bookings : []).filter((booking) => booking?.can_view_chat);
  const active = eligible.find((booking) => booking.status === "active");
  if (active) return active;
  const accepted = eligible.find((booking) => booking.status === "accepted");
  if (accepted) return accepted;
  return eligible[0] || null;
}

export default function ClientChatLauncher({ isLoggedIn }) {
  const [bookings, setBookings] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [thread, setThread] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!isLoggedIn) {
        setBookings([]);
        setCurrentUser(null);
        return;
      }

      try {
        const [bookedTrips, auth] = await Promise.all([getMyBookedTrips(), getAuthStatus()]);
        if (!active) return;
        const normalized = Array.isArray(bookedTrips) ? bookedTrips : bookedTrips?.results || [];
        setBookings(normalized);
        setCurrentUser(auth?.user || null);
      } catch {
        if (!active) return;
        setBookings([]);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  const primaryBooking = useMemo(() => pickPrimaryBooking(bookings), [bookings]);
  const activeBooking = useMemo(
    () => bookings.find((booking) => String(booking.id) === String(activeBookingId)) || null,
    [bookings, activeBookingId]
  );
  const isPrimaryChatClosed = isClosedBookingStatus(primaryBooking?.status);
  const isSelectedChatClosed = isClosedBookingStatus(thread?.booking_status || activeBooking?.status);

  useEffect(() => {
    if (!primaryBooking?.id || !currentUser?.id || isOpen || isPrimaryChatClosed) {
      if (isOpen) setHasUnread(false);
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
          String(latestMessage.sender_id) !== String(currentUser.id)
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
  }, [primaryBooking, currentUser, isOpen, isPrimaryChatClosed]);

  useEffect(() => {
    if (!isOpen || !activeBookingId) return undefined;

    let active = true;
    const bookingId = activeBookingId;

    async function refreshThread(silent = true) {
      if (!silent) setLoading(true);
      try {
        const data = normalizeChatThread(await getBookingChat(bookingId));
        if (!active) return;
        setThread(data);
        if (data?.booking_status) {
          setBookings((current) => syncBookingStatus(current, bookingId, data.booking_status));
        }
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.error || err.message || "Unable to load messages.");
      } finally {
        if (active && !silent) setLoading(false);
      }
    }

    refreshThread(false);
    if (isSelectedChatClosed) {
      return () => {
        active = false;
      };
    }

    const timer = window.setInterval(() => refreshThread(true), 6000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isOpen, activeBookingId, isSelectedChatClosed]);

  if (!isLoggedIn || !primaryBooking) return null;

  const openChat = () => {
    setActiveBookingId(primaryBooking.id);
    setThread(null);
    setDraft("");
    setError("");
    setLoading(true);
    setHasUnread(false);
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
    setActiveBookingId(null);
    setThread(null);
    setDraft("");
    setError("");
    setLoading(false);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!activeBookingId || !draft.trim() || sending || isSelectedChatClosed) return;

    const content = draft.trim();
    const optimisticMessage = createOptimisticChatMessage({
      bookingId: activeBookingId,
      currentUserId: currentUser?.id ?? null,
      senderName: "You",
      senderRole: "traveler",
      receiverId: thread?.guide_user_id ?? null,
      message: content,
    });

    setSending(true);
    setError("");
    setThread((current) =>
      current
        ? {
            ...current,
            messages: [...current.messages, optimisticMessage],
          }
        : current
    );
    setDraft("");
    try {
      await initCsrf();
      const created = normalizeChatMessage(await sendBookingChatMessage(activeBookingId, content), optimisticMessage);
      setThread((current) =>
        current
          ? {
              ...current,
              messages: current.messages.map((message) =>
                message.id === optimisticMessage.id ? created : message
              ),
            }
          : current
      );
    } catch (err) {
      setThread((current) =>
        current
          ? {
              ...current,
              messages: current.messages.filter((message) => message.id !== optimisticMessage.id),
            }
          : current
      );
      setDraft(content);
      setError(err?.response?.data?.error || err.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="client-chat-launcher"
        onClick={openChat}
        aria-label="Open messages"
      >
        {hasUnread ? <span className="client-chat-launcher-badge" aria-hidden="true" /> : null}
        <MessageCircle size={18} />
        <span>Messages</span>
      </button>

      <BookingChatModal
        key={activeBookingId ?? "booking-chat"}
        isOpen={isOpen}
        onClose={closeChat}
        booking={activeBooking}
        thread={thread}
        viewerRole="traveler"
        currentUser={currentUser}
        loading={loading}
        error={error}
        draft={draft}
        onDraftChange={setDraft}
        onSend={handleSend}
        sending={sending}
      />
    </>
  );
}
