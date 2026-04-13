import { useCallback, useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { deleteAdminContact, fetchAdminChatThreadDetail, fetchAdminChatThreads, fetchAdminContacts, updateAdminContact } from "../services/adminApi";
import { AdminCard, AdminDrawer, AdminEmptyState, AdminLoadingSkeleton, AdminPagination, AdminSectionHeader, AdminStatusBadge, AdminTableMeta, AdminToolbar, ConfirmDialog, formatDate } from "./AdminUI";

const CONTACT_STATUSES = ["New", "In Progress", "Resolved"];

export default function Support() {
  const [tab, setTab] = useState("contacts");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerContent, setDrawerContent] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async (targetPage = page) => {
    setLoading(true);
    setError("");
    try {
      const response = tab === "contacts"
        ? await fetchAdminContacts({ q: query, status, ordering, page: targetPage })
        : await fetchAdminChatThreads({ q: query, status, ordering, page: targetPage });
      setData(response);
    } catch (err) {
      setError(err.message || "Unable to load support data.");
    } finally {
      setLoading(false);
    }
  }, [ordering, page, query, status, tab]);

  useEffect(() => setPage(1), [tab, query, status, ordering]);
  useEffect(() => {
    load(page);
  }, [load, page]);

  const rows = data.results || [];

  const openChatThread = async (bookingId) => {
    try {
      const detail = await fetchAdminChatThreadDetail(bookingId);
      setDrawerContent(detail);
    } catch (err) {
      setError(err.message || "Unable to load chat thread.");
    }
  };

  const handleContactStatus = async (contact, nextStatus) => {
    try {
      await updateAdminContact(contact.id, { status: nextStatus });
      toast.success("Contact status updated.");
      await load();
    } catch (err) {
      setError(err.message || "Unable to update contact.");
    }
  };

  const handleDeleteContact = async () => {
    try {
      await deleteAdminContact(confirm.payload.id);
      toast.success("Contact deleted.");
      setConfirm(null);
      setDrawerContent(null);
      await load();
    } catch (err) {
      setError(err.message || "Unable to delete contact.");
    }
  };

  return (
    <div className="tp-admin-stack">
      <AdminSectionHeader
        eyebrow="Support and oversight"
        title="Contacts and Chat Oversight"
        subtitle="Moderate inbound support, inspect platform chat threads, and keep communication channels healthy."
      />

      <div className="tp-admin-tabs">
        <button type="button" className={tab === "contacts" ? "is-active" : ""} onClick={() => setTab("contacts")}>Contacts</button>
        <button type="button" className={tab === "chats" ? "is-active" : ""} onClick={() => setTab("chats")}>Chat oversight</button>
      </div>

      <AdminCard>
        <AdminToolbar
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder={tab === "contacts" ? "Search contacts and support messages" : "Search traveler, guide, or destination"}
          filters={
            <>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                {(tab === "contacts" ? CONTACT_STATUSES : ["pending", "accepted", "active", "completed", "cancelled"]).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select value={ordering} onChange={(event) => setOrdering(event.target.value)}>
                <option value="-created_at">Newest first</option>
                <option value="created_at">Oldest first</option>
                {tab === "chats" ? <option value="-updated_at">Latest activity</option> : null}
              </select>
            </>
          }
        />
        {error ? <div className="tp-admin-inline-error">{error}</div> : null}
        {loading ? <AdminLoadingSkeleton /> : null}
        {!loading && rows.length === 0 ? <AdminEmptyState title="Nothing to review" description="This queue is currently empty." /> : null}

        {!loading && rows.length > 0 && tab === "contacts" ? (
          <>
            <AdminTableMeta pagination={data.pagination} label="Support inbox" />
            <div className="tp-admin-table-wrap">
              <table className="tp-admin-table">
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button type="button" className="tp-admin-row-link" onClick={() => setDrawerContent({ contact: row })}>
                          <strong>{row.name}</strong>
                          <span>{row.email}</span>
                        </button>
                      </td>
                      <td>{row.subject}</td>
                      <td>
                        <select value={row.status} onChange={(event) => handleContactStatus(row, event.target.value)}>
                          {CONTACT_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
                        </select>
                      </td>
                      <td>{formatDate(row.created_at, true)}</td>
                      <td>
                        <div className="tp-admin-row-actions">
                          <button type="button" className="tp-admin-icon-btn" onClick={() => setDrawerContent({ contact: row })}><Eye size={16} /></button>
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

        {!loading && rows.length > 0 && tab === "chats" ? (
          <>
            <AdminTableMeta pagination={data.pagination} label="Chat oversight threads" />
            <div className="tp-admin-table-wrap">
              <table className="tp-admin-table">
                <thead>
                  <tr>
                    <th>Thread</th>
                    <th>Status</th>
                    <th>Dates</th>
                    <th>Messages</th>
                    <th>Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.booking_id}>
                      <td>
                        <button type="button" className="tp-admin-row-link" onClick={() => openChatThread(row.booking_id)}>
                          <strong>{row.destination}</strong>
                          <span>{row.traveler_name} with {row.guide_name}</span>
                        </button>
                      </td>
                      <td><AdminStatusBadge tone={row.status}>{row.status}</AdminStatusBadge></td>
                      <td>{formatDate(row.trip_start)} - {formatDate(row.trip_end)}</td>
                      <td>{row.message_count}</td>
                      <td>{formatDate(row.last_message_at, true)}</td>
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
        open={Boolean(drawerContent)}
        title={drawerContent?.contact ? drawerContent.contact.subject : drawerContent?.thread?.destination || "Details"}
        subtitle={drawerContent?.contact ? drawerContent.contact.email : drawerContent?.thread ? `${drawerContent.thread.traveler_name} with ${drawerContent.thread.guide_name}` : ""}
        onClose={() => setDrawerContent(null)}
      >
        {drawerContent?.contact ? (
          <div className="tp-admin-detail-grid">
            <Detail label="Name" value={drawerContent.contact.name} />
            <Detail label="Phone" value={drawerContent.contact.phone} />
            <Detail label="Status" value={drawerContent.contact.status} />
            <Detail label="Received" value={formatDate(drawerContent.contact.created_at, true)} />
            <Detail label="Message" value={drawerContent.contact.message} full />
          </div>
        ) : null}

        {drawerContent?.thread ? (
          <div className="tp-admin-chat-thread">
            {(drawerContent.messages || []).map((message) => (
              <div key={message.id} className={`tp-admin-chat-message is-${message.sender_role}`}>
                <strong>{message.sender_name}</strong>
                <p>{message.message}</p>
                <span>{formatDate(message.created_at, true)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete contact submission"
        message="Delete this support/contact record permanently?"
        confirmLabel="Delete contact"
        onCancel={() => setConfirm(null)}
        onConfirm={handleDeleteContact}
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
