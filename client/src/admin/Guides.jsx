import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { createAdminGuide, deleteAdminGuide, fetchAdminGuides, updateAdminGuide } from "../services/adminApi";
import { AdminCard, AdminDrawer, AdminEmptyState, AdminPagination, AdminSectionHeader, AdminStatusBadge, AdminToolbar, ConfirmDialog, formatDate } from "./AdminUI";

const EMPTY_FORM = {
  email: "",
  full_name: "",
  phone: "",
  address: "",
  bio: "",
  languages: "",
  specialization: "",
  destinations: "",
  experience_years: "",
  availability: "available",
};

export default function Guides() {
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], pagination: null });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawerGuide, setDrawerGuide] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingGuide, setEditingGuide] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const loadGuides = useCallback(async (targetPage = page) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAdminGuides({ q: query, availability, page: targetPage });
      setData(response);
    } catch (err) {
      setError(err.message || "Unable to load guides.");
    } finally {
      setLoading(false);
    }
  }, [availability, page, query]);

  useEffect(() => setPage(1), [query, availability]);
  useEffect(() => {
    loadGuides(page);
  }, [loadGuides, page]);

  const rows = data.results || [];

  const openCreate = () => {
    setEditingGuide(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (guide) => {
    setEditingGuide(guide);
    setForm({
      email: guide.email || "",
      full_name: guide.full_name || "",
      phone: guide.phone || "",
      address: guide.address || "",
      bio: guide.bio || "",
      languages: (guide.languages || []).join(", "),
      specialization: guide.specialization || "",
      destinations: (guide.destinations || []).join(", "),
      experience_years: guide.experience_years || "",
      availability: guide.availability || "available",
    });
    setFormOpen(true);
  };

  const normalize = () => ({
    ...form,
    languages: form.languages,
    destinations: form.destinations,
  });

  const submitForm = async () => {
    try {
      if (editingGuide) {
        await updateAdminGuide(editingGuide.id, normalize());
      } else {
        await createAdminGuide({ ...normalize(), role: "guide" });
      }
      setFormOpen(false);
      await loadGuides();
    } catch (err) {
      setError(err.message || "Unable to save guide.");
    }
  };

  const toggleActive = async (guide) => {
    try {
      await updateAdminGuide(guide.id, { user_active: !guide.user_active });
      await loadGuides();
    } catch (err) {
      setError(err.message || "Unable to update guide.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAdminGuide(confirm.payload.id);
      setConfirm(null);
      setDrawerGuide(null);
      await loadGuides();
    } catch (err) {
      setError(err.message || "Unable to delete guide.");
    }
  };

  return (
    <div className="tp-admin-stack">
      <AdminSectionHeader
        eyebrow="Supply-side operations"
        title="Guides Management"
        subtitle="Approve, suspend, enrich, and monitor guide profiles with fast operational controls."
        actions={<button type="button" className="tp-admin-button tp-admin-button-primary" onClick={openCreate}><Plus size={16} />Create guide</button>}
      />

      <AdminCard>
        <AdminToolbar
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search guides, destinations, or email"
          filters={
            <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
              <option value="">All availability</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
            </select>
          }
        />
        {error ? <div className="tp-admin-inline-error">{error}</div> : null}
        {loading ? <div className="tp-admin-loading">Loading guides…</div> : null}
        {!loading && rows.length === 0 ? <AdminEmptyState title="No guides found" description="Try another filter or add a guide profile." /> : null}
        {!loading && rows.length > 0 ? (
          <>
            <div className="tp-admin-table-wrap">
              <table className="tp-admin-table">
                <thead>
                  <tr>
                    <th>Guide</th>
                    <th>Destinations</th>
                    <th>Availability</th>
                    <th>Rating</th>
                    <th>Bookings</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button type="button" className="tp-admin-row-link" onClick={() => setDrawerGuide(row)}>
                          <strong>{row.full_name}</strong>
                          <span>{row.email}</span>
                        </button>
                      </td>
                      <td>{(row.destinations || []).slice(0, 3).join(", ") || "—"}</td>
                      <td><AdminStatusBadge tone={row.availability}>{row.availability}</AdminStatusBadge></td>
                      <td>{row.rating} ({row.review_count})</td>
                      <td>{row.bookings_handled}</td>
                      <td>
                        <div className="tp-admin-row-actions">
                          <button type="button" className="tp-admin-icon-btn" onClick={() => openEdit(row)}><Pencil size={16} /></button>
                          <button type="button" className="tp-admin-icon-btn" onClick={() => toggleActive(row)}><Power size={16} /></button>
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

      <AdminDrawer open={Boolean(drawerGuide)} title={drawerGuide?.full_name || "Guide"} subtitle={drawerGuide?.email || ""} onClose={() => setDrawerGuide(null)}>
        {drawerGuide ? (
          <div className="tp-admin-detail-grid">
            <Detail label="Availability" value={drawerGuide.availability} />
            <Detail label="Experience" value={`${drawerGuide.experience_years} years`} />
            <Detail label="Rating" value={`${drawerGuide.rating} / 5`} />
            <Detail label="Created" value={formatDate(drawerGuide.created_at, true)} />
            <Detail label="Languages" value={(drawerGuide.languages || []).join(", ")} full />
            <Detail label="Destinations" value={(drawerGuide.destinations || []).join(", ")} full />
            <Detail label="Bio" value={drawerGuide.bio} full />
          </div>
        ) : null}
      </AdminDrawer>

      <AdminDrawer open={formOpen} title={editingGuide ? "Edit guide" : "Create guide"} subtitle="Guide profile and operational status" onClose={() => setFormOpen(false)}>
        <div className="tp-admin-form-grid">
          <label><span>Email</span><input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label><span>Full name</span><input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} /></label>
          <label><span>Phone</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label><span>Availability</span><select value={form.availability} onChange={(event) => setForm((current) => ({ ...current, availability: event.target.value }))}><option value="available">Available</option><option value="busy">Busy</option></select></label>
          <label><span>Experience years</span><input value={form.experience_years} onChange={(event) => setForm((current) => ({ ...current, experience_years: event.target.value }))} /></label>
          <label><span>Specialization</span><input value={form.specialization} onChange={(event) => setForm((current) => ({ ...current, specialization: event.target.value }))} /></label>
          <label className="tp-admin-form-span"><span>Languages</span><input value={form.languages} onChange={(event) => setForm((current) => ({ ...current, languages: event.target.value }))} placeholder="English, Nepali" /></label>
          <label className="tp-admin-form-span"><span>Destinations</span><input value={form.destinations} onChange={(event) => setForm((current) => ({ ...current, destinations: event.target.value }))} placeholder="Pokhara, Kathmandu" /></label>
          <label className="tp-admin-form-span"><span>Address</span><input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></label>
          <label className="tp-admin-form-span"><span>Bio</span><textarea rows={4} value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} /></label>
        </div>
        <div className="tp-admin-confirm-actions">
          <button type="button" className="tp-admin-button tp-admin-button-muted" onClick={() => setFormOpen(false)}>Cancel</button>
          <button type="button" className="tp-admin-button tp-admin-button-primary" onClick={submitForm}>{editingGuide ? "Save changes" : "Create guide"}</button>
        </div>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete guide profile"
        message={`Delete ${confirm?.payload?.full_name}? Existing bookings may lose their assigned guide profile.`}
        confirmLabel="Delete guide"
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
