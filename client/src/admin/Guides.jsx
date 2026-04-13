import { useEffect, useState } from "react";
import { fetchAdminGuides } from "../services/adminApi";

export default function Guides() {
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetchAdminGuides({ q: query, availability }).then(setRows).catch(() => setRows([]));
  }, [query, availability]);

  return (
    <section className="tp-admin-card">
      <div className="tp-admin-toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search guides…" />
        <select value={availability} onChange={(e) => setAvailability(e.target.value)}>
          <option value="">All availability</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
        </select>
      </div>
      <div className="tp-admin-table-wrap">
        <table className="tp-admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Availability</th><th>Experience</th><th>Rating</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.full_name}</td>
                <td>{row.email}</td>
                <td>{row.availability}</td>
                <td>{row.experience_years}</td>
                <td>{row.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
