export function isCurrentUsersMessage(message, currentUserId) {
  if (message?.sender_id == null || currentUserId == null) {
    return false;
  }

  return String(message.sender_id) === String(currentUserId);
}
