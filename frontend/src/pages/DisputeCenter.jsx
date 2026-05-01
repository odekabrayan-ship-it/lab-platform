import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../services/api";

const disputeTypes = [
  { value: 'RESULT_CHALLENGE', label: '🔬 Challenge a Test Result', desc: 'You believe a reported result is incorrect or unreliable.' },
  { value: 'RETEST_REQUEST',   label: '🔁 Request a Re-test',       desc: 'You require the same sample to be re-tested.' },
  { value: 'DELIVERY_DELAY',   label: '⏱ Report a Delivery Delay',  desc: 'The lab has not met the agreed turnaround time (SLA).' },
  { value: 'BILLING_DISPUTE',  label: '💳 Billing Dispute',          desc: 'You are challenging an invoice or payment issue.' },
];

const statusMap = {
  OPEN:         { label: 'Open',         pill: 'pill-open',     icon: '🔴' },
  UNDER_REVIEW: { label: 'Under Review', pill: 'pill-review',   icon: '🔵' },
  RESOLVED:     { label: 'Resolved',     pill: 'pill-resolved', icon: '🟢' },
  CLOSED:       { label: 'Closed',       pill: 'pill-closed',   icon: '⚫' },
};

function DisputeTypeBadge({ type }) {
  const icons = { RESULT_CHALLENGE: '🔬', RETEST_REQUEST: '🔁', DELIVERY_DELAY: '⏱', BILLING_DISPUTE: '💳' };
  const labels = { RESULT_CHALLENGE: 'Result Challenge', RETEST_REQUEST: 'Re-test Request', DELIVERY_DELAY: 'Delivery Delay', BILLING_DISPUTE: 'Billing Dispute' };
  return (
    <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
      {icons[type]} {labels[type] || type}
    </span>
  );
}

export default function DisputeCenter() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isLab = user.role === "lab";
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [raiseForm, setRaiseForm] = useState({ test_request_id: "", report_id: "", dispute_type: "", description: "" });
  const [resolveForm, setResolveForm] = useState({ resolution_notes: "", status: "RESOLVED" });
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const requestId = searchParams.get("request");
    const reportId = searchParams.get("report");
    if (requestId) {
      setRaiseForm(prev => ({ ...prev, test_request_id: requestId, report_id: reportId || "" }));
      setShowRaiseModal(true);
    }
  }, [searchParams]);

  const fetchDisputes = async () => {
    try {
      const endpoint = isLab ? "/api/disputes/lab" : "/api/disputes/my";
      const res = await API.get(endpoint);
      setDisputes(res.data.data);
    } catch (err) {
      console.error("Failed to fetch disputes");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (isLab) return;
    try {
      const res = await API.get("/api/requests/client");
      setMyRequests(res.data.data);
    } catch (err) {
      console.error("Failed to load requests");
    }
  };

  useEffect(() => { fetchDisputes(); fetchRequests(); }, []);

  const handleRaise = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post("/api/disputes", raiseForm);
      alert("✅ Dispute submitted. The laboratory has been notified.");
      setShowRaiseModal(false);
      setRaiseForm({ test_request_id: "", report_id: "", dispute_type: "", description: "" });
      fetchDisputes();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit dispute");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkUnderReview = async (id) => {
    try {
      await API.patch(`/api/disputes/${id}/review`);
      setDisputes(d => d.map(x => x.id === id ? { ...x, status: 'UNDER_REVIEW' } : x));
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.patch(`/api/disputes/${resolveModal.id}/resolve`, resolveForm);
      setDisputes(d => d.map(x => x.id === resolveModal.id ? { ...x, status: resolveForm.status, resolution_notes: resolveForm.resolution_notes } : x));
      setResolveModal(null);
      setResolveForm({ resolution_notes: "", status: "RESOLVED" });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to resolve");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = filterStatus === "ALL" ? disputes : disputes.filter(d => d.status === filterStatus);
  const openCount = disputes.filter(d => d.status === 'OPEN').length;
  const reviewCount = disputes.filter(d => d.status === 'UNDER_REVIEW').length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 className="text-gradient" style={{ margin: 0 }}>
            {isLab ? "Incoming Disputes" : "Disputes & Non-Conformance Center"}
          </h2>
          <p className="text-muted" style={{ marginTop: 6 }}>
            {isLab
              ? "Review and resolve disputes raised by your clients."
              : "Formally challenge results, request re-tests, or report delivery issues."}
          </p>
        </div>
        {!isLab && (
          <button className="btn-primary" style={{ padding: '10px 20px' }} onClick={() => setShowRaiseModal(true)}>
            ⚖️ Raise New Dispute
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Disputes', val: disputes.length, color: '#64748b', icon: '📋' },
          { label: 'Open',           val: openCount,       color: '#92400e', icon: '🔴' },
          { label: 'Under Review',   val: reviewCount,     color: '#1e40af', icon: '🔵' },
          { label: 'Resolved',       val: disputes.filter(d => d.status === 'RESOLVED').length, color: '#166534', icon: '🟢' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 24 }}>{c.icon}</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.val}</div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {["ALL", "OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"].map(s => (
          <button key={s} className={`tab-btn${filterStatus === s ? ' active' : ''}`} onClick={() => setFilterStatus(s)}>
            {s === "ALL" ? "All" : statusMap[s]?.label || s}
            <span style={{ marginLeft: 6, background: '#f1f5f9', color: '#64748b', borderRadius: 99, padding: '1px 6px', fontSize: 11 }}>
              {s === "ALL" ? disputes.length : disputes.filter(d => d.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Disputes List */}
      {loading ? (
        <p className="text-muted">Loading disputes...</p>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚖️</div>
          <h3 style={{ fontWeight: 700 }}>
            {filterStatus === "ALL" ? (isLab ? "No disputes raised against you" : "No disputes filed") : `No ${statusMap[filterStatus]?.label || filterStatus} disputes`}
          </h3>
          {!isLab && filterStatus === "ALL" && (
            <p className="text-muted" style={{ maxWidth: 360, margin: '8px auto 0' }}>
              If you believe a test result is incorrect or an SLA was breached, raise a formal dispute here.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(d => {
            const st = statusMap[d.status] || { label: d.status, pill: 'pill-open', icon: '?' };
            const isOpen = expandedId === d.id;
            return (
              <div key={d.id} style={{ background: 'white', border: `1px solid ${d.status === 'OPEN' ? '#fcd34d' : 'var(--border-color)'}`, borderRadius: 12, overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
                {/* Card Header */}
                <div
                  style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isOpen ? null : d.id)}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <span style={{ fontSize: 20 }}>{st.icon}</span>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <DisputeTypeBadge type={d.dispute_type} />
                        <span className={`pill ${st.pill}`}>{st.label}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                        {isLab ? `Client: ${d.company_name}` : `Lab: ${d.lab_name}`}
                        {' · '}Request #{d.test_request_id}
                        {' · '}<span style={{ color: '#94a3b8' }}>{new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isLab && d.status === 'OPEN' && (
                      <button className="btn-sm" style={{ background: '#1d4ed8', color: 'white' }}
                        onClick={e => { e.stopPropagation(); handleMarkUnderReview(d.id); }}>
                        Start Review
                      </button>
                    )}
                    {isLab && ['OPEN','UNDER_REVIEW'].includes(d.status) && (
                      <button className="btn-sm btn-success"
                        onClick={e => { e.stopPropagation(); setResolveModal(d); }}>
                        Resolve
                      </button>
                    )}
                    <span style={{ color: '#94a3b8', fontSize: 18 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border-color)', padding: '16px 20px', background: '#fafafa' }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', marginBottom: 4 }}>Test Description</div>
                      <p style={{ margin: 0, fontSize: 14 }}>{d.test_description}</p>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94a3b8', marginBottom: 4 }}>Dispute Description</div>
                      <p style={{ margin: 0, fontSize: 14, color: '#1e293b' }}>{d.description}</p>
                    </div>
                    {d.resolution_notes && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>✅ RESOLUTION NOTES</div>
                        <p style={{ margin: 0, fontSize: 13 }}>{d.resolution_notes}</p>
                        {d.resolved_by_email && (
                          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b' }}>Resolved by: {d.resolved_by_email} · {new Date(d.resolved_at).toLocaleString()}</p>
                        )}
                      </div>
                    )}
                    <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8' }}>
                      Raised by: {d.raised_by_email} · Filed: {new Date(d.created_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Raise Dispute Modal */}
      {showRaiseModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ width: '100%', maxWidth: 560 }}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>⚖️ Raise a Formal Dispute</h3>
            <p className="text-muted text-sm" style={{ marginBottom: 24 }}>
              This is a formal process. The laboratory will be notified and required to respond.
            </p>
            <form onSubmit={handleRaise}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Related Test Request <span className="required">*</span></label>
                <select required value={raiseForm.test_request_id} onChange={e => setRaiseForm({ ...raiseForm, test_request_id: e.target.value })}>
                  <option value="">— Select a test request —</option>
                  {myRequests.map(r => (
                    <option key={r.id} value={r.id}>#{r.id} — {r.lab_name} — {r.test_description?.substring(0, 40)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Dispute Type <span className="required">*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                  {disputeTypes.map(dt => (
                    <label key={dt.value} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
                      border: `2px solid ${raiseForm.dispute_type === dt.value ? 'var(--primary)' : 'var(--border-color)'}`,
                      borderRadius: 8, cursor: 'pointer', background: raiseForm.dispute_type === dt.value ? '#eff6ff' : 'white'
                    }}>
                      <input type="radio" name="dispute_type" value={dt.value}
                        checked={raiseForm.dispute_type === dt.value}
                        onChange={e => setRaiseForm({ ...raiseForm, dispute_type: e.target.value })}
                        style={{ width: 'auto', marginTop: 2 }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{dt.label}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{dt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label>Detailed Description <span className="required">*</span></label>
                <textarea required rows={4} placeholder="Please provide full details of the issue, including any reference values, dates, or specific parameters in question..."
                  value={raiseForm.description} onChange={e => setRaiseForm({ ...raiseForm, description: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowRaiseModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting || !raiseForm.dispute_type || !raiseForm.test_request_id} style={{ padding: '10px 24px' }}>
                  {submitting ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Dispute Modal (Lab) */}
      {resolveModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ width: '100%', maxWidth: 480 }}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>✅ Resolve Dispute</h3>
            <p className="text-muted text-sm" style={{ marginBottom: 20 }}>
              <DisputeTypeBadge type={resolveModal.dispute_type} /> — Request #{resolveModal.test_request_id}
            </p>
            <div style={{ background: '#fef9c3', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13 }}>
              <strong>Client's complaint:</strong> {resolveModal.description}
            </div>
            <form onSubmit={handleResolve}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Resolution Status</label>
                <select value={resolveForm.status} onChange={e => setResolveForm({ ...resolveForm, status: e.target.value })}>
                  <option value="RESOLVED">Resolved — Issue addressed</option>
                  <option value="CLOSED">Closed — No action required</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label>Resolution Notes <span className="required">*</span></label>
                <textarea required rows={4} placeholder="Explain the corrective action taken, the investigation findings, or the reason for closure..."
                  value={resolveForm.resolution_notes} onChange={e => setResolveForm({ ...resolveForm, resolution_notes: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-secondary" onClick={() => setResolveModal(null)}>Cancel</button>
                <button type="submit" className="btn-success" disabled={submitting} style={{ padding: '10px 24px' }}>
                  {submitting ? "Saving..." : "Submit Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
