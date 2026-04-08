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
import "./ClientChatLauncher.css";

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
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [thread, setThread] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (!isOpen || !selectedBooking?.id) return undefined;

    let active = true;

    async function refreshThread(silent = true) {
      if (!silent) setLoading(true);
      try {
        const data = await getBookingChat(selectedBooking.id);
        if (!active) return;
        setThread(data);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.error || err.message || "Unable to load messages.");
      } finally {
        if (active && !silent) setLoading(false);
      }
    }

    refreshThread(false);
    const timer = window.setInterval(() => refreshThread(true), 6000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isOpen, selectedBooking]);

  if (!isLoggedIn || !primaryBooking) return null;

  const openChat = () => {
    setSelectedBooking(primaryBooking);
    setThread(null);
    setDraft("");
    setError("");
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
    setThread(null);
    setDraft("");
    setError("");
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!selectedBooking?.id || !draft.trim() || sending) return;

    setSending(true);
    setError("");
    try {
      await initCsrf();
      const created = await sendBookingChatMessage(selectedBooking.id, draft.trim());
      setThread((current) =>
        current
          ? {
              ...current,
              messages: [...current.messages, created],
            }
          : current
      );
      setDraft("");
    } catch (err) {
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
        <MessageCircle size={18} />
        <span>Messages</span>
      </button>

      <BookingChatModal
        isOpen={isOpen}
        onClose={closeChat}
        booking={selectedBooking}
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
