export function normalizeChatMessage(message, fallback = {}) {
    if (!message) return null;

    return {
        id: message.id ?? fallback.id ?? null,
        booking: message.booking ?? fallback.booking ?? fallback.booking_id ?? null,
        booking_id: message.booking_id ?? message.booking ?? fallback.booking_id ?? fallback.booking ?? null,
        sender_id: message.sender_id ?? fallback.sender_id ?? null,
        sender_name: message.sender_name ?? fallback.sender_name ?? '',
        sender_role: message.sender_role ?? fallback.sender_role ?? '',
        sender_avatar: message.sender_avatar ?? fallback.sender_avatar ?? '',
        receiver_id: message.receiver_id ?? fallback.receiver_id ?? null,
        message: message.message ?? message.content ?? fallback.message ?? '',
        content: message.content ?? message.message ?? fallback.content ?? fallback.message ?? '',
        created_at: message.created_at ?? fallback.created_at ?? new Date().toISOString(),
        is_current_user:
            typeof message.is_current_user === 'boolean'
                ? message.is_current_user
                : typeof fallback.is_current_user === 'boolean'
                    ? fallback.is_current_user
                    : false,
    };
}

export function normalizeChatThread(thread) {
    if (!thread) return thread;

    return {
        ...thread,
        messages: Array.isArray(thread.messages)
            ? thread.messages.map((message) => normalizeChatMessage(message)).filter(Boolean)
            : [],
    };
}

export function createOptimisticChatMessage({
    bookingId,
    currentUserId,
    senderName,
    senderRole,
    senderAvatar = '',
    receiverId = null,
    message,
}) {
    return normalizeChatMessage({
        id: `temp-${bookingId}-${Date.now()}`,
        booking: bookingId,
        booking_id: bookingId,
        sender_id: currentUserId,
        sender_name: senderName,
        sender_role: senderRole,
        sender_avatar: senderAvatar,
        receiver_id: receiverId,
        message,
        content: message,
        created_at: new Date().toISOString(),
        is_current_user: true,
    });
}
