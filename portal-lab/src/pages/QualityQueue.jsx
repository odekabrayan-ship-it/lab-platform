import { useState, useEffect } from "react";
import API from "../services/api";

export default function QualityQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [notes, setNotes] = useState("");

  const loadQueue = async () => {
    try {
      const res = await API.get("/api/quality/queue");
      setQueue(res.data.data);
    } catch (err) {
      console.error("Failed to load quality queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQueue(); }, []);

  const [category, setCategory] = useState("");

  const handleAction = async (id, status) => {
    if (status === 'rejected' && !category) {
        alert("ISO 17025 Requirement: You must categorize this non-conformance before rejection.");
        return;
    }
    try {
      await API.put(`/api/results/${id}/validate`, { status, notes, category });
      setReviewing(null);
      setNotes("");
      setCategory("");
      loadQueue();
      alert(`Result successfully ${status}${status === 'rejected' ? ' and Non-Conformance logged' : ''}`);
    } catch (err) { alert("Validation failed"); }
  };

  if (loading) return <div className="p-10 text-center text-muted">Loading Quality Oversight Queue...</div>;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-gradient">Technical Review & Quality Oversight</h2>
        <p className="text-muted">Perform technical review of bench results before release. ISO 17025 Compliance: Section 7.8.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
          {queue.length === 0 ? (
              <div className="glass-panel py-20 text-center opacity-50">
                  <div className="text-5xl mb-4">🛡️</div>
                  <p>The Quality Queue is clear. All technical results have been reviewed.</p>
              </div>
          ) : (
              <div className="glass-panel p-0 overflow-hidden">
                  <table className="data-table">
                      <thead>
                          <tr>
                              <th>Sample ID</th>
                              <th>Parameter</th>
                              <th>Result Value</th>
                              <th>Spec / Limit</th>
                              <th>Bench Tech</th>
                              <th>Actions</th>
                          </tr>
                      </thead>
                      <tbody>
                          {queue.map(item => (
                              <tr key={item.id}>
                                  <td>
                                      <div className="font-bold text-primary">{item.sample_code}</div>
                                      <div className="text-[10px] text-muted uppercase">{item.company_name}</div>
                                  </td>
                                  <td>
                                      <div className="font-medium">{item.parameter_name}</div>
                                      <div className="text-[9px] font-mono text-slate-400">{item.method_reference}</div>
                                  </td>
                                  <td>
                                      <span className={`font-black ${item.pass_fail === 'Fail' ? 'text-red-500' : 'text-green-600'}`}>
                                          {item.value} {item.unit}
                                      </span>
                                  </td>
                                  <td className="text-xs text-muted">{item.specification_limit || 'N/A'}</td>
                                  <td className="text-xs">{item.technician_email}</td>
                                  <td>
                                      <button className="btn-sm btn-primary py-1" onClick={() => setReviewing(item)}>
                                          Review Result
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}
      </div>

      {reviewing && (
          <div className="modal-overlay">
              <div className="glass-panel w-full max-w-md">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg">Technical Decision</h3>
                      <button className="text-muted" onClick={() => setReviewing(null)}>✕</button>
                  </div>
                  <div className="bg-slate-50 p-4 rounded border mb-6">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Parameter / Result</div>
                      <div className="text-sm font-bold">{reviewing.parameter_name}: {reviewing.value} {reviewing.unit}</div>
                      <div className="text-[10px] text-slate-500 mt-2">Method: {reviewing.method_reference}</div>
                      <div className="text-[10px] text-slate-500">Uncertainty: {reviewing.measurement_uncertainty || '-'}</div>
                  </div>

                  <div className="mb-4">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Failure Category (Required for Rejection)</label>
                      <select 
                        className="w-full p-2 border rounded text-xs bg-white"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                      >
                          <option value="">-- Select Category --</option>
                          <option value="Equipment Malfunction">Equipment Malfunction / Out of Calibration</option>
                          <option value="Technician Error">Technician Error / Competency Issue</option>
                          <option value="Reagent Contamination">Reagent Contamination / Expiry</option>
                          <option value="Method Deviation">Method Deviation / SOP Non-Compliance</option>
                          <option value="Sample Integrity">Sample Integrity Issue (Internal)</option>
                          <option value="Data Entry Error">Transcription / Data Entry Error</option>
                      </select>
                  </div>

                  <div className="mb-6">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Reviewer's Notes / Corrective Action Instructions</label>
                      <textarea className="w-full p-2 border rounded text-xs" rows="3" placeholder="Describe the failure and instructions for the bench..." value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                      <button className="btn-success py-3 font-bold" onClick={() => handleAction(reviewing.id, 'validated')}>
                          ✓ Validate & Authorize
                      </button>
                      <button className="btn-danger py-3 font-bold" onClick={() => handleAction(reviewing.id, 'rejected')}>
                          ✕ Reject (Retest)
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
