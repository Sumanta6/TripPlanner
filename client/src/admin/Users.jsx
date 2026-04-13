import { useEffect, useState } from "react";
import { fetchAdminUsers } from "../services/adminApi";

export default function Users() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetchAdminUsers({ q: query, role }).then(setRows).catch(() => setRows([]));
  }, [query, role]);

  return (
    <section className="tp-admin-card">
      <div className="tp-admin-toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users…" />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="traveler">Travelers</option>
          <option value="guide">Guides</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      <div className="tp-admin-table-wrap">
        <table className="tp-admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Roles</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.full_name}</td>
                <td>{row.email}</td>
                <td>{[row.is_superuser ? "Admin" : null, row.is_guide ? "Guide" : null, row.is_traveler ? "Traveler" : null].filter(Boolean).join(", ")}</td>
                <td>{row.is_active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
