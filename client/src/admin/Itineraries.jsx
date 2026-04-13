import { useCallback, useEffect, useState } from "react";
import { FilePlus2, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { createAdminItinerary, deleteAdminItinerary, fetchAdminItineraries, updateAdminItinerary } from "../services/adminApi";
import { AdminCard, AdminDrawer, AdminEmptyState, AdminLoadingSkeleton, AdminPagination, AdminSectionHeader, AdminTableMeta, AdminToolbar, ConfirmDialog, formatDate } from "./AdminUI";

const EMPTY_FORM = {
  traveler_id: "",
  destination: "",
  starting_place: "",
  start_date: "",
  end_date: "",
  days: "1",
  travelers: "1",
  budget: "",
  notes: "",
  itinerary_data: "{}",
};

export default function Itineraries() {
  const [query, setQuery] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerItinerary, setDrawerItinerary] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingItinerary, setEditingItinerary] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const loadItineraries = useCallback(async (targetPage = page) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAdminItineraries({ q: query, ordering, page: targetPage });
      setData(response);
    } catch (err) {
      setError(err.message || "Unable to load itineraries.");
    } finally {
      setLoading(false);
    }
  }, [ordering, page, query]);

  useEffect(() => setPage(1), [query, ordering]);
  useEffect(() => {
    loadItineraries(page);
  }, [loadItineraries, page]);

  const rows = data.results || [];

  const openCreate = () => {
    setEditingItinerary(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditingItinerary(row);
    setForm({
      traveler_id: row.traveler_id || "",
      destination: row.destination || "",
      starting_place: row.starting_place || "",
      start_date: row.start_date || "",
      end_date: row.end_date || "",
      days: String(row.days || 1),
      travelers: String(row.travelers || 1),
      budget: row.budget || "",
      notes: row.notes || "",
      itinerary_data: JSON.stringify(row.itinerary_data || {}, null, 2),
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    try {
      const payload = {
        ...form,
        itinerary_data: form.itinerary_data ? JSON.parse(form.itinerary_data) : {},
      };
      if (editingItinerary) {
        await updateAdminItinerary(editingItinerary.id, payload);
        toast.success("Itinerary updated.");
      } else {
        await createAdminItinerary(payload);
        toast.success("Itinerary created.");
      }
      setFormOpen(false);
      await loadItineraries();
    } catch (err) {
      setError(err.message || "Unable to save itinerary.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAdminItinerary(confirm.payload.id);
      toast.success("Itinerary deleted.");
      setConfirm(null);
      setDrawerItinerary(null);
      await loadItineraries();
    } catch (err) {
      setError(err.message || "Unable to delete itinerary.");
    }
  };

  return (
    <div className="tp-admin-stack">
      <AdminSectionHeader
        eyebrow="Trip planning records"
        title="Saved Itineraries"
        subtitle="Inspect trip plans, fix metadata, and clean out broken or test itineraries."
        actions={<button type="button" className="tp-admin-button tp-admin-button-primary" onClick={openCreate}><FilePlus2 size={16} />Create itinerary</button>}
      />

      <AdminCard>
        <AdminToolbar
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search destination, traveler, or origin"
          filters={
            <select value={ordering} onChange={(event) => setOrdering(event.target.value)}>
              <option value="-created_at">Newest first</option>
              <option value="created_at">Oldest first</option>
              <option value="destination">Destination A-Z</option>
            </select>
          }
        />
        {error ? <div className="tp-admin-inline-error">{error}</div> : null}
        {loading ? <AdminLoadingSkeleton /> : null}
        {!loading && rows.length === 0 ? <AdminEmptyState title="No itineraries found" description="Saved trip plans will appear here." /> : null}
        {!loading && rows.length > 0 ? (
          <>
            <AdminTableMeta pagination={data.pagination} label="Saved itineraries" />
            <div className="tp-admin-table-wrap">
              <table className="tp-admin-table">
                <thead>
                  <tr>
                    <th>Itinerary</th>
                    <th>Traveler</th>
                    <th>Dates</th>
                    <th>Budget</th>
                    <th>Bookings</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button type="button" className="tp-admin-row-link" onClick={() => setDrawerItinerary(row)}>
                          <strong>{row.destination}</strong>
                          <span>{row.starting_place || "No start city"}</span>
                        </button>
                      </td>
                      <td>{row.traveler_email}</td>
                      <td>{formatDate(row.start_date)} - {formatDate(row.end_date)}</td>
                      <td>{row.budget || "—"}</td>
                      <td>{row.booking_count}</td>
                      <td>
                        <div className="tp-admin-row-actions">
                          <button type="button" className="tp-admin-icon-btn" onClick={() => openEdit(row)}><Pencil size={16} /></button>
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

      <AdminDrawer open={Boolean(drawerItinerary)} title={drawerItinerary?.destination || "Itinerary"} subtitle={drawerItinerary?.traveler_email || ""} onClose={() => setDrawerItinerary(null)}>
        {drawerItinerary ? (
          <div className="tp-admin-stack">
            <div className="tp-admin-detail-grid">
              <Detail label="Origin" value={drawerItinerary.starting_place} />
              <Detail label="Dates" value={`${formatDate(drawerItinerary.start_date)} - ${formatDate(drawerItinerary.end_date)}`} />
              <Detail label="Travelers" value={drawerItinerary.travelers} />
              <Detail label="Budget" value={drawerItinerary.budget} />
              <Detail label="Notes" value={drawerItinerary.notes} full />
            </div>
            <pre className="tp-admin-json">{JSON.stringify(drawerItinerary.itinerary_data || {}, null, 2)}</pre>
          </div>
        ) : null}
      </AdminDrawer>

      <AdminDrawer open={formOpen} title={editingItinerary ? "Edit itinerary" : "Create itinerary"} subtitle="Saved AI trip plan metadata" onClose={() => setFormOpen(false)}>
        <div className="tp-admin-form-grid">
          <label><span>Traveler ID</span><input value={form.traveler_id} onChange={(event) => setForm((current) => ({ ...current, traveler_id: event.target.value }))} /></label>
          <label><span>Destination</span><input value={form.destination} onChange={(event) => setForm((current) => ({ ...current, destination: event.target.value }))} /></label>
          <label><span>Starting place</span><input value={form.starting_place} onChange={(event) => setForm((current) => ({ ...current, starting_place: event.target.value }))} /></label>
          <label><span>Start date</span><input type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} /></label>
          <label><span>End date</span><input type="date" value={form.end_date} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} /></label>
          <label><span>Days</span><input value={form.days} onChange={(event) => setForm((current) => ({ ...current, days: event.target.value }))} /></label>
          <label><span>Travelers</span><input value={form.travelers} onChange={(event) => setForm((current) => ({ ...current, travelers: event.target.value }))} /></label>
          <label><span>Budget</span><input value={form.budget} onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))} /></label>
          <label className="tp-admin-form-span"><span>Notes</span><textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
          <label className="tp-admin-form-span"><span>Itinerary data (JSON)</span><textarea rows={10} value={form.itinerary_data} onChange={(event) => setForm((current) => ({ ...current, itinerary_data: event.target.value }))} /></label>
        </div>
        <div className="tp-admin-confirm-actions">
          <button type="button" className="tp-admin-button tp-admin-button-muted" onClick={() => setFormOpen(false)}>Cancel</button>
          <button type="button" className="tp-admin-button tp-admin-button-primary" onClick={submitForm}>{editingItinerary ? "Save changes" : "Create itinerary"}</button>
        </div>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete itinerary"
        message={`Delete itinerary #${confirm?.payload?.id}? This removes the saved trip plan.`}
        confirmLabel="Delete itinerary"
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
