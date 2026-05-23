import { useState, useEffect } from "react";
import API from "../services/api";

export default function QualityOversight() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await API.get("/api/results/all-audit"); // Need to create this endpoint
      setLogs(res.data.data);
    } catch (err) {
      console.error("Failed to fetch quality logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h2 className="text-gradient" style={{ margin: 0 }}>🛡️ Quality Oversight & CAPA Log</h2>
        <p className="text-muted" style={{ marginTop: 6 }}>
          Centralized monitoring of all result amendments, re-tests, and validation rejections.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Parameter</th>
              <th>Old Value</th>
              <th>New Value</th>
              <th>Reason (CAPA)</th>
              <th>Performed By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>Loading audit trail...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No quality events recorded.</td></tr>
            ) : logs.map(l => (
              <tr key={l.id}>
                <td className="text-xs text-muted">{new Date(l.timestamp).toLocaleString()}</td>
                <td>
                  <span className={`pill ${l.action === 'amended' ? 'pill-review' : 'pill-open'}`}>
                    {l.action.toUpperCase()}
                  </span>
                </td>
                <td className="font-bold">{l.parameter_name}</td>
                <td className="text-sm text-muted" style={{ textDecoration: 'line-through' }}>{l.old_value || '—'}</td>
                <td className="text-sm font-bold text-primary">{l.new_value || '—'}</td>
                <td style={{ maxWidth: 250, fontSize: 12 }}>
                  <div style={{ fontStyle: 'italic', color: '#92400e' }}>
                    {l.amendment_reason || 'No reason provided'}
                  </div>
                </td>
                <td className="text-xs">{l.performer_email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
