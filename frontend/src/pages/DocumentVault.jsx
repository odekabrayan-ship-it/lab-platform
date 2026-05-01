import { useState, useEffect } from "react";
import API from "../services/api";

export default function DocumentVault() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLab, setFilterLab] = useState("ALL");
  const [filterResult, setFilterResult] = useState("ALL"); // ALL | PASS | FAIL | MIXED
  const [filterYear, setFilterYear] = useState("ALL");
  const [selectedReports, setSelectedReports] = useState([]);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isClient = user.role === "client";

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get("/api/reports/my/list");
        setReports(res.data.data);
      } catch (err) {
        console.error("Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDownload = async (id, reportNumber) => {
    try {
      const res = await API.get(`/api/reports/${id}/download`);
      const { file_url } = res.data.data;
      window.open(`http://localhost:3000${file_url}`, "_blank");
    } catch (err) {
      alert(err.response?.data?.message || "Download failed");
    }
  };

  // Derive filter options
  const labOptions = [...new Set(reports.map(r => isClient ? r.lab_name : r.company_name))].sort();
  const yearOptions = [...new Set(reports.map(r => new Date(r.created_at).getFullYear().toString()))].sort().reverse();

  // Apply filters
  const filtered = reports.filter(r => {
    const nameField = isClient ? r.lab_name : r.company_name;
    const matchSearch =
      !search ||
      r.report_number?.toLowerCase().includes(search.toLowerCase()) ||
      nameField?.toLowerCase().includes(search.toLowerCase()) ||
      r.test_description?.toLowerCase().includes(search.toLowerCase()) ||
      r.batch_number?.toLowerCase().includes(search.toLowerCase()) ||
      r.po_number?.toLowerCase().includes(search.toLowerCase());

    const matchLab = filterLab === "ALL" || nameField === filterLab;
    const matchYear = filterYear === "ALL" || new Date(r.created_at).getFullYear().toString() === filterYear;
    const matchResult = (() => {
      if (filterResult === "ALL") return true;
      const pass = r.pass_count || 0;
      const fail = r.fail_count || 0;
      if (filterResult === "PASS")  return pass > 0 && fail === 0;
      if (filterResult === "FAIL")  return fail > 0 && pass === 0;
      if (filterResult === "MIXED") return pass > 0 && fail > 0;
      return true;
    })();

    return matchSearch && matchLab && matchYear && matchResult;
  });

  const totalReports = reports.length;
  const allPassReports = reports.filter(r => (r.fail_count || 0) === 0 && (r.pass_count || 0) > 0).length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 className="text-gradient" style={{ margin: 0 }}>📁 Document Vault</h2>
          <p className="text-muted" style={{ marginTop: 6 }}>
            Secure archive of all official test reports and Certificates of Analysis.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedReports.length > 0 && (
            <button 
              className="btn-primary" 
              style={{ background: '#059669', padding: '8px 16px', fontSize: 13 }}
              onClick={() => alert(`📦 Preparing Compliance Export for ${selectedReports.length} reports...\nThis action logs a formal 'Audit Export' in the compliance trail.`)}
            >
              📥 Compliance Export ({selectedReports.length})
            </button>
          )}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}>
            <strong style={{ color: '#166534' }}>{totalReports}</strong>
            <span style={{ color: '#64748b' }}> total reports</span>
          </div>
          {totalReports > 0 && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}>
              <strong style={{ color: '#1e40af' }}>{Math.round((allPassReports / totalReports) * 100)}%</strong>
              <span style={{ color: '#64748b' }}> all-pass reports</span>
            </div>
          )}
        </div>
      </div>

      {/* ISO Compliance Note */}
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>🔒</span>
        <p style={{ margin: 0, fontSize: 13, color: '#0369a1' }}>
          <strong>ISO/IEC 17025 Compliance:</strong> All reports are immutable official records. Each download is logged in the system audit trail for traceability.
        </p>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, marginBottom: 24, alignItems: 'end' }}>
        <div>
          <input
            placeholder="🔍 Search by Report #, Lab, Batch, PO, or Description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filterLab} onChange={e => setFilterLab(e.target.value)}>
          <option value="ALL">All {isClient ? "Labs" : "Clients"}</option>
          {labOptions.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={filterResult} onChange={e => setFilterResult(e.target.value)}>
          <option value="ALL">All Results</option>
          <option value="PASS">All Pass ✅</option>
          <option value="FAIL">Has Failures ❌</option>
          <option value="MIXED">Mixed ⚠️</option>
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="ALL">All Years</option>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Results count */}
      {!loading && (
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
          Showing <strong>{filtered.length}</strong> of <strong>{totalReports}</strong> report(s)
          {(search || filterLab !== 'ALL' || filterResult !== 'ALL' || filterYear !== 'ALL') && (
            <button onClick={() => { setSearch(''); setFilterLab('ALL'); setFilterResult('ALL'); setFilterYear('ALL'); }}
              style={{ marginLeft: 8, fontSize: 12, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              Clear filters
            </button>
          )}
        </p>
      )}

      {/* Vault Grid */}
      {loading ? (
        <div className="vault-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="vault-card">
              <div className="skeleton-cell" style={{ height: 14, width: '60%' }} />
              <div className="skeleton-cell" style={{ height: 20, width: '80%' }} />
              <div className="skeleton-cell" style={{ height: 12, width: '40%' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
          <h3 style={{ fontWeight: 700, margin: '0 0 8px' }}>
            {totalReports === 0 ? "No Reports Yet" : "No Reports Match Your Filters"}
          </h3>
          <p className="text-muted" style={{ maxWidth: 400, margin: '0 auto' }}>
            {totalReports === 0
              ? "Official reports will appear here once laboratories generate them for your completed test requests."
              : "Try adjusting your search criteria or clearing the filters."}
          </p>
        </div>
      ) : (
        <div className="vault-grid">
          {filtered.map(r => {
            const nameField = isClient ? r.lab_name : r.company_name;
            const pass = r.pass_count || 0;
            const fail = r.fail_count || 0;
            const samples = r.sample_count || 0;
            const hasPass = pass > 0;
            const hasFail = fail > 0;
            const allPass = hasPass && !hasFail;
            const allFail = hasFail && !hasPass;

            return (
              <div key={r.id} className="vault-card">
                {/* Report header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedReports.includes(r.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedReports([...selectedReports, r.id]);
                        else setSelectedReports(selectedReports.filter(id => id !== r.id));
                      }}
                      style={{ width: 16, height: 16 }}
                    />
                    <div className="vault-report-num">{r.report_number}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase',
                    background: r.status === 'delivered' ? '#dcfce7' : '#fef9c3',
                    color: r.status === 'delivered' ? '#166534' : '#92400e'
                  }}>{r.status}</span>
                </div>

                {/* Lab / Client name */}
                <div className="vault-lab">
                  {nameField}
                  {r.batch_number && <span style={{ marginLeft: 8, fontSize: 11, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#475569' }}>Batch: {r.batch_number}</span>}
                </div>

                {/* Test description */}
                <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.4 }}>
                  {r.test_description?.length > 80 ? r.test_description.substring(0, 80) + '...' : r.test_description || '—'}
                </p>

                {/* Pass/Fail badges */}
                <div className="vault-badges">
                  {allPass && <span className="pass-badge">✅ All Pass ({pass})</span>}
                  {allFail && <span className="fail-badge">❌ All Fail ({fail})</span>}
                  {hasPass && hasFail && (
                    <>
                      <span className="pass-badge">✅ {pass} Pass</span>
                      <span className="fail-badge">❌ {fail} Fail</span>
                    </>
                  )}
                  {!hasPass && !hasFail && (
                    <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>No result summary</span>
                  )}
                  {samples > 0 && (
                    <span style={{ background: '#eff6ff', color: '#1e40af', fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
                      🧪 {samples} sample{samples > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="vault-meta">
                  📅 Issued: {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>

                {/* Download & Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, padding: '10px', fontSize: 13 }}
                    onClick={() => handleDownload(r.id, r.report_number)}
                  >
                    📥 Download (PDF)
                  </button>
                  {isClient && (
                    <button
                      className="btn-secondary"
                      style={{ padding: '10px', fontSize: 13, background: '#fee2e2', color: '#991b1b', border: 'none' }}
                      onClick={() => window.location.href = `/disputes?request=${r.test_request_id}&report=${r.id}`}
                    >
                      ⚖️ Dispute
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
