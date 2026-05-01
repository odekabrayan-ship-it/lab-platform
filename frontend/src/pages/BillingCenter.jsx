import { useState, useEffect } from "react";
import API from "../services/api";

const statusOrder = { UNPAID: 0, DISPUTED: 1, PAID: 2, CANCELLED: 3 };
const pillClass = (s) => `pill pill-${s.toLowerCase()}`;

function statusLabel(s) {
  const map = { UNPAID: 'Unpaid', PAID: 'Paid', DISPUTED: 'Disputed', CANCELLED: 'Cancelled' };
  return map[s] || s;
}

export default function BillingCenter() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isLab = user.role === "lab";
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [raiseForm, setRaiseForm] = useState({
    test_request_id: "", amount: "", currency: "USD",
    description: "", due_date: "", notes: ""
  });
  const [raising, setRaising] = useState(false);

  const fetchInvoices = async () => {
    try {
      const res = await API.get("/api/invoices/my");
      setInvoices(res.data.data);
    } catch (err) {
      console.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (!isLab) return;
    try {
      const res = await API.get("/api/requests/lab");
      // Only completed requests without invoices
      setRequests(res.data.data.filter(r => r.status === 'completed'));
    } catch (err) {
      console.error("Failed to fetch requests");
    }
  };

  useEffect(() => { fetchInvoices(); fetchRequests(); }, []);

  const handlePay = async (id) => {
    if (!confirm("Mark this invoice as paid?")) return;
    try {
      await API.patch(`/api/invoices/${id}/pay`);
      setInvoices(inv => inv.map(i => i.id === id ? { ...i, status: 'PAID' } : i));
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    }
  };

  const handleDispute = async (id) => {
    if (!confirm("Dispute this invoice? The laboratory will be notified.")) return;
    try {
      await API.patch(`/api/invoices/${id}/dispute`);
      setInvoices(inv => inv.map(i => i.id === id ? { ...i, status: 'DISPUTED' } : i));
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    }
  };

  const handleCancel = async (id) => {
    if (!confirm("Cancel this invoice?")) return;
    try {
      await API.patch(`/api/invoices/${id}/cancel`);
      setInvoices(inv => inv.map(i => i.id === id ? { ...i, status: 'CANCELLED' } : i));
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    }
  };

  const handleRaise = async (e) => {
    e.preventDefault();
    setRaising(true);
    try {
      await API.post("/api/invoices", raiseForm);
      alert("Invoice raised and client notified.");
      setShowRaiseModal(false);
      setRaiseForm({ test_request_id: "", amount: "", currency: "USD", description: "", due_date: "", notes: "" });
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to raise invoice");
    } finally {
      setRaising(false);
    }
  };

  const filtered = filterStatus === "ALL" ? invoices : invoices.filter(i => i.status === filterStatus);

  // Summary stats
  const totalOutstanding = invoices.filter(i => i.status === 'UNPAID').reduce((s, i) => s + i.amount, 0);
  const totalPaid        = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
  const disputedCount    = invoices.filter(i => i.status === 'DISPUTED').length;
  const currency         = invoices[0]?.currency || 'USD';

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 className="text-gradient" style={{ margin: 0 }}>Billing Center</h2>
          <p className="text-muted" style={{ marginTop: 6 }}>
            {isLab ? "Manage invoices issued to your clients." : "View and manage invoices from your laboratory partners."}
          </p>
        </div>
        {isLab && (
          <button className="btn-primary" style={{ padding: '10px 20px' }} onClick={() => setShowRaiseModal(true)}>
            ➕ Raise Invoice
          </button>
        )}
      </div>

      {/* Balance Summary Widget */}
      <div className="balance-widget">
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
            {isLab ? "Total Invoiced" : "Outstanding Balance"}
          </div>
          <div className="balance-amount">
            {isLab ? `${currency} ${(totalOutstanding + totalPaid).toFixed(2)}` : `${currency} ${totalOutstanding.toFixed(2)}`}
          </div>
          <div className="balance-sub">
            {isLab
              ? `${invoices.filter(i => i.status === 'PAID').length} paid · ${invoices.filter(i => i.status === 'UNPAID').length} pending`
              : `${invoices.filter(i => i.status === 'UNPAID').length} invoice(s) awaiting payment`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{currency} {totalPaid.toFixed(2)}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Paid</div>
          </div>
          {disputedCount > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fca5a5' }}>{disputedCount}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Disputed</div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tab-bar">
        {["ALL", "UNPAID", "PAID", "DISPUTED", "CANCELLED"].map(s => (
          <button key={s} className={`tab-btn${filterStatus === s ? ' active' : ''}`} onClick={() => setFilterStatus(s)}>
            {s === "ALL" ? "All" : statusLabel(s)}
            <span style={{ marginLeft: 6, background: s === 'UNPAID' ? '#fef3c7' : '#f1f5f9', color: '#64748b', borderRadius: 99, padding: '1px 6px', fontSize: 11 }}>
              {s === "ALL" ? invoices.length : invoices.filter(i => i.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Invoice Table */}
      {loading ? (
        <p className="text-muted">Loading invoices...</p>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
          <h3 style={{ fontWeight: 700 }}>No invoices found</h3>
          <p className="text-muted">{filterStatus === "ALL" ? "No invoices have been issued yet." : `No ${statusLabel(filterStatus).toLowerCase()} invoices.`}</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>PO Number</th>
                <th>{isLab ? "Client" : "Laboratory"}</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td className="font-mono text-sm text-primary font-semibold">{inv.invoice_number}</td>
                  <td className="text-xs font-bold" style={{ color: '#64748b' }}>{inv.po_number || "—"}</td>
                  <td className="font-semibold">{isLab ? inv.company_name : inv.lab_name}</td>
                  <td className="font-bold">{inv.currency} {parseFloat(inv.amount).toFixed(2)}</td>
                  <td className="text-sm">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                  <td><span className={pillClass(inv.status)}>{statusLabel(inv.status)}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {!isLab && inv.status === 'UNPAID' && (
                        <>
                          <button className="btn-sm btn-success" onClick={() => handlePay(inv.id)}>✓ Mark Paid</button>
                          <button className="btn-sm btn-danger" onClick={() => handleDispute(inv.id)}>⚠ Dispute</button>
                        </>
                      )}
                      {inv.status === 'PAID' && (
                        <button className="btn-sm" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }} 
                          onClick={() => alert("Simulating receipt download for " + inv.invoice_number)}>
                          📄 Receipt
                        </button>
                      )}
                      {isLab && inv.status !== 'PAID' && (
                        <button className="btn-sm" style={{ background: '#64748b', color: 'white' }} onClick={() => handleCancel(inv.id)}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Raise Invoice Modal (Lab only) */}
      {showRaiseModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ width: '100%', maxWidth: 520 }}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>💳 Raise Invoice</h3>
            <p className="text-muted text-sm" style={{ marginBottom: 24 }}>Issue a formal invoice to your client for a completed test request.</p>

            <form onSubmit={handleRaise}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Test Request <span className="required">*</span></label>
                <select required value={raiseForm.test_request_id} onChange={e => setRaiseForm({ ...raiseForm, test_request_id: e.target.value })}>
                  <option value="">— Select completed request —</option>
                  {requests.map(r => (
                    <option key={r.id} value={r.id}>#{r.id} — {r.company_name} — {r.test_description?.substring(0, 50)}</option>
                  ))}
                </select>
                {requests.length === 0 && <p className="text-xs text-muted" style={{ marginTop: 4 }}>No completed requests without invoices found.</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Amount <span className="required">*</span></label>
                  <input type="number" step="0.01" min="0.01" required value={raiseForm.amount} onChange={e => setRaiseForm({ ...raiseForm, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Currency</label>
                  <select value={raiseForm.currency} onChange={e => setRaiseForm({ ...raiseForm, currency: e.target.value })}>
                    {['USD', 'EUR', 'GBP', 'AED', 'SAR', 'EGP', 'KWD'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Description</label>
                <input value={raiseForm.description} onChange={e => setRaiseForm({ ...raiseForm, description: e.target.value })} placeholder="e.g. Water quality testing — Batch 2024-A" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Due Date</label>
                  <input type="date" value={raiseForm.due_date} onChange={e => setRaiseForm({ ...raiseForm, due_date: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Notes</label>
                  <input value={raiseForm.notes} onChange={e => setRaiseForm({ ...raiseForm, notes: e.target.value })} placeholder="Payment terms, bank details..." />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowRaiseModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={raising || requests.length === 0} style={{ padding: '10px 24px' }}>
                  {raising ? "Sending..." : "Issue Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
