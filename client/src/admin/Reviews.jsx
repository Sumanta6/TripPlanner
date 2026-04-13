import { useCallback, useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { deleteAdminReview, fetchAdminReviews } from "../services/adminApi";
import { AdminCard, AdminDrawer, AdminEmptyState, AdminLoadingSkeleton, AdminPagination, AdminSectionHeader, AdminStatusBadge, AdminTableMeta, AdminToolbar, ConfirmDialog, formatDate } from "./AdminUI";

export default function Reviews() {
  const [query, setQuery] = useState("");
  const [rating, setRating] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerReview, setDrawerReview] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const loadReviews = useCallback(async (targetPage = page) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAdminReviews({ q: query, rating, ordering, page: targetPage });
      setData(response);
    } catch (err) {
      setError(err.message || "Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [ordering, page, query, rating]);

  useEffect(() => setPage(1), [query, rating, ordering]);
  useEffect(() => {
    loadReviews(page);
  }, [loadReviews, page]);

  const rows = data.results || [];

  const handleDelete = async () => {
    try {
      await deleteAdminReview(confirm.payload.id);
      toast.success("Review removed.");
      setConfirm(null);
      setDrawerReview(null);
      await loadReviews();
    } catch (err) {
      setError(err.message || "Unable to remove review.");
    }
  };

  return (
    <div className="tp-admin-stack">
      <AdminSectionHeader
        eyebrow="Reputation moderation"
        title="Reviews and Ratings"
        subtitle="Moderate guide feedback, inspect sentiment, and remove inappropriate content."
      />

      <AdminCard>
        <AdminToolbar
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search review text, guide, traveler, or destination"
          filters={
            <>
              <select value={rating} onChange={(event) => setRating(event.target.value)}>
                <option value="">All ratings</option>
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
              </select>
              <select value={ordering} onChange={(event) => setOrdering(event.target.value)}>
                <option value="-created_at">Newest first</option>
                <option value="created_at">Oldest first</option>
                <option value="-rating">Highest rating</option>
                <option value="rating">Lowest rating</option>
              </select>
            </>
          }
        />
        {error ? <div className="tp-admin-inline-error">{error}</div> : null}
        {loading ? <AdminLoadingSkeleton /> : null}
        {!loading && rows.length === 0 ? <AdminEmptyState title="No reviews found" description="Traveler feedback will appear here for moderation." /> : null}
        {!loading && rows.length > 0 ? (
          <>
            <AdminTableMeta pagination={data.pagination} label="Reviews queue" />
            <div className="tp-admin-table-wrap">
              <table className="tp-admin-table">
                <thead>
                  <tr>
                    <th>Guide</th>
                    <th>Traveler</th>
                    <th>Destination</th>
                    <th>Rating</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.guide_name}</td>
                      <td>{row.traveler_name}</td>
                      <td>{row.destination}</td>
                      <td><AdminStatusBadge tone="completed">{row.rating}/5</AdminStatusBadge></td>
                      <td>{formatDate(row.created_at, true)}</td>
                      <td>
                        <div className="tp-admin-row-actions">
                          <button type="button" className="tp-admin-icon-btn" onClick={() => setDrawerReview(row)}><Eye size={16} /></button>
                          <button type="button" className="tp-admin-icon-btn is-danger" onClick={() => setConfirm({ payload: row })}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination pagination={data.pagination} onPageChange={setPage} />
          </>
        ) : null}
      </AdminCard>

      <AdminDrawer open={Boolean(drawerReview)} title={drawerReview?.guide_name || "Review"} subtitle={drawerReview?.traveler_name || ""} onClose={() => setDrawerReview(null)}>
        {drawerReview ? (
          <div className="tp-admin-detail-grid">
            <Detail label="Destination" value={drawerReview.destination} />
            <Detail label="Traveler email" value={drawerReview.traveler_email} />
            <Detail label="Rating" value={`${drawerReview.rating}/5`} />
            <Detail label="Created" value={formatDate(drawerReview.created_at, true)} />
            <Detail label="Comment" value={drawerReview.comment} full />
          </div>
        ) : null}
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Remove review"
        message="Delete this review permanently from the platform?"
        confirmLabel="Remove review"
        onCancel={() => setConfirm(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function Detail({ label, value, full = false }) {
  return (
    <div className={`tp-admin-detail-item ${full ? "is-full" : ""}`.trim()}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}
