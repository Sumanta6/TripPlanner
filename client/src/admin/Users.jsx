import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Power, RefreshCcw, Trash2 } from "lucide-react";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUserDetail,
  fetchAdminUsers,
  triggerAdminUserResetPassword,
  updateAdminUser,
} from "../services/adminApi";
import {
  AdminCard,
  AdminDrawer,
  AdminEmptyState,
  AdminPagination,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminToolbar,
  ConfirmDialog,
  formatDate,
  formatRole,
} from "./AdminUI";

const EMPTY_FORM = {
  role: "traveler",
  email: "",
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  full_name: "",
  phone: "",
  address: "",
  bio: "",
};

export default function Users() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  const [drawerUser, setDrawerUser] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUser, setEditingUser] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const loadUsers = useCallback(async (targetPage = page) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAdminUsers({ q: query, role, page: targetPage });
      setData(response);
    } catch (err) {
      setError(err.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [page, query, role]);

  useEffect(() => {
    setPage(1);
  }, [query, role]);

  useEffect(() => {
    loadUsers(page);
  }, [loadUsers, page]);

  const rows = data.results || [];
  const allSelected = rows.length > 0 && selected.length === rows.length;

  const selectedSummary = useMemo(() => `${selected.length} selected`, [selected]);

  const toggleSelect = (id) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = async (id) => {
    try {
      const detail = await fetchAdminUserDetail(id);
      setEditingUser(detail);
      setForm({
        role: detail.role || "traveler",
        email: detail.email || "",
        username: detail.username || "",
        password: "",
        first_name: detail.first_name || "",
        last_name: detail.last_name || "",
        full_name: detail.full_name || "",
        phone: detail.phone || "",
        address: detail.address || "",
        bio: detail.bio || "",
      });
      setFormOpen(true);
    } catch (err) {
      setError(err.message || "Unable to load user details.");
    }
  };

  const submitForm = async () => {
    try {
      if (editingUser) {
        await updateAdminUser(editingUser.id, form);
      } else {
        await createAdminUser(form);
      }
      setFormOpen(false);
      setForm(EMPTY_FORM);
      await loadUsers();
    } catch (err) {
      setError(err.message || "Unable to save user.");
    }
  };

  const handleToggleActive = async (row) => {
    try {
      await updateAdminUser(row.id, { is_active: !row.is_active });
      await loadUsers();
    } catch (err) {
      setError(err.message || "Unable to update user.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminUser(id);
      setConfirm(null);
      setDrawerUser(null);
      await loadUsers();
    } catch (err) {
      setError(err.message || "Unable to delete user.");
    }
  };

  const handleResetPassword = async (id) => {
    try {
      const result = await triggerAdminUserResetPassword(id);
      setError(result.message || "Password reset flow triggered.");
    } catch (err) {
      setError(err.message || "Unable to trigger reset.");
    }
  };

  return (
    <div className="tp-admin-stack">
      <AdminSectionHeader
        eyebrow="Identity and access"
        title="Users Management"
        subtitle="Create, inspect, moderate, and deactivate traveler, guide, and admin accounts from one place."
        actions={<button type="button" className="tp-admin-button tp-admin-button-primary" onClick={openCreate}><Plus size={16} />Create user</button>}
      />

      <AdminCard>
        <AdminToolbar
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search by name, email, or username"
          filters={
            <>
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="">All roles</option>
                <option value="traveler">Traveler</option>
                <option value="guide">Guide</option>
                <option value="admin">Admin</option>
              </select>
            </>
          }
          actions={<div className="tp-admin-bulk-note">{selectedSummary}</div>}
        />

        {error ? <div className="tp-admin-inline-error">{error}</div> : null}
        {loading ? <div className="tp-admin-loading">Loading users…</div> : null}
        {!loading && rows.length === 0 ? <AdminEmptyState title="No users found" description="Try another search or create a new account." /> : null}

        {!loading && rows.length > 0 ? (
          <>
            <div className="tp-admin-table-wrap">
              <table className="tp-admin-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))} /></th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} /></td>
                      <td>
                        <button type="button" className="tp-admin-row-link" onClick={() => setDrawerUser(row)}>
                          <strong>{row.full_name || row.email}</strong>
                          <span>{row.email}</span>
                        </button>
                      </td>
                      <td>{formatRole(row)}</td>
                      <td><AdminStatusBadge tone={row.is_active ? "accepted" : "cancelled"}>{row.is_active ? "Active" : "Inactive"}</AdminStatusBadge></td>
                      <td>{formatDate(row.date_joined)}</td>
                      <td>
                        <div className="tp-admin-row-actions">
                          <button type="button" className="tp-admin-icon-btn" onClick={() => openEdit(row.id)}><Pencil size={16} /></button>
                          <button type="button" className="tp-admin-icon-btn" onClick={() => handleToggleActive(row)}><Power size={16} /></button>
                          <button type="button" className="tp-admin-icon-btn" onClick={() => handleResetPassword(row.id)}><RefreshCcw size={16} /></button>
                          <button type="button" className="tp-admin-icon-btn is-danger" onClick={() => setConfirm({ type: "delete", payload: row })}><Trash2 size={16} /></button>
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

      <AdminDrawer
        open={Boolean(drawerUser)}
        title={drawerUser?.full_name || drawerUser?.email || "User details"}
        subtitle={drawerUser?.email || ""}
        onClose={() => setDrawerUser(null)}
      >
        {drawerUser ? (
          <div className="tp-admin-detail-grid">
            <Detail label="Username" value={drawerUser.username} />
            <Detail label="Role" value={formatRole(drawerUser)} />
            <Detail label="Phone" value={drawerUser.phone} />
            <Detail label="Joined" value={formatDate(drawerUser.date_joined, true)} />
            <Detail label="Travel style" value={drawerUser.travel_style} />
            <Detail label="Preferred destinations" value={(drawerUser.preferred_destinations || []).join(", ")} />
            <Detail label="Bio" value={drawerUser.bio} full />
          </div>
        ) : null}
      </AdminDrawer>

      <AdminDrawer
        open={formOpen}
        title={editingUser ? "Edit user" : "Create user"}
        subtitle="Maintain user identities and roles safely."
        onClose={() => setFormOpen(false)}
      >
        <div className="tp-admin-form-grid">
          <label><span>Role</span><select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}><option value="traveler">Traveler</option><option value="guide">Guide</option><option value="admin">Admin</option></select></label>
          <label><span>Email</span><input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label><span>Username</span><input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} /></label>
          <label><span>Password</span><input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder={editingUser ? "Leave blank to keep current password" : ""} /></label>
          <label><span>First name</span><input value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} /></label>
          <label><span>Last name</span><input value={form.last_name} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} /></label>
          <label><span>Display name</span><input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} /></label>
          <label><span>Phone</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label className="tp-admin-form-span"><span>Address</span><input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></label>
          <label className="tp-admin-form-span"><span>Bio</span><textarea rows={4} value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} /></label>
        </div>
        <div className="tp-admin-confirm-actions">
          <button type="button" className="tp-admin-button tp-admin-button-muted" onClick={() => setFormOpen(false)}>Cancel</button>
          <button type="button" className="tp-admin-button tp-admin-button-primary" onClick={submitForm}>{editingUser ? "Save changes" : "Create user"}</button>
        </div>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete user"
        message={`Delete ${confirm?.payload?.email}? This action cannot be undone.`}
        confirmLabel="Delete user"
        onCancel={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm?.payload?.id)}
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
