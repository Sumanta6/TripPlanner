import { useEffect, useRef } from "react";
import { BadgeCheck, MessageCircle, SendHorizontal, X } from "lucide-react";
import { isCurrentUsersMessage } from "../utils/chatIdentity";
import "./BookingChatModal.css";

const CLOSED_CHAT_STATUSES = new Set(["completed", "cancelled", "expired"]);

function isClosedBookingStatus(status) {
  return CLOSED_CHAT_STATUSES.has(status);
}

function formatChatTimestamp(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusLabel(status) {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return status || "Booking";
  }
}

function getInitials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

function Avatar({ name, image, className }) {
  if (image) {
    return <img src={image} alt={name} className={className} />;
  }
  return <div className={className}>{getInitials(name)}</div>;
}

function isOwnMessage(message, currentUserId, viewerRole) {
  return isCurrentUsersMessage(message, currentUserId);
}

function ChatMessageBubble({ message, currentUserId, viewerRole, showSender, startsGroup, endsGroup }) {
  const ownMessage = isOwnMessage(message, currentUserId, viewerRole);
  const senderName = message.sender_name || (message.sender_role === "guide" ? "Guide" : "Traveler");

  return (
    <div
      className={[
        "chat-message-row",
        ownMessage ? "is-own" : "is-peer",
        startsGroup ? "starts-group" : "continues-group",
        endsGroup ? "ends-group" : "",
      ].join(" ").trim()}
    >
      {!ownMessage ? (
        <div className={`chat-message-avatar-slot ${showSender ? "is-visible" : ""}`}>
          {showSender ? (
            <Avatar
              name={senderName}
              image={message.sender_avatar}
              className="chat-message-avatar"
            />
          ) : null}
        </div>
      ) : null}
      <div className={`chat-message-stack ${ownMessage ? "is-own" : "is-peer"}`}>
        {showSender && !ownMessage ? <div className="chat-message-group-label">{senderName}</div> : null}
        <div className={`chat-message-bubble ${ownMessage ? "is-own" : "is-peer"}`}>
          <p>{message.content ?? message.message}</p>
        </div>
        <div className={`chat-message-time ${ownMessage ? "is-own" : "is-peer"}`}>
          {formatChatTimestamp(message.created_at)}
        </div>
      </div>
    </div>
  );
}

export default function BookingChatModal({
  isOpen,
  onClose,
  booking,
  thread,
  viewerRole = "traveler",
  currentUser = null,
  loading,
  error,
  draft,
  onDraftChange,
  onSend,
  sending,
}) {
  const endRef = useRef(null);
  const currentUserId = currentUser?.id ?? currentUser?.user_id ?? null;
  const bookingStatus = thread?.booking_status || booking?.status || "";
  const isChatClosed = isClosedBookingStatus(bookingStatus);
  const canSend = Boolean(thread?.can_send_chat) && !isChatClosed;
  const canView = Boolean(thread?.can_view_chat);

  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isOpen, thread?.messages?.length]);

  if (!isOpen || !booking) return null;

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend && draft.trim() && !sending) {
        onSend(event);
      }
    }
  };

  const headerName =
    viewerRole === "traveler"
      ? booking.guide_name || thread?.counterpart_name || "Your Guide"
      : thread?.counterpart_name || booking.traveler_name || "Booking Chat";
  const headerAvatar = thread?.counterpart_avatar || booking.avatar || "";
  const headerMeta =
    viewerRole === "traveler"
      ? `${booking.destination} · BOOK-${String(booking.id).padStart(4, "0")}`
      : `${booking.destination} · BOOK-${String(booking.id).padStart(4, "0")}`;

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="chat-modal-close" onClick={onClose} aria-label="Close chat">
          <X size={18} />
        </button>

        <div className="chat-modal-header">
          <div className="chat-modal-header-copy">
            <div className="chat-modal-person">
              <Avatar name={headerName} image={headerAvatar} className="chat-modal-avatar" />
              <div>
                <span className="chat-modal-kicker">
                  <MessageCircle size={14} />
                  Booking Chat
                </span>
                <h3>{headerName}</h3>
                <p>{headerMeta}</p>
              </div>
            </div>
          </div>

          <div className="chat-modal-statuses">
            <span className={`chat-status-badge status-${bookingStatus}`}>
              {getStatusLabel(bookingStatus)}
            </span>
            {isChatClosed ? (
              <span className="chat-status-muted">
                <BadgeCheck size={14} />
                Read-only
              </span>
            ) : null}
          </div>
        </div>

        {isChatClosed ? (
          <div className="chat-modal-closed-notice">
            This conversation is closed because the booking has ended.
          </div>
        ) : null}

        <div className="chat-modal-body">
          {loading ? (
            <div className="chat-modal-state">Loading conversation…</div>
          ) : error ? (
            <div className="chat-modal-state is-error">{error}</div>
          ) : !canView ? (
            <div className="chat-modal-state">Chat available after acceptance.</div>
          ) : thread?.messages?.length ? (
            <div className="chat-message-list">
              {thread.messages.map((message, index) => {
                const previous = thread.messages[index - 1];
                const next = thread.messages[index + 1];
                const previousOwn = previous ? isOwnMessage(previous, currentUserId, viewerRole) : null;
                const currentOwn = isOwnMessage(message, currentUserId, viewerRole);
                const nextOwn = next ? isOwnMessage(next, currentUserId, viewerRole) : null;
                const senderChangedFromPrevious =
                  !previous ||
                  previousOwn !== currentOwn ||
                  (!currentOwn && previous?.sender_name !== message?.sender_name);
                const senderChangesToNext =
                  !next ||
                  nextOwn !== currentOwn ||
                  (!currentOwn && next?.sender_name !== message?.sender_name);

                return (
                  <ChatMessageBubble
                    key={message.id}
                    message={message}
                    currentUserId={currentUserId}
                    viewerRole={viewerRole}
                    showSender={senderChangedFromPrevious}
                    startsGroup={senderChangedFromPrevious}
                    endsGroup={senderChangesToNext}
                  />
                );
              })}
              <div ref={endRef} />
            </div>
          ) : (
            <div className="chat-modal-state">
              {canSend ? "Start the conversation for this booking." : "No messages were exchanged during this trip."}
            </div>
          )}
        </div>

        {canSend ? (
          <form className="chat-modal-composer" onSubmit={onSend}>
            <textarea
              rows="1"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a message…"
            />
            <button type="submit" className="chat-send-btn" disabled={sending || !draft.trim()} aria-label="Send message">
              <SendHorizontal size={16} />
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
