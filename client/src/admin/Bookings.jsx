import { useEffect, useState } from "react";
import { fetchAdminBookings, updateAdminBookingStatus } from "../services/adminApi";

const STATUSES = ["pending", "accepted", "active", "completed", "cancelled", "rejected", "auto_rejected"];

export default function Bookings() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetchAdminBookings({ q: query, status }).then(setRows).catch(() => setRows([]));
  }, [query, status]);

  const handleUpdate = async (id, nextStatus) => {
    const updated = await updateAdminBookingStatus(id, nextStatus);
    setRows((current) => current.map((row) => (row.id === id ? updated : row)));
  };

  return (
    <section className="tp-admin-card">
      <div className="tp-admin-toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search bookings…" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div className="tp-admin-table-wrap">
        <table className="tp-admin-table">
          <thead><tr><th>Destination</th><th>Traveler</th><th>Guide</th><th>Dates</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.destination}</td>
                <td>{row.traveler_name}</td>
                <td>{row.guide_name}</td>
                <td>{new Date(row.trip_start).toLocaleDateString()} - {new Date(row.trip_end).toLocaleDateString()}</td>
                <td>
                  <select value={row.status} onChange={(e) => handleUpdate(row.id, e.target.value)}>
                    {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
