import { useState, useEffect } from "react";
import API from "../services/api";

export default function AccountantDashboard() {
  const [stats, setStats] = useState(null);
  const [unbilled, setUnbilled] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allRequests, setAllRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("INTAKE");
  const [showGenModal, setShowGenModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [modalType, setModalType] = useState("FINAL"); // FINAL or PROFORMA
  const [invForm, setInvForm] = useState({ amount: "", due_date: "", notes: "" });

  const fetchData = async () => {
    try {
      const [s, u, i, r] = await Promise.all([
        API.get("/api/accountant/stats"),
        API.get("/api/accountant/unbilled"),
        API.get("/api/accountant/invoices"),
        API.get("/api/requests/lab")
      ]);
      setStats(s.data.data);
      setUnbilled(u.data.data);
      setInvoices(i.data.data);
      setAllRequests(r.data.data);
    } catch (err) {
      console.error("Finance load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleGenInvoice = async (e) => {
    e.preventDefault();
    try {
        const endpoint = modalType === 'PROFORMA' ? "/api/accountant/pro-forma" : "/api/accountant/invoices";
        await API.post(endpoint, {
            test_request_id: selectedReq.id,
            ...invForm
        });
        setShowGenModal(false);
        fetchData();
        alert(`${modalType} Invoice issued successfully!`);
    } catch (err) { alert("Generation failed"); }
  };

  const handleSettle = async (id) => {
      if(!confirm("Confirm payment receipt and settle this invoice?")) return;
      try {
          await API.patch(`/api/accountant/invoices/${id}/settle`);
          fetchData();
      } catch (err) { alert("Settle failed"); }
  };

  if (loading) return <div className="p-10 text-center text-muted">Loading Financial Intelligence...</div>;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-gradient">Financial Management & Revenue Assurance</h2>
        <p className="text-muted">Manage billings, issue invoices, and reconcile payments for the laboratory.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-6 border-l-4 border-green-500">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Collected</div>
              <div className="text-2xl font-black text-green-600">${stats.total_collected.toLocaleString()}</div>
          </div>
          <div className="glass-panel p-6 border-l-4 border-amber-500">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Accounts Receivable</div>
              <div className="text-2xl font-black text-amber-600">${stats.total_receivable.toLocaleString()}</div>
              <div className="text-[9px] text-muted">{stats.pending_invoices} Pending Invoices</div>
          </div>
          <div className="glass-panel p-6 border-l-4 border-blue-500">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Unbilled Requests</div>
              <div className="text-2xl font-black text-blue-600">{stats.unbilled_requests}</div>
              <div className="text-[9px] text-muted">Revenue potential detected</div>
          </div>
          <div className="glass-panel p-6 border-l-4 border-slate-400">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Tax Liability (Est)</div>
              <div className="text-2xl font-black text-slate-700">${(stats.total_collected * 0.16).toLocaleString()}</div>
          </div>
      </div>

      <div className="tab-bar mb-6">
          <button className={`tab-btn ${activeTab === 'INTAKE' ? 'active' : ''}`} onClick={() => setActiveTab('INTAKE')}>Intake Monitor ({allRequests.length})</button>
          <button className={`tab-btn ${activeTab === 'UNBILLED' ? 'active' : ''}`} onClick={() => setActiveTab('UNBILLED')}>Ready to Bill ({unbilled.length})</button>
          <button className={`tab-btn ${activeTab === 'LEDGER' ? 'active' : ''}`} onClick={() => setActiveTab('LEDGER')}>Financial Ledger ({invoices.length})</button>
      </div>

      {activeTab === 'INTAKE' && (
          <div className="glass-panel p-0 overflow-hidden">
              <table className="data-table">
                  <thead>
                      <tr>
                          <th>Order Date</th>
                          <th>Client</th>
                          <th>Technical Status</th>
                          <th>Financial Signal</th>
                          <th>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {allRequests.map(req => (
                          <tr key={req.id}>
                              <td className="text-xs">{new Date(req.created_at).toLocaleDateString()}</td>
                              <td className="font-bold">{req.company_name}</td>
                              <td><span className="pill pill-secondary">{req.status}</span></td>
                              <td>
                                  {req.latest_invoice_status === 'PAID' ? 
                                      <span className="text-green-500 text-xs font-bold">✓ Payment Cleared</span> :
                                      <span className="text-amber-500 text-xs font-bold">⚠️ Awaiting Settlement</span>
                                  }
                              </td>
                              <td>
                                  {!req.latest_invoice_status && (
                                      <button className="btn-sm bg-indigo-500 text-white py-1" onClick={() => { setSelectedReq(req); setModalType('PROFORMA'); setShowGenModal(true); }}>
                                          Issue Pro-forma
                                      </button>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'UNBILLED' && (
          <div className="glass-panel p-0 overflow-hidden">
              <table className="data-table">
                  <thead>
                      <tr>
                          <th>Order ID</th>
                          <th>Partner Client</th>
                          <th>Test Description</th>
                          <th>Completion Date</th>
                          <th>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {unbilled.map(req => (
                          <tr key={req.id}>
                              <td className="font-mono text-xs text-muted">#{req.id}</td>
                              <td className="font-bold">{req.company_name}</td>
                              <td className="text-sm">{req.test_description}</td>
                              <td className="text-xs text-muted">{new Date(req.created_at).toLocaleDateString()}</td>
                              <td>
                                  <button className="btn-sm btn-primary py-1" onClick={() => { setSelectedReq(req); setShowGenModal(true); }}>
                                      Generate Invoice
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {unbilled.length === 0 && <tr><td colSpan="5" className="text-center py-10 text-muted">All requests are currently billed.</td></tr>}
                  </tbody>
              </table>
          </div>
      )}

      {activeTab === 'LEDGER' && (
          <div className="glass-panel p-0 overflow-hidden">
              <table className="data-table">
                  <thead>
                      <tr>
                          <th>Invoice #</th>
                          <th>Client</th>
                          <th>Amount</th>
                          <th>Due Date</th>
                          <th>Status</th>
                          <th>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {invoices.map(inv => (
                          <tr key={inv.id}>
                              <td className="font-mono text-xs font-bold text-blue-600">{inv.invoice_number}</td>
                              <td className="text-sm">{inv.company_name}</td>
                              <td className="font-bold">${inv.amount.toLocaleString()}</td>
                              <td className="text-xs">{new Date(inv.due_date).toLocaleDateString()}</td>
                              <td>
                                  <span className={`pill ${inv.status === 'PAID' ? 'pill-paid' : 'pill-unpaid'}`}>
                                      {inv.status}
                                  </span>
                              </td>
                              <td>
                                  {inv.status === 'UNPAID' && (
                                      <button className="btn-sm btn-success py-1" onClick={() => handleSettle(inv.id)}>
                                          ✓ Settle
                                      </button>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {showGenModal && (
          <div className="modal-overlay">
              <div className="glass-panel w-full max-w-md">
                  <h3 className="mb-2">{modalType === 'PROFORMA' ? 'Issue Pro-forma Invoice' : 'Generate Professional Tax Invoice'}</h3>
                  <p className="text-xs text-muted mb-6">Issuing for: {selectedReq.company_name} - {selectedReq.test_description}</p>
                  
                  <form onSubmit={handleGenInvoice} className="space-y-4">
                      <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Invoice Amount ($) *</label>
                          <input required type="number" step="0.01" className="w-full p-2 border rounded" value={invForm.amount} onChange={e => setInvForm({...invForm, amount: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Payment Due Date *</label>
                          <input required type="date" className="w-full p-2 border rounded" value={invForm.due_date} onChange={e => setInvForm({...invForm, due_date: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Internal Billing Notes</label>
                          <textarea className="w-full p-2 border rounded text-xs" rows="3" value={invForm.notes} onChange={e => setInvForm({...invForm, notes: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                          <button type="button" className="btn-secondary" onClick={() => { setShowGenModal(false); setModalType('FINAL'); }}>Cancel</button>
                          <button type="submit" className="btn-primary">{modalType === 'PROFORMA' ? 'Issue Pro-forma →' : 'Issue Tax Invoice →'}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
