import { useState, useEffect } from "react";
import API from "../services/api";

export default function QuoteManager() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isLab = user.role === "lab";
  
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [engagements, setEngagements] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [issueModal, setIssueModal] = useState(null);
  
  const [requestForm, setRequestForm] = useState({ engagement_id: "", description: "" });
  const [issueForm, setIssueForm] = useState({ amount: "", valid_until: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchQuotes = async () => {
    try {
      const endpoint = isLab ? "/api/quotes/lab" : "/api/quotes/my";
      const res = await API.get(endpoint);
      setQuotes(res.data.data);
    } catch (err) {
      console.error("Failed to fetch quotes");
    } finally {
      setLoading(false);
    }
  };

  const fetchEngagements = async () => {
    if (isLab) return;
    try {
      const res = await API.get("/api/engagements/active");
      setEngagements(res.data.data);
    } catch (err) {
      console.error("Failed to fetch active partners");
    }
  };

  useEffect(() => {
    fetchQuotes();
    fetchEngagements();
  }, []);

  const handleRequestQuote = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post("/api/quotes", requestForm);
      alert("Quote request sent! The laboratory will review and issue an estimate.");
      setShowRequestModal(false);
      setRequestForm({ engagement_id: "", description: "" });
      fetchQuotes();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to request quote");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueQuote = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.patch(`/api/quotes/${issueModal.id}/issue`, issueForm);
      alert("Quote issued successfully.");
      setIssueModal(null);
      setIssueForm({ amount: "", valid_until: "", notes: "" });
      fetchQuotes();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to issue quote");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptQuote = async (id) => {
    if (!confirm("Are you sure you want to accept this quote? This will move the project to procurement.")) return;
    try {
      await API.patch(`/api/quotes/${id}/accept`);
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: 'ACCEPTED' } : q));
    } catch (err) {
      alert("Failed to accept quote");
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 className="text-gradient" style={{ margin: 0 }}>💼 Quoting & Procurement</h2>
          <p className="text-muted" style={{ marginTop: 6 }}>
            {isLab 
              ? "Manage incoming quote requests and issue formal estimates." 
              : "Request cost estimates and manage project budgets before formalizing test requests."}
          </p>
        </div>
        {!isLab && (
          <button className="btn-primary" onClick={() => setShowRequestModal(true)}>
            📝 Request New Quote
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{isLab ? "Client" : "Laboratory"}</th>
              <th>Description</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Valid Until</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : quotes.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No quotes found.</td></tr>
            ) : quotes.map(q => (
              <tr key={q.id}>
                <td style={{ fontWeight: 600 }}>{isLab ? q.company_name : q.lab_name}</td>
                <td style={{ fontSize: 13, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {q.description}
                </td>
                <td>
                  <span className={`pill ${
                    q.status === 'PENDING' ? 'pill-review' : 
                    q.status === 'ISSUED' ? 'pill-open' : 
                    q.status === 'ACCEPTED' ? 'pill-paid' : 'pill-closed'
                  }`}>
                    {q.status}
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>
                  {q.amount ? `${q.amount} USD` : "—"}
                </td>
                <td className="text-muted">
                  {q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "—"}
                </td>
                <td>
                  {isLab && q.status === 'PENDING' && (
                    <button className="btn-sm btn-primary" onClick={() => setIssueModal(q)}>Issue Quote</button>
                  )}
                  {!isLab && q.status === 'ISSUED' && (
                    <button className="btn-sm btn-success" onClick={() => handleAcceptQuote(q.id)}>Accept</button>
                  )}
                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
                    {new Date(q.created_at).toLocaleDateString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Request Quote Modal */}
      {showRequestModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: 500 }}>
            <h3 style={{ margin: '0 0 16px' }}>Request a Quote</h3>
            <form onSubmit={handleRequestQuote}>
              <div className="form-group mb-4">
                <label>Select Partner <span className="required">*</span></label>
                <select required value={requestForm.engagement_id} onChange={e => setRequestForm({...requestForm, engagement_id: e.target.value})}>
                  <option value="">-- Choose Laboratory --</option>
                  {engagements.map(e => <option key={e.id} value={e.id}>{e.lab_name}</option>)}
                </select>
              </div>
              <div className="form-group mb-6">
                <label>Project / Test Description <span className="required">*</span></label>
                <textarea 
                  required 
                  rows={4} 
                  placeholder="What do you need quoted? Include sample counts, parameters, and timelines..."
                  value={requestForm.description}
                  onChange={e => setRequestForm({...requestForm, description: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>Send Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Quote Modal (Lab) */}
      {issueModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: 450 }}>
            <h3 style={{ margin: '0 0 4px' }}>Issue Formal Quote</h3>
            <p className="text-sm text-muted mb-6">For: {issueModal.description.substring(0, 40)}...</p>
            <form onSubmit={handleIssueQuote}>
              <div className="form-group mb-4">
                <label>Total Amount (USD) <span className="required">*</span></label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={issueForm.amount}
                  onChange={e => setIssueForm({...issueForm, amount: e.target.value})}
                />
              </div>
              <div className="form-group mb-4">
                <label>Validity Date <span className="required">*</span></label>
                <input 
                  type="date" 
                  required 
                  value={issueForm.valid_until}
                  onChange={e => setIssueForm({...issueForm, valid_until: e.target.value})}
                />
              </div>
              <div className="form-group mb-6">
                <label>Internal Notes / Breakdown</label>
                <textarea 
                  rows={3}
                  value={issueForm.notes}
                  onChange={e => setIssueForm({...issueForm, notes: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setIssueModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>Issue Estimate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
