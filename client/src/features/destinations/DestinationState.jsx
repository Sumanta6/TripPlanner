export function DestinationState({
  title,
  body,
  actionLabel,
  onAction,
  role = "status",
}) {
  return (
    <div className="destination-state" role={role}>
      <h2>{title}</h2>
      <p>{body}</p>
      {actionLabel && onAction ? (
        <button type="button" className="destination-btn destination-btn--primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
