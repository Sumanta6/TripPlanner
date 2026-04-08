import { useEffect, useRef } from "react";
import { BadgeCheck, MessageCircle, SendHorizontal, X } from "lucide-react";
import "./BookingChatModal.css";

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

function isOwnMessage(message, currentUserId, viewerRole, thread) {
  const senderId = message?.sender_id;

  if (senderId != null && currentUserId != null) {
    const ownById = String(senderId) === String(currentUserId);
    if (process.env.NODE_ENV !== "production") {
      console.debug("Traveler chat ownership", {
        viewerRole,
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

  if (message?.sender_role && viewerRole) {
    const ownByRole = String(message.sender_role) === String(viewerRole);
    if (process.env.NODE_ENV !== "production") {
      console.debug("Traveler chat ownership role fallback", {
        viewerRole,
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

  if (process.env.NODE_ENV !== "production") {
    console.warn("Chat sender ownership could not be resolved.", {
      currentUserId,
      viewerRole,
      messageId: message?.id,
      senderId,
      senderName: message?.sender_name,
      senderRole: message?.sender_role,
      senderEmail: message?.sender_email,
    });
  }

  return false;
}

function ChatMessageBubble({ message, currentUserId, thread, viewerRole, showSender, startsGroup, endsGroup }) {
  const ownMessage = isOwnMessage(message, currentUserId, viewerRole, thread);

  return (
    <div
      className={[
        "chat-message-row",
        ownMessage ? "is-own" : "is-peer",
        startsGroup ? "starts-group" : "continues-group",
        endsGroup ? "ends-group" : "",
      ].join(" ").trim()}
    >
      {showSender ? <div className="chat-message-group-label">{ownMessage ? "You" : message.sender_name}</div> : null}
      <div className={`chat-message-bubble ${ownMessage ? "is-own" : "is-peer"}`}>
        <p>{message.content ?? message.message}</p>
      </div>
      <div className={`chat-message-time ${ownMessage ? "is-own" : "is-peer"}`}>
        {formatChatTimestamp(message.created_at)}
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
  const canSend = Boolean(thread?.can_send_chat);
  const canView = Boolean(thread?.can_view_chat);
  const currentUserId = currentUser?.id ?? currentUser?.user_id ?? thread?.current_user_id ?? null;

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && isOpen) {
      console.debug("Traveler chat current user", currentUser, "resolvedId", currentUserId);
    }
  }, [isOpen, currentUser, currentUserId]);

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
              <div className="chat-modal-avatar">{getInitials(headerName)}</div>
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
            <span className={`chat-status-badge status-${booking.status}`}>
              {getStatusLabel(booking.status)}
            </span>
            {booking.status === "completed" ? (
              <span className="chat-status-muted">
                <BadgeCheck size={14} />
                Read-only
              </span>
            ) : null}
          </div>
        </div>

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
                const previousOwn = previous ? isOwnMessage(previous, currentUserId, viewerRole, thread) : null;
                const currentOwn = isOwnMessage(message, currentUserId, viewerRole, thread);
                const nextOwn = next ? isOwnMessage(next, currentUserId, viewerRole, thread) : null;
                const senderChangedFromPrevious = !previous || previousOwn !== currentOwn;
                const senderChangesToNext = !next || nextOwn !== currentOwn;

                return (
                  <ChatMessageBubble
                    key={message.id}
                    message={message}
                    currentUserId={currentUserId}
                    thread={thread}
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
            <button type="submit" className="chat-send-btn" disabled={sending || !draft.trim()}>
              <SendHorizontal size={16} />
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
        ) : (
          <div className="chat-modal-readonly">
            <BadgeCheck size={16} />
            This conversation is preserved for reference and can no longer accept new messages.
          </div>
        )}
      </div>
    </div>
  );
}
