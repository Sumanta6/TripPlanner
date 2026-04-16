import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BookingChatModal from "../components/BookingChatModal";
import BookingCancellationModal from "../components/BookingCancellationModal";
import {
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  ArrowRight,
  Eye,
  Bell,
  MessageCircle,
  MessageSquareQuote,
  Star,
  X,
  BadgeCheck
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getMyBookedTrips,
  getBookingChat,
  getAuthStatus,
  cancelTravelerBooking,
  createGuideReview,
  initCsrf,
  sendBookingChatMessage
} from "../services/api";
import { createOptimisticChatMessage, normalizeChatMessage, normalizeChatThread } from "../utils/chatMessages";
import "./MyTrips.css";

const CLOSED_CHAT_STATUSES = new Set(["completed", "cancelled", "expired"]);
const STATUS_REASON_OPTIONS = [
  { value: "change_of_plans", label: "Change of plans" },
  { value: "found_another_option", label: "Found another option" },
  { value: "schedule_conflict", label: "Schedule conflict" },
  { value: "price_issue", label: "Price issue" },
  { value: "personal_reason", label: "Personal reason" },
  { value: "other", label: "Other", requiresNote: true },
];

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
            : booking.chat_locked_message
        }
      : booking
  );
}

const TAB_LABELS = ["Upcoming / Active", "Completed", "Declined"];

function formatDate(dateString) {
  if (!dateString) return "TBD";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getStatusDisplay(status) {
  switch (status) {
    case "pending":
      return { label: "Pending Response", icon: <Clock size={14} />, className: "pending" };
    case "accepted":
      return { label: "Guide Accepted", icon: <CheckCircle2 size={14} />, className: "active" };
    case "active":
      return { label: "Trip in Progress", icon: <CheckCircle2 size={14} />, className: "active" };
    case "rejected":
      return { label: "Declined", icon: <XCircle size={14} />, className: "declined" };
    case "auto_rejected":
      return { label: "System Declined", icon: <XCircle size={14} />, className: "declined" };
    case "completed":
      return { label: "Completed", icon: <CheckCircle2 size={14} />, className: "completed" };
    case "cancelled":
      return { label: "Cancelled", icon: <XCircle size={14} />, className: "declined" };
    default:
      return { label: status, icon: <AlertCircle size={14} />, className: "pending" };
  }
}

function getStatusActionLabel(booking) {
  if (!booking) return "View Guide";
  if (booking.status === "cancelled") return "Request Again";
  if (booking.status === "completed") return "Rebook";
  return "View Profile";
}

function getStatusReasonHeading(booking) {
  if (!booking?.status_reason_display) return "";
  if (booking.status === "cancelled") {
    if (booking.status_updated_by_role === "traveler") return "Cancellation Reason";
    if (booking.status_updated_by_role === "guide") return "Guide Cancellation Note";
    if (booking.status_updated_by_role === "admin") return "Admin Cancellation Note";
  }
  if (booking.status === "rejected" || booking.status === "auto_rejected") {
    return "Booking Update";
  }
  return "Status Note";
}

function ReviewStars({ value, onChange, interactive = false }) {
  return (
    <div className={`mt-review-stars ${interactive ? "interactive" : ""}`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const filled = starValue <= value;
        return (
          <button
            key={starValue}
            type="button"
            className={`mt-review-star ${filled ? "filled" : ""}`}
            onClick={interactive ? () => onChange(starValue) : undefined}
            disabled={!interactive}
            aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
          >
            <Star size={18} fill={filled ? "currentColor" : "none"} />
          </button>
        );
      })}
    </div>
  );
}

export default function MyTrips() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("Upcoming / Active");
  const [expandedNotes, setExpandedNotes] = useState({});
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [activeChatBookingId, setActiveChatBookingId] = useState(null);
  const [chatThread, setChatThread] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelReasonCode, setCancelReasonCode] = useState("");
  const [cancelReasonNote, setCancelReasonNote] = useState("");
  const navigate = useNavigate();
  const activeChatBooking = useMemo(
    () => bookings.find((booking) => String(booking.id) === String(activeChatBookingId)) || null,
    [bookings, activeChatBookingId]
  );
  const isSelectedChatClosed = isClosedBookingStatus(chatThread?.booking_status || activeChatBooking?.status);

  useEffect(() => {
    let alive = true;

    async function fetchBookings() {
      try {
        const [data, auth] = await Promise.all([getMyBookedTrips(), getAuthStatus()]);
        if (alive) {
          setBookings(Array.isArray(data) ? data : data.results || []);
          setCurrentUser(auth?.user || null);
        }
      } catch {
        if (alive) {
          setError("Failed to load your trips. Please try again later.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchBookings();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!chatModalOpen || !activeChatBookingId) return undefined;

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
        setChatError("");
      } catch (err) {
        if (!active) return;
        const message =
          err.response?.data?.error ||
          err.message ||
          "Unable to load chat right now.";
        setChatError(message);
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
  }, [chatModalOpen, activeChatBookingId, isSelectedChatClosed]);

  const recentUpdates = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((booking) => {
        if (booking.status !== "active" && booking.status !== "accepted" && booking.status !== "rejected") {
          return false;
        }
        const updated = new Date(booking.updated_at);
        const hoursDiff = (now - updated) / (1000 * 60 * 60);
        return hoursDiff < 72;
      })
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 3);
  }, [bookings]);

  const groupedTrips = useMemo(() => {
    const upcomingActive = bookings.filter((booking) =>
      ["pending", "accepted", "active"].includes(booking.status)
    );
    const completed = bookings.filter((booking) => booking.status === "completed");
    const declined = bookings.filter((booking) =>
      ["rejected", "auto_rejected", "cancelled"].includes(booking.status)
    );

    return {
      "Upcoming / Active": upcomingActive,
      Completed: completed,
      Declined: declined
    };
  }, [bookings]);

  const summary = useMemo(() => ({
    total: bookings.length,
    active: groupedTrips["Upcoming / Active"].length,
    completed: groupedTrips.Completed.length
  }), [bookings.length, groupedTrips]);

  const visibleTrips = groupedTrips[activeTab] || [];

  const toggleNote = (bookingId) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [bookingId]: !prev[bookingId]
    }));
  };

  const renderSkeletons = () => (
    <div className="mt-cards">
      {[1, 2, 3].map((item) => (
        <div key={item} className="mt-skeleton mt-animate-pulse">
          <div className="skeleton-line medium"></div>
          <div className="skeleton-line short"></div>
          <div className="skeleton-box"></div>
        </div>
      ))}
    </div>
  );

  const openGuidesForTrip = (booking) => {
    navigate("/guides", {
      state: {
        selectedGuideId: booking.guide,
        destination: booking.destination,
        trip_start: booking.trip_start,
        trip_end: booking.trip_end,
        itineraryId: booking.itinerary?.id || null
      }
    });
  };

  const openReviewModal = (booking) => {
    if (!booking?.can_review) return;
    setSelectedBooking(booking);
    setReviewRating(0);
    setReviewComment("");
    setReviewError("");
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedBooking(null);
    setReviewRating(0);
    setReviewComment("");
    setReviewError("");
  };

  const openChatModal = (booking) => {
    if (!booking?.can_view_chat) {
      toast.error(booking?.chat_locked_message || "Chat available after acceptance.");
      return;
    }
    setActiveChatBookingId(booking.id);
    setChatThread(null);
    setChatDraft("");
    setChatError("");
    setChatLoading(true);
    setChatModalOpen(true);
  };

  const closeChatModal = () => {
    setChatModalOpen(false);
    setActiveChatBookingId(null);
    setChatThread(null);
    setChatDraft("");
    setChatError("");
    setChatLoading(false);
  };

  const openCancelModal = (booking) => {
    if (!booking?.can_cancel) return;
    setCancelModalBooking(booking);
    setCancelError("");
    setCancelReasonCode("");
    setCancelReasonNote("");
  };

  const closeCancelModal = () => {
    if (cancelSubmitting) return;
    setCancelModalBooking(null);
    setCancelError("");
    setCancelReasonCode("");
    setCancelReasonNote("");
  };

  const handleCancelBooking = async () => {
    if (!cancelModalBooking?.id) return;

    setCancelSubmitting(true);
    setCancelError("");

    try {
      await initCsrf();
      const updatedBooking = await cancelTravelerBooking(cancelModalBooking.id, {
        reason_code: cancelReasonCode,
        reason_note: cancelReasonNote.trim(),
      });
      setBookings((current) =>
        current.map((booking) => (booking.id === updatedBooking.id ? updatedBooking : booking))
      );
      if (activeChatBookingId === updatedBooking.id) {
        setChatThread((current) =>
          current
            ? {
                ...current,
                booking_status: updatedBooking.status,
                can_send_chat: false,
                can_chat: false,
                can_view_chat: true,
                locked_message: updatedBooking.chat_locked_message || "This conversation is closed because the booking has ended.",
              }
            : current
        );
      }
      setCancelModalBooking(null);
      setCancelReasonCode("");
      setCancelReasonNote("");
      toast.success("Booking cancelled successfully.");
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Unable to cancel your booking right now.";
      setCancelError(message);
      toast.error(message);
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleChatSubmit = async (event) => {
    event.preventDefault();
    if (!activeChatBookingId || !chatDraft.trim() || chatSending || isSelectedChatClosed) return;

    const content = chatDraft.trim();
    const optimisticMessage = createOptimisticChatMessage({
      bookingId: activeChatBookingId,
      currentUserId: currentUser?.id ?? null,
      senderName: "You",
      senderRole: "traveler",
      receiverId: chatThread?.guide_user_id ?? null,
      message: content
    });

    setChatSending(true);
    setChatError("");
    setChatThread((current) =>
      current
        ? {
            ...current,
            messages: [...current.messages, optimisticMessage]
          }
        : current
    );
    setChatDraft("");
    try {
      await initCsrf();
      const message = normalizeChatMessage(await sendBookingChatMessage(activeChatBookingId, content), optimisticMessage);
      setChatThread((current) =>
        current
          ? {
              ...current,
              messages: current.messages.map((item) =>
                item.id === optimisticMessage.id ? message : item
              )
            }
          : current
      );
    } catch (err) {
      setChatThread((current) =>
        current
          ? {
              ...current,
              messages: current.messages.filter((item) => item.id !== optimisticMessage.id)
            }
          : current
      );
      setChatDraft(content);
      const message =
        err.response?.data?.error ||
        err.message ||
        "Unable to send your message.";
      setChatError(message);
      toast.error(message);
    } finally {
      setChatSending(false);
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!selectedBooking) return;

    if (selectedBooking.status !== "completed") {
      setReviewError("Reviews are only available for completed trips.");
      return;
    }

    if (!selectedBooking.can_review || selectedBooking.review) {
      setReviewError("This completed booking has already been reviewed and is now locked.");
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please choose a rating between 1 and 5 stars.");
      return;
    }

    setReviewSubmitting(true);
    setReviewError("");

    try {
      await initCsrf();

      const payload = {
        booking_id: selectedBooking.id,
        rating: reviewRating,
        comment: reviewComment.trim()
      };

      const savedReview = await createGuideReview(payload);

      setBookings((current) =>
        current.map((booking) =>
          booking.id === selectedBooking.id
            ? {
                ...booking,
                review: savedReview,
                can_review: false
              }
            : booking
        )
      );

      toast.success("Review submitted.");
      closeReviewModal();
    } catch (err) {
      const data = err.response?.data || {};
      const message =
        data.error ||
        data.booking_id?.[0] ||
        data.rating?.[0] ||
        data.detail ||
        "Unable to save your review right now.";
      setReviewError(message);
      toast.error(message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="my-trips-page">
      <div className="mt-shell">
        <header className="mt-header">
          <div className="mt-title">
            <span className="mt-eyebrow">Travel Dashboard</span>
            <h1>My Trips</h1>
            <p>Track upcoming journeys, revisit completed experiences, and manage guide bookings in one clean workspace.</p>
          </div>
          <Link to="/saved-trips" className="mt-btn-outline mt-header-action">
            View Saved Itineraries <ArrowRight size={16} />
          </Link>
        </header>

        <section className="mt-summary-strip">
          <div className="mt-summary-card">
            <span className="mt-summary-label">Total Trips</span>
            <strong>{summary.total}</strong>
          </div>
          <div className="mt-summary-card">
            <span className="mt-summary-label">Active Trips</span>
            <strong>{summary.active}</strong>
          </div>
          <div className="mt-summary-card">
            <span className="mt-summary-label">Completed Trips</span>
            <strong>{summary.completed}</strong>
          </div>
        </section>

        {loading ? renderSkeletons() : error ? (
          <div className="mt-empty-state">
            <div className="mt-empty-icon mt-empty-error">
              <AlertCircle size={40} />
            </div>
            <h2>Unable to load trips</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="mt-btn-outline">Try Again</button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="mt-empty-state">
            <div className="mt-empty-icon">
              <MapPin size={40} />
            </div>
            <h2>No trips yet</h2>
            <p>You haven’t booked a guide yet. Start with a saved itinerary or browse available local experts to plan your next journey.</p>
            <div className="mt-empty-actions">
              <Link to="/guides" className="mt-btn-primary">Browse Guides</Link>
              <Link to="/saved-trips" className="mt-btn-outline">View Saved Itineraries</Link>
            </div>
          </div>
        ) : (
          <>
            {recentUpdates.length > 0 && (
              <section className="mt-updates-panel">
                <div className="mt-updates-header">
                  <div className="mt-updates-title">
                    <Bell size={18} className="mt-bell-icon" />
                    <h3>Recent Updates</h3>
                  </div>
                  <span className="mt-updates-caption">Last 72 hours</span>
                </div>
                <div className="mt-updates-list">
                  {recentUpdates.map((update) => (
                    <div
                      key={`update-${update.id}`}
                      className={`mt-update-item ${update.status === "accepted" || update.status === "active" ? "active" : "declined"}`}
                    >
                      <p>
                        {update.status === "accepted" || update.status === "active"
                          ? <>Your guide request for <strong>{update.destination}</strong> was accepted by <strong>{update.guide_name || "your guide"}</strong>.</>
                          : <>Your request for <strong>{update.destination}</strong> was declined. You can rebook with another guide anytime.</>}
                      </p>
                      <span>{formatDate(update.updated_at)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-tabs-shell">
              <div className="mt-tabs">
                {TAB_LABELS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`mt-tab ${activeTab === tab ? "is-active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                    <span className="mt-tab-count">{groupedTrips[tab].length}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-section">
              <div className="mt-section-header">
                <div>
                  <h2>{activeTab}</h2>
                  <p>
                    {activeTab === "Upcoming / Active" && "Stay on top of accepted guides, pending requests, and trips that are currently underway."}
                    {activeTab === "Completed" && "Review past guided trips, leave verified feedback, and reopen the same travel direction when you are ready to plan again."}
                    {activeTab === "Declined" && "Requests that were declined or cancelled are kept here so you can review what happened and send a fresh request when you are ready."}
                  </p>
                </div>
              </div>

              {visibleTrips.length === 0 ? (
                <div className="mt-inline-empty">
                  <h3>No trips in this section</h3>
                  <p>This tab is clear right now. Browse guides or saved itineraries to start a new request.</p>
                </div>
              ) : (
                <div className="mt-cards">
                  {visibleTrips.map((booking) => {
                    const status = getStatusDisplay(booking.status);
                    const noteExpanded = Boolean(expandedNotes[booking.id]);
                    const hasLongNote = Boolean(booking.notes && booking.notes.length > 140);
                    const hasReview = Boolean(booking.review);
                    const canSubmitReview = Boolean(booking.can_review);
                    const canViewChat = Boolean(booking.can_view_chat);
                    const canCancelBooking = Boolean(booking.can_cancel);

                    return (
                      <article key={booking.id} className="mt-trip-card">
                        <div className="mt-trip-main">
                          <div className="mt-trip-overview">
                            <div className="mt-trip-title-row">
                              <div>
                                <div className="mt-destination-row">
                                  <MapPin size={16} />
                                  <h3>{booking.destination}</h3>
                                </div>
                                <p className="mt-trip-booked">Booked on {formatDate(booking.created_at)}</p>
                              </div>
                              <span className={`mt-status ${status.className}`}>
                                {status.icon}
                                {status.label}
                              </span>
                            </div>

                            <div className="mt-trip-detail-grid">
                              <div className="mt-detail-chip">
                                <Calendar size={16} />
                                <div>
                                  <span>Dates</span>
                                  <strong>{formatDate(booking.trip_start)} to {formatDate(booking.trip_end)}</strong>
                                </div>
                              </div>

                              <div className="mt-detail-chip">
                                <Clock size={16} />
                                <div>
                                  <span>Reference</span>
                                  <strong>BOOK-{booking.id.toString().padStart(4, "0")}</strong>
                                </div>
                              </div>
                            </div>

                            {booking.notes && (
                              <div className="mt-note-block">
                                <span className="mt-note-label">Trip Notes</span>
                                <p className={noteExpanded ? "is-expanded" : ""}>{booking.notes}</p>
                                {hasLongNote && (
                                  <button type="button" className="mt-note-toggle" onClick={() => toggleNote(booking.id)}>
                                    {noteExpanded ? "View less" : "View more"}
                                  </button>
                                )}
                              </div>
                            )}

                            {booking.status_reason_display && (
                              <div className="mt-status-note">
                                <span className="mt-note-label">{getStatusReasonHeading(booking)}</span>
                                <p className="is-expanded">{booking.status_reason_display}</p>
                              </div>
                            )}

                            {booking.status === "cancelled" && (
                              <div className="mt-history-hint">
                                Your previous booking was cancelled. You can send a new request if this guide is available for your dates.
                              </div>
                            )}
                          </div>

                            <div className="mt-guide-panel">
                              <span className="mt-guide-kicker">Guide</span>
                              <div className="mt-guide-row">
                                <div className="mt-guide-avatar">
                                  {booking.guide_name ? booking.guide_name.charAt(0) : "G"}
                              </div>
                                    <div className="mt-guide-copy">
                                    <h4>{booking.guide_name || "Local Guide"}</h4>
                                    <div className="mt-guide-actions">
                                      <button type="button" className="mt-guide-link" onClick={() => openGuidesForTrip(booking)}>
                                        {getStatusActionLabel(booking)}
                                      </button>
                                      {canViewChat && (
                                        <button
                                          type="button"
                                          className={`mt-guide-chat-chip ${booking.status === "active" ? "is-primary" : ""}`}
                                          onClick={() => openChatModal(booking)}
                                        >
                                          <MessageCircle size={14} />
                                          Open Chat
                                        </button>
                                      )}
                                    </div>
                                  </div>
                              </div>

                              {booking.status === "completed" && (
                                <div className="mt-review-summary-card">
                                <div className="mt-review-summary-head">
                                  <span className="mt-review-kicker">Verified Review</span>
                                  <BadgeCheck size={16} />
                                </div>
                                {hasReview ? (
                                  <>
                                    <ReviewStars value={booking.review.rating} />
                                    <p>{booking.review.comment || "You submitted a verified review for this completed trip."}</p>
                                    <div className="mt-review-submitted-badge">
                                      <BadgeCheck size={16} />
                                      Review Submitted
                                    </div>
                                  </>
                                ) : (
                                  <p>Completed trips unlock one verified rating for the exact guide you traveled with.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-trip-actions">
                          {booking.itinerary && (
                            <button
                              type="button"
                              className="mt-btn-outline"
                              onClick={() => navigate(`/trips/${booking.itinerary.id}`)}
                            >
                              <Eye size={16} />
                              View Itinerary
                            </button>
                          )}

                          {booking.status === "completed" && (
                            <>
                              {canSubmitReview && (
                                <button
                                  type="button"
                                  className="mt-btn-outline"
                                  onClick={() => openReviewModal(booking)}
                                >
                                  <MessageSquareQuote size={16} />
                                  Rate Guide
                                </button>
                              )}
                              <button type="button" className="mt-btn-primary" onClick={() => openGuidesForTrip(booking)}>
                                Rebook
                              </button>
                            </>
                          )}

                          {["rejected", "auto_rejected", "cancelled"].includes(booking.status) && (
                            <button type="button" className="mt-btn-primary" onClick={() => openGuidesForTrip(booking)}>
                              {booking.status === "cancelled" ? "Request Again" : "View Guide Options"}
                            </button>
                          )}

                          {["pending", "accepted", "active"].includes(booking.status) && (
                            <>
                              {canCancelBooking && (
                                <button type="button" className="mt-btn-danger" onClick={() => openCancelModal(booking)}>
                                  Cancel Booking
                                </button>
                              )}
                              <button type="button" className="mt-btn-outline" onClick={() => navigate("/guides")}>
                                Browse Guides
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {reviewModalOpen && selectedBooking && (
        <div className="mt-review-modal-overlay" onClick={closeReviewModal}>
          <div className="mt-review-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="mt-review-close" onClick={closeReviewModal} aria-label="Close review form">
              <X size={18} />
            </button>

            <div className="mt-review-modal-head">
              <span className="mt-review-modal-badge">Verified completed trip</span>
              <h3>Rate Your Guide</h3>
              <p>
                This review is tied to booking #{selectedBooking.id} with {selectedBooking.guide_name || "your guide"} for {selectedBooking.destination}.
              </p>
            </div>

            <div className="mt-review-proof">
              <div>
                <span>Trip</span>
                <strong>{selectedBooking.destination}</strong>
              </div>
              <div>
                <span>Dates</span>
                <strong>{formatDate(selectedBooking.trip_start)} to {formatDate(selectedBooking.trip_end)}</strong>
              </div>
            </div>

            <form className="mt-review-form" onSubmit={handleReviewSubmit}>
              {reviewError && <div className="alert-error">{reviewError}</div>}

              <div className="mt-review-field">
                <label>Your Rating</label>
                <ReviewStars value={reviewRating} onChange={setReviewRating} interactive />
              </div>

              <div className="mt-review-field">
                <label>Review Comment</label>
                <textarea
                  rows="5"
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Share what made the guide trustworthy, helpful, or memorable during your completed trip."
                />
              </div>

              <div className="mt-review-modal-actions">
                <button type="button" className="mt-btn-outline" onClick={closeReviewModal} disabled={reviewSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="mt-btn-primary" disabled={reviewSubmitting}>
                  {reviewSubmitting ? "Saving..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BookingChatModal
        key={activeChatBookingId ?? "booking-chat"}
        isOpen={chatModalOpen}
        onClose={closeChatModal}
        booking={activeChatBooking}
        thread={chatThread}
        viewerRole="traveler"
        currentUser={currentUser}
        loading={chatLoading}
        error={chatError}
        draft={chatDraft}
        onDraftChange={setChatDraft}
        onSend={handleChatSubmit}
        sending={chatSending}
      />

      <BookingCancellationModal
        isOpen={Boolean(cancelModalBooking)}
        booking={cancelModalBooking}
        reasons={STATUS_REASON_OPTIONS}
        reasonCode={cancelReasonCode}
        reasonNote={cancelReasonNote}
        loading={cancelSubmitting}
        loadingLabel="Cancelling..."
        error={cancelError}
        onReasonCodeChange={setCancelReasonCode}
        onReasonNoteChange={setCancelReasonNote}
        onClose={closeCancelModal}
        onConfirm={handleCancelBooking}
      />
    </div>
  );
}
