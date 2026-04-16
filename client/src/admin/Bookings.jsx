import { useCallback, useEffect, useState } from "react";
import { CalendarPlus2, Eye, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { createAdminBooking, deleteAdminBooking, fetchAdminBookingDetail, fetchAdminBookings, updateAdminBooking, updateAdminBookingStatus } from "../services/adminApi";
import { AdminCard, AdminDrawer, AdminEmptyState, AdminLoadingSkeleton, AdminPagination, AdminSectionHeader, AdminStatusBadge, AdminTableMeta, AdminToolbar, ConfirmDialog, formatDate } from "./AdminUI";

const STATUSES = ["payment_pending", "pending", "accepted", "active", "completed", "cancelled", "rejected", "auto_rejected"];
const EMPTY_FORM = {
  guide_id: "",
  traveler_user_id: "",
  traveler_name: "",
  traveler_email: "",
  traveler_phone: "",
  destination: "",
  trip_start: "",
  trip_end: "",
  status: "pending",
  notes: "",
};

export default function Bookings() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerBooking, setDrawerBooking] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirm, setConfirm] = useState(null);

  const loadBookings = useCallback(async (targetPage = page) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAdminBookings({
        q: query,
        status,
        ordering,
        trip_start_from: dateFrom,
        trip_end_to: dateTo,
        page: targetPage,
      });
      setData(response);
    } catch (err) {
      setError(err.message || "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, ordering, page, query, status]);

  useEffect(() => setPage(1), [query, status, ordering, dateFrom, dateTo]);
  useEffect(() => {
    loadBookings(page);
  }, [loadBookings, page]);

  const rows = data.results || [];

  const openCreate = () => {
    setEditingBooking(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = async (id) => {
    try {
      const detail = await fetchAdminBookingDetail(id);
      setEditingBooking(detail);
      setForm({
        guide_id: detail.guide_id || "",
        traveler_user_id: detail.traveler_user_id || "",
        traveler_name: detail.traveler_name || "",
        traveler_email: detail.traveler_email || "",
        traveler_phone: detail.traveler_phone || "",
        destination: detail.destination || "",
        trip_start: detail.trip_start || "",
        trip_end: detail.trip_end || "",
        status: detail.status || "pending",
        notes: detail.notes || "",
      });
      setFormOpen(true);
    } catch (err) {
      setError(err.message || "Unable to load booking.");
    }
  };

  const submitForm = async () => {
    try {
      if (editingBooking) {
        await updateAdminBooking(editingBooking.id, form);
        toast.success("Booking updated.");
      } else {
        await createAdminBooking(form);
        toast.success("Booking created.");
      }
      setFormOpen(false);
      await loadBookings();
    } catch (err) {
      setError(err.message || "Unable to save booking.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAdminBooking(confirm.payload.id);
      toast.success("Booking deleted.");
      setConfirm(null);
      setDrawerBooking(null);
      await loadBookings();
    } catch (err) {
      setError(err.message || "Unable to delete booking.");
    }
  };

  const handleStatusChange = async (id, nextStatus) => {
    try {
      await updateAdminBookingStatus(id, nextStatus);
      toast.success("Booking status updated.");
      await loadBookings();
    } catch (err) {
      setError(err.message || "Unable to update booking status.");
    }
  };

  return (
    <div className="tp-admin-stack">
      <AdminSectionHeader
        eyebrow="Demand operations"
        title="Bookings Management"
        subtitle="Monitor traveler-guide transactions, resolve disputes, and keep operational state accurate."
        actions={<button type="button" className="tp-admin-button tp-admin-button-primary" onClick={openCreate}><CalendarPlus2 size={16} />Create booking</button>}
      />

      <AdminCard>
        <AdminToolbar
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search traveler, guide, or destination"
          filters={
            <>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={ordering} onChange={(event) => setOrdering(event.target.value)}>
                <option value="-created_at">Newest created</option>
                <option value="created_at">Oldest created</option>
                <option value="-trip_start">Latest trip start</option>
                <option value="trip_start">Soonest trip start</option>
              </select>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} max={dateTo || undefined} />
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} min={dateFrom || undefined} />
            </>
          }
        />
        {error ? <div className="tp-admin-inline-error">{error}</div> : null}
        {loading ? <AdminLoadingSkeleton /> : null}
        {!loading && rows.length === 0 ? <AdminEmptyState title="No bookings found" description="Adjust filters or create a new booking record." /> : null}
        {!loading && rows.length > 0 ? (
          <>
            <AdminTableMeta pagination={data.pagination} label="Matching bookings" />
            <div className="tp-admin-table-wrap">
              <table className="tp-admin-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Traveler</th>
                    <th>Guide</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button type="button" className="tp-admin-row-link" onClick={() => setDrawerBooking(row)}>
                          <strong>{row.destination}</strong>
                          <span>Booking #{row.id}</span>
                        </button>
                      </td>
                      <td>{row.traveler_name}</td>
                      <td>{row.guide_name}</td>
                      <td>{formatDate(row.trip_start)} - {formatDate(row.trip_end)}</td>
                      <td>
                        <select value={row.status} onChange={(event) => handleStatusChange(row.id, event.target.value)}>
                          {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </td>
                      <td>
                        <div className="tp-admin-row-actions">
                          <button type="button" className="tp-admin-icon-btn" onClick={() => openEdit(row.id)}><Eye size={16} /></button>
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

      <AdminDrawer open={Boolean(drawerBooking)} title={drawerBooking?.destination || "Booking"} subtitle={drawerBooking ? `Traveler ${drawerBooking.traveler_name}` : ""} onClose={() => setDrawerBooking(null)}>
        {drawerBooking ? (
          <div className="tp-admin-detail-grid">
            <Detail label="Status" value={<AdminStatusBadge tone={drawerBooking.status}>{drawerBooking.status}</AdminStatusBadge>} />
            <Detail label="Guide" value={drawerBooking.guide_name} />
            <Detail label="Traveler email" value={drawerBooking.traveler_email} />
            <Detail label="Traveler phone" value={drawerBooking.traveler_phone} />
            <Detail label="Trip dates" value={`${formatDate(drawerBooking.trip_start)} - ${formatDate(drawerBooking.trip_end)}`} full />
            <Detail label="Linked itinerary" value={drawerBooking.itinerary_id ? `#${drawerBooking.itinerary_id}` : "None"} />
            <Detail label="Chat messages" value={drawerBooking.chat_count} />
            <Detail label="Notes" value={drawerBooking.notes} full />
          </div>
        ) : null}
      </AdminDrawer>

      <AdminDrawer open={formOpen} title={editingBooking ? "Edit booking" : "Create booking"} subtitle="Manage booking records safely" onClose={() => setFormOpen(false)}>
        <div className="tp-admin-form-grid">
          <label><span>Guide ID</span><input value={form.guide_id} onChange={(event) => setForm((current) => ({ ...current, guide_id: event.target.value }))} /></label>
          <label><span>Traveler user ID</span><input value={form.traveler_user_id} onChange={(event) => setForm((current) => ({ ...current, traveler_user_id: event.target.value }))} /></label>
          <label><span>Traveler name</span><input value={form.traveler_name} onChange={(event) => setForm((current) => ({ ...current, traveler_name: event.target.value }))} /></label>
          <label><span>Traveler email</span><input value={form.traveler_email} onChange={(event) => setForm((current) => ({ ...current, traveler_email: event.target.value }))} /></label>
          <label><span>Traveler phone</span><input value={form.traveler_phone} onChange={(event) => setForm((current) => ({ ...current, traveler_phone: event.target.value }))} /></label>
          <label><span>Status</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="tp-admin-form-span"><span>Destination</span><input value={form.destination} onChange={(event) => setForm((current) => ({ ...current, destination: event.target.value }))} /></label>
          <label><span>Trip start</span><input type="date" value={form.trip_start} onChange={(event) => setForm((current) => ({ ...current, trip_start: event.target.value }))} /></label>
          <label><span>Trip end</span><input type="date" value={form.trip_end} onChange={(event) => setForm((current) => ({ ...current, trip_end: event.target.value }))} /></label>
          <label className="tp-admin-form-span"><span>Notes</span><textarea rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
        </div>
        <div className="tp-admin-confirm-actions">
          <button type="button" className="tp-admin-button tp-admin-button-muted" onClick={() => setFormOpen(false)}>Cancel</button>
          <button type="button" className="tp-admin-button tp-admin-button-primary" onClick={submitForm}>{editingBooking ? "Save changes" : "Create booking"}</button>
        </div>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete booking"
        message={`Delete booking #${confirm?.payload?.id}? This will remove associated operational data.`}
        confirmLabel="Delete booking"
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
