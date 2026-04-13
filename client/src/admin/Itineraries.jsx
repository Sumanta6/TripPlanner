import { useEffect, useState } from "react";
import { fetchAdminItineraries } from "../services/adminApi";

export default function Itineraries() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetchAdminItineraries({ q: query }).then(setRows).catch(() => setRows([]));
  }, [query]);

  return (
    <section className="tp-admin-card">
      <div className="tp-admin-toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search itineraries…" />
      </div>
      <div className="tp-admin-table-wrap">
        <table className="tp-admin-table">
          <thead><tr><th>Destination</th><th>Traveler</th><th>Dates</th><th>Days</th><th>Budget</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.destination}</td>
                <td>{row.traveler_email}</td>
                <td>{row.start_date || "TBD"} - {row.end_date || "TBD"}</td>
                <td>{row.days}</td>
                <td>{row.budget || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
