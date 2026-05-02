import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../services/api";

// P1-3: Auto-compute Pass/Fail from spec limit string (ISO 17025 §7.8.3.1)
// Supports: "MAX 5.0", "MIN 2.0", "6.5 - 8.5", "< 10", "> 2"
export function computePassFail(value, specLimit) {
  if (!value || !specLimit) return "N/A";
  const val = parseFloat(value);
  if (isNaN(val)) return "N/A";
  const s = specLimit.trim();
  const maxMatch = s.match(/^(MAX|≤|<=|<)\s*([\d.]+)/i);
  if (maxMatch) return val <= parseFloat(maxMatch[2]) ? "Pass" : "Fail";
  const minMatch = s.match(/^(MIN|≥|>=|>)\s*([\d.]+)/i);
  if (minMatch) return val >= parseFloat(minMatch[2]) ? "Pass" : "Fail";
  const rangeMatch = s.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1]), hi = parseFloat(rangeMatch[2]);
    return (val >= lo && val <= hi) ? "Pass" : "Fail";
  }
  return "N/A";
}

export default function ResultEntry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sampleId = searchParams.get("sampleId");
  const requestId = searchParams.get("requestId");
  const sampleCode = searchParams.get("code") || `Sample #${sampleId}`;
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isClient = user.role === 'client';

  const emptyRow = () => ({
    parameter_name: "", value: "", unit: "", method_reference: "", measurement_uncertainty: "",
    specification_limit: "", pass_fail: "N/A", equipment_id: "",
    positive_control: "", negative_control: "", incubation_time: "", incubation_temp: "", reagent_lot: "",
    _mu_from_library: false  // track if MU was auto-filled
  });

  const [rows, setRows] = useState([emptyRow()]);
  const [existingResults, setExistingResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [equipment, setEquipment] = useState([]);
  // P1-4: Method library with MU data
  const [methods, setMethods] = useState([]);
  
  // Amendment Modal State
  const [amendingResult, setAmendingResult] = useState(null);
  const [amendForm, setAmendForm] = useState({ value: "", unit: "", method_reference: "", measurement_uncertainty: "", specification_limit: "", pass_fail: "N/A", equipment_id: "", positive_control: "", negative_control: "", incubation_time: "", incubation_temp: "", reagent_lot: "", amendment_reason: "" });

  const fetchResults = async () => {
    if (!sampleId) return;
    setLoading(true);
    try {
      const res = await API.get(`/api/results/sample/${sampleId}`);
      setExistingResults(res.data.data);
    } catch (err) {
      console.error("Failed to load results", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipment = async () => {
    if (isClient) return;
    try {
      const res = await API.get("/api/equipment");
      setEquipment(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch equipment");
    }
  };

  // P1-4: Fetch methods with MU library data
  const fetchMethods = async () => {
    if (isClient) return;
    try {
      const res = await API.get("/api/methods");
      setMethods(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch methods");
    }
  };

  useEffect(() => {
    fetchResults();
    fetchEquipment();
    fetchMethods();
  }, [sampleId]);

  const addRow = () => setRows([...rows, emptyRow()]);

  const removeRow = (idx) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, field, val) => {
    const updated = [...rows];
    updated[idx][field] = val;

    // P1-3: Auto-compute Pass/Fail when value or spec limit changes (ISO 17025 §7.8.3.1)
    if (field === 'value' || field === 'specification_limit') {
      const v = field === 'value' ? val : updated[idx].value;
      const s = field === 'specification_limit' ? val : updated[idx].specification_limit;
      updated[idx].pass_fail = computePassFail(v, s);
    }

    setRows(updated);
  };

  // P1-4: When method is selected, auto-populate MU from library (ISO 17025 §7.6)
  const handleMethodSelect = (idx, methodCode) => {
    const updated = [...rows];
    updated[idx].method_reference = methodCode;
    const method = methods.find(m => m.code === methodCode);
    if (method?.typical_mu) {
      updated[idx].measurement_uncertainty = method.typical_mu;
      updated[idx]._mu_from_library = true;
    } else {
      updated[idx]._mu_from_library = false;
    }
    setRows(updated);
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    const validRows = rows.filter(r => r.parameter_name.trim() && r.value.trim());
    if (validRows.length === 0) {
      alert("Please enter at least one parameter with a value");
      return;
    }

    // P1-3: Final pass/fail computation before saving
    const rowsWithPF = validRows.map(row => ({
      ...row,
      pass_fail: computePassFail(row.value, row.specification_limit) || row.pass_fail
    }));

    setSaving(true);
    try {
      for (const row of rowsWithPF) {
        const { _mu_from_library, ...data } = row; // strip internal tracking field
        await API.post("/api/results", {
          sample_id: parseInt(sampleId),
          ...data
        });
      }
      alert(`${rowsWithPF.length} result(s) saved as DRAFT`);
      setRows([emptyRow()]);
      fetchResults();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save results");
    } finally {
      setSaving(false);
    }
  };

  const draftResults = existingResults.filter(r => r.status === 'draft' || r.status === 'rejected');
  const validatedResults = existingResults.filter(r => r.status === 'validated');
  
  // Impartiality Check: Can this user validate?
  const makerCheckerConflict = draftResults.some(r => r.entered_by_email === user.email);

  const handleValidateAll = async () => {
    if (makerCheckerConflict) {
      alert("ISO 17025 Violation: You cannot validate results that you entered yourself. Another authorized user must review and validate them.");
      return;
    }
    if (!confirm("Validate all draft results? This action is IRREVERSIBLE. Validated results can only be modified via the formal Amendment workflow.")) return;
    try {
      const res = await API.put(`/api/results/validate/${sampleId}`);
      alert(`${res.data.data.validatedCount} result(s) validated and LOCKED.`);
      fetchResults();
    } catch (err) {
      alert(err.response?.data?.message || "Validation failed");
    }
  };

  const handleRejectAll = async (reason) => {
    try {
      await API.put(`/api/results/reject/${sampleId}`, { reason });
      alert("Draft results REJECTED. The technician has been notified.");
      fetchResults();
    } catch (err) {
      alert(err.response?.data?.message || "Rejection failed");
    }
  };

  const handleUpdateResult = async (resultId, updatedData) => {
    try {
      await API.put(`/api/results/${resultId}`, updatedData);
      fetchResults();
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    }
  };

  const openAmendModal = (r) => {
    setAmendingResult(r);
    setAmendForm({
      value: r.value || "",
      unit: r.unit || "",
      method_reference: r.method_reference || "",
      measurement_uncertainty: r.measurement_uncertainty || "",
      specification_limit: r.specification_limit || "",
      pass_fail: r.pass_fail || "N/A",
      equipment_id: r.equipment_id || "",
      positive_control: r.positive_control || "",
      negative_control: r.negative_control || "",
      incubation_time: r.incubation_time || "",
      incubation_temp: r.incubation_temp || "",
      reagent_lot: r.reagent_lot || "",
      amendment_reason: ""
    });
  };

  const handleAmendSubmit = async (e) => {
    e.preventDefault();
    if (!amendForm.amendment_reason.trim()) {
      alert("Amendment reason is required per ISO 17025.");
      return;
    }
    try {
      await API.post(`/api/results/${amendingResult.id}/amend`, amendForm);
      alert("Result successfully amended. Original result is superseded.");
      setAmendingResult(null);
      fetchResults();
    } catch (err) {
      alert(err.response?.data?.message || "Amendment failed");
    }
  };

  if (!sampleId) {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <div className="glass-panel text-center py-16">
          <span className="text-4xl mb-4 block opacity-50">📊</span>
          <h3 className="font-bold text-lg">No Sample Selected</h3>
          <p className="text-muted mt-2">Navigate to a sample's Manage Samples view and click "Enter Results" to begin.</p>
          <button className="btn-primary px-6 py-2 rounded-md mt-6" onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-gradient">Test Results — {sampleCode}</h2>
          <p className="text-muted">ISO-17025 compliant result entry with Maker-Checker validation and Amendment workflows.</p>
        </div>
        {isClient && requestId && (
          <button 
            className="btn-secondary" 
            style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '10px 20px', fontWeight: 600 }}
            onClick={() => window.location.href = `/disputes?request=${requestId}`}
          >
            ⚖️ Challenge Results / Dispute
          </button>
        )}
      </div>

      {/* Existing Results */}
      {loading ? <p className="text-muted">Loading results...</p> : (
        <>
          {/* Validated Results (Locked) */}
          {validatedResults.length > 0 && (
            <div className="glass-panel mb-6 overflow-x-auto">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-green-500 text-xl">🔒</span>
                <h3 className="font-bold text-lg">Validated Results</h3>
              </div>
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                    <th>Technical Data</th>
                    <th>MU (±)</th>
                    <th>Limits</th>
                    <th>Status</th>
                    <th>Equip ID</th>
                    <th>Validated By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {validatedResults.map(r => (
                    <tr key={r.id}>
                      <td className="font-semibold">
                        {r.parameter_name}
                        {existingResults.some(ex => ex.parameter_name === r.parameter_name && ex.status === 'superseded') && (
                          <span style={{ display: 'block', fontSize: 10, color: '#f59e0b', marginTop: 2 }}>⚠️ Amended</span>
                        )}
                      </td>
                      <td>{r.value} {r.unit}</td>
                      <td>
                        <div className="text-[10px] space-y-0.5 opacity-80">
                            <div className="flex gap-2">
                                <span className="text-blue-400">P: {r.positive_control || '-'}</span>
                                <span className="text-red-400">N: {r.negative_control || '-'}</span>
                            </div>
                            <div>Inc: {r.incubation_time ? `${r.incubation_time}h @ ${r.incubation_temp}°C` : '-'}</div>
                            <div className="font-mono">Lot: {r.reagent_lot || '-'}</div>
                        </div>
                      </td>
                      <td>{r.measurement_uncertainty || '-'}</td>
                      <td>{r.specification_limit || '-'}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.pass_fail === 'Pass' ? 'bg-green-500/20 text-green-400' : r.pass_fail === 'Fail' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {r.pass_fail || 'N/A'}
                        </span>
                      </td>
                      <td className="text-xs">{r.equipment_id || '-'}</td>
                      <td className="text-xs">{r.validated_by_email}<br/><span className="text-muted">{new Date(r.validated_at).toLocaleDateString()}</span></td>
                      <td>
                        {user.role === 'lab' && (
                          <button className="btn-sm btn-secondary text-xs" onClick={() => openAmendModal(r)}>
                            📝 Amend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CAPA / Amendment History */}
          {existingResults.some(r => r.status === 'superseded') && (
            <div className="glass-panel mb-6" style={{ border: '1px solid #fcd34d', background: '#fffbeb' }}>
              <div className="flex items-center gap-2 mb-4">
                <span style={{ fontSize: 18 }}>📜</span>
                <h3 className="font-bold" style={{ color: '#92400e', margin: 0 }}>Amendment History (CAPA Visibility)</h3>
              </div>
              <div className="flex flex-col gap-3">
                {existingResults.filter(r => r.status === 'superseded').map(r => (
                  <div key={r.id} style={{ background: 'white', borderRadius: 8, padding: 12, border: '1px solid #fde68a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span className="font-bold text-sm">{r.parameter_name} (Superseded)</span>
                      <span className="text-xs text-muted">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                      <div>
                        <span className="text-muted block">Original Value</span>
                        <span style={{ textDecoration: 'line-through' }}>{r.value} {r.unit}</span>
                      </div>
                      <div>
                        <span className="text-muted block">Status</span>
                        <span className="pill pill-closed">SUPERSEDED</span>
                      </div>
                    </div>
                    <div style={{ background: '#fef3c7', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
                      <strong>CAPA / Reason for Amendment:</strong>
                      <p style={{ margin: '4px 0 0', color: '#92400e' }}>{r.amendment_reason || "No reason provided."}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft Results (Editable) */}
          {draftResults.length > 0 && (
            <div className="glass-panel mb-6 overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-yellow-500 text-xl">📝</span>
                  <div>
                    <h3 className="font-bold text-lg">Draft Results</h3>
                    {makerCheckerConflict && <p className="text-xs text-red-400 mt-1">Maker-Checker: You cannot validate results you entered.</p>}
                  </div>
                </div>
                {user.role === 'lab' && (
                  <div className="flex gap-2">
                    <button 
                      className={`btn-sm font-semibold btn-danger`}
                      onClick={() => {
                        const reason = prompt("Enter REJECTION reason for these draft results:");
                        if (reason) handleRejectAll(reason);
                      }}
                      disabled={makerCheckerConflict}
                    >
                      ✕ Reject
                    </button>
                    <button 
                      className={`btn-sm font-semibold ${makerCheckerConflict ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'btn-success'}`}
                      onClick={handleValidateAll}
                      disabled={makerCheckerConflict}
                      title={makerCheckerConflict ? "You cannot validate your own entries" : ""}
                    >
                      🔒 Validate & Lock All
                    </button>
                  </div>
                )}
              </div>
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                    <th>Technical Data</th>
                    <th>MU (±)</th>
                    <th>Limits</th>
                    <th>Pass/Fail</th>
                    <th>Equip ID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {draftResults.map(r => (
                    <DraftRow key={r.id} result={r} onUpdate={handleUpdateResult} isLab={user.role === 'lab'} equipment={equipment} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* New Result Entry Form */}
      {user.role === 'lab' && (
        <div className="glass-panel overflow-x-auto">
          <h3 className="font-bold text-lg mb-4">➕ Add New Results</h3>
          <form onSubmit={handleSaveAll}>
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th className="w-1/6">Parameter *</th>
                  <th>Method (MU Library)</th>
                  <th className="w-1/12">Value *</th>
                  <th className="w-1/12">Unit</th>
                  <th className="w-1/12">MU (±)</th>
                  <th className="w-1/6">Spec Limit</th>
                  <th className="w-1/12">Pass/Fail 🤖</th>
                  <th className="w-1/6">Equipment</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5">
                    <td className="py-4">
                      <div className="space-y-2">
                        <input required className="w-full p-2 rounded bg-white/5 border border-white/10" placeholder="e.g. pH" value={row.parameter_name} onChange={(e) => updateRow(idx, 'parameter_name', e.target.value)} />
                        <div className="flex gap-2">
                            <input className="w-1/2 p-1 text-[10px] rounded bg-white/5 border border-white/10" placeholder="Pos. Control" title="Positive Control Value" value={row.positive_control} onChange={(e) => updateRow(idx, 'positive_control', e.target.value)} />
                            <input className="w-1/2 p-1 text-[10px] rounded bg-white/5 border border-white/10" placeholder="Neg. Control" title="Negative Control Value" value={row.negative_control} onChange={(e) => updateRow(idx, 'negative_control', e.target.value)} />
                        </div>
                      </div>
                    </td>
                    {/* P1-4: Method selector with MU auto-population */}
                    <td>
                      <div className="space-y-1">
                        <select
                          className="w-full p-2 rounded bg-white/5 border border-white/10 text-[11px]"
                          value={row.method_reference}
                          onChange={(e) => handleMethodSelect(idx, e.target.value)}
                        >
                          <option value="">-- Select Method --</option>
                          {methods.map(m => (
                            <option key={m.id} value={m.code}>
                              {m.name} ({m.code}){m.typical_mu ? ` MU:${m.typical_mu}` : ''}
                            </option>
                          ))}
                        </select>
                        {!row.method_reference && (
                          <input className="w-full p-1 text-[10px] rounded bg-white/5 border border-white/10" placeholder="or type method ref" value={row.method_reference} onChange={(e) => updateRow(idx, 'method_reference', e.target.value)} />
                        )}
                        {row.method_reference && (
                          <div className="flex gap-1">
                            <input className="w-full p-1 text-[9px] font-mono rounded bg-white/5 border border-white/10" placeholder="Lot #" value={row.reagent_lot} onChange={(e) => updateRow(idx, 'reagent_lot', e.target.value)} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <input required className="w-full p-2 rounded bg-white/5 border border-white/10" placeholder="7.2" value={row.value} onChange={(e) => updateRow(idx, 'value', e.target.value)} />
                    </td>
                    <td>
                      <input className="w-full p-2 rounded bg-white/5 border border-white/10" placeholder="mg/L" value={row.unit} onChange={(e) => updateRow(idx, 'unit', e.target.value)} />
                    </td>
                    <td>
                      {/* P1-4: MU auto-populated from library, manual override still possible */}
                      <div className="relative">
                        <input className={`w-full p-2 rounded bg-white/5 border text-[11px] ${row._mu_from_library ? 'border-emerald-500/40 text-emerald-400' : 'border-white/10'}`} placeholder="0.05" value={row.measurement_uncertainty} onChange={(e) => { updateRow(idx, 'measurement_uncertainty', e.target.value); updateRow(idx, '_mu_from_library', false); }} />
                        {row._mu_from_library && <span className="absolute right-1 top-1 text-[7px] font-black text-emerald-500 uppercase">Library</span>}
                      </div>
                    </td>
                    <td>
                      <div className="space-y-2">
                        <input className="w-full p-2 rounded bg-white/5 border border-white/10" placeholder="6.5 - 8.5 or MAX 5.0" value={row.specification_limit} onChange={(e) => updateRow(idx, 'specification_limit', e.target.value)} />
                      </div>
                    </td>
                    {/* P1-3: Auto-computed Pass/Fail (ISO 17025 §7.8.3.1) — shown with indicator */}
                    <td>
                      <div className="text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${row.pass_fail === 'Pass' ? 'bg-green-500/20 text-green-400' : row.pass_fail === 'Fail' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                          {row.pass_fail}
                        </span>
                        {row.specification_limit && row.value && row.pass_fail === 'N/A' && (
                          <div className="text-[7px] text-amber-400 mt-0.5">Unrecognized format</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="space-y-2">
                        <select 
                            className="w-full p-2 rounded bg-white/5 border border-white/10" 
                            value={row.equipment_id} 
                            onChange={(e) => updateRow(idx, 'equipment_id', e.target.value)}
                        >
                            <option value="">-- Select --</option>
                            {equipment.map(e => {
                            const expired = e.calibration_expiry && new Date(e.calibration_expiry) < new Date();
                            return (
                                <option key={e.id} value={e.serial_number} disabled={e.status !== 'ACTIVE' || expired}>
                                {e.name} ({e.serial_number}) {expired ? "⚠️ EXPIRED" : ""}
                                </option>
                            );
                            })}
                        </select>
                        <div className="flex gap-2">
                            <input className="w-1/2 p-1 text-[10px] rounded bg-white/5 border border-white/10" placeholder="Hours" title="Incubation Time" value={row.incubation_time} onChange={(e) => updateRow(idx, 'incubation_time', e.target.value)} />
                            <input className="w-1/2 p-1 text-[10px] rounded bg-white/5 border border-white/10" placeholder="Temp °C" title="Incubation Temp" value={row.incubation_temp} onChange={(e) => updateRow(idx, 'incubation_temp', e.target.value)} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <button type="button" className="btn-sm btn-danger px-2" onClick={() => removeRow(idx)} disabled={rows.length <= 1}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center mt-4">
              <button type="button" className="btn-sm btn-secondary font-semibold" onClick={addRow}>+ Add Row</button>
              <div className="flex gap-3">
                <button type="button" className="btn-secondary px-4 py-2 rounded-md" onClick={() => navigate(-1)}>Cancel</button>
                <button type="submit" className="btn-primary px-6 py-2 rounded-md font-semibold" disabled={saving}>
                  {saving ? "Saving..." : "Save as Draft"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Amendment Modal */}
      {amendingResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel max-w-lg w-full">
            <h3 className="font-bold text-xl mb-2 text-warning">Amend Result: {amendingResult.parameter_name}</h3>
            <p className="text-sm text-muted mb-4">You are superseding a validated result. The original will remain in the audit logs. Reason is mandatory.</p>
            
            <form onSubmit={handleAmendSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Value</label>
                  <input className="w-full p-2 rounded bg-white/5 border border-white/10" value={amendForm.value} onChange={e => setAmendForm({...amendForm, value: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Unit</label>
                  <input className="w-full p-2 rounded bg-white/5 border border-white/10" value={amendForm.unit} onChange={e => setAmendForm({...amendForm, unit: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">MU (±)</label>
                  <input className="w-full p-2 rounded bg-white/5 border border-white/10" value={amendForm.measurement_uncertainty} onChange={e => setAmendForm({...amendForm, measurement_uncertainty: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Limits</label>
                  <input className="w-full p-2 rounded bg-white/5 border border-white/10" value={amendForm.specification_limit} onChange={e => setAmendForm({...amendForm, specification_limit: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Status</label>
                  <select className="w-full p-2 rounded bg-white/5 border border-white/10" value={amendForm.pass_fail} onChange={e => setAmendForm({...amendForm, pass_fail: e.target.value})}>
                    <option value="N/A">N/A</option>
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Equipment ID</label>
                  <select 
                    className="w-full p-2 rounded bg-white/5 border border-white/10" 
                    value={amendForm.equipment_id} 
                    onChange={e => setAmendForm({...amendForm, equipment_id: e.target.value})}
                  >
                    <option value="">-- Select --</option>
                    {equipment.map(e => {
                      const expired = e.calibration_expiry && new Date(e.calibration_expiry) < new Date();
                      return (
                        <option key={e.id} value={e.serial_number} disabled={e.status !== 'ACTIVE' || expired}>
                          {e.name} ({e.serial_number}) {expired ? "⚠️ EXPIRED" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-blue-400">Pos. Control</label>
                  <input className="w-full p-2 rounded bg-white/5 border border-white/10" value={amendForm.positive_control} onChange={e => setAmendForm({...amendForm, positive_control: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-blue-400">Neg. Control</label>
                  <input className="w-full p-2 rounded bg-white/5 border border-white/10" value={amendForm.negative_control} onChange={e => setAmendForm({...amendForm, negative_control: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Incubation (Hrs/°C)</label>
                  <div className="flex gap-2">
                    <input className="w-1/2 p-2 rounded bg-white/5 border border-white/10" placeholder="Hrs" value={amendForm.incubation_time} onChange={e => setAmendForm({...amendForm, incubation_time: e.target.value})} />
                    <input className="w-1/2 p-2 rounded bg-white/5 border border-white/10" placeholder="°C" value={amendForm.incubation_temp} onChange={e => setAmendForm({...amendForm, incubation_temp: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Reagent Lot #</label>
                  <input className="w-full p-2 rounded bg-white/5 border border-white/10" value={amendForm.reagent_lot} onChange={e => setAmendForm({...amendForm, reagent_lot: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1 text-red-400">Reason for Amendment *</label>
                <textarea 
                  className="w-full p-2 rounded bg-white/5 border border-white/10 h-24" 
                  placeholder="Explain why this result is being amended..."
                  value={amendForm.amendment_reason}
                  onChange={e => setAmendForm({...amendForm, amendment_reason: e.target.value})}
                  required
                ></textarea>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary px-4 py-2 rounded-md" onClick={() => setAmendingResult(null)}>Cancel</button>
                <button type="submit" className="btn-primary bg-yellow-600 hover:bg-yellow-500 px-6 py-2 rounded-md font-semibold">Submit Amendment</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function DraftRow({ result, onUpdate, isLab, equipment }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    value: result.value || "",
    unit: result.unit || "",
    measurement_uncertainty: result.measurement_uncertainty || "",
    specification_limit: result.specification_limit || "",
    pass_fail: result.pass_fail || "N/A",
    equipment_id: result.equipment_id || "",
    method_reference: result.method_reference || "",
    positive_control: result.positive_control || "",
    negative_control: result.negative_control || "",
    incubation_time: result.incubation_time || "",
    incubation_temp: result.incubation_temp || "",
    reagent_lot: result.reagent_lot || ""
  });

  const save = () => {
    onUpdate(result.id, form);
    setEditing(false);
  };

  if (!editing) {
    return (
      <tr>
        <td className="font-semibold">
          {result.parameter_name}
          {result.status === 'rejected' && (
            <span style={{ display: 'block', fontSize: 10, color: '#ef4444', marginTop: 2 }}>⚠️ REJECTED (Needs Correction)</span>
          )}
        </td>
        <td>{result.value} {result.unit}</td>
        <td>
            <div className="text-[10px] space-y-0.5 opacity-80">
                <div className="flex gap-2">
                    <span className="text-blue-400">P: {result.positive_control || '-'}</span>
                    <span className="text-red-400">N: {result.negative_control || '-'}</span>
                </div>
                <div>Inc: {result.incubation_time ? `${result.incubation_time}h @ ${result.incubation_temp}°C` : '-'}</div>
                <div className="font-mono">Lot: {result.reagent_lot || '-'}</div>
            </div>
        </td>
        <td>{result.measurement_uncertainty || '-'}</td>
        <td>{result.specification_limit || '-'}</td>
        <td>
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${result.pass_fail === 'Pass' ? 'bg-green-500/20 text-green-400' : result.pass_fail === 'Fail' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
            {result.pass_fail || 'N/A'}
          </span>
        </td>
        <td>{result.equipment_id || '-'}</td>
        <td>
          {isLab && (
            <button className="btn-sm btn-secondary text-xs" onClick={() => setEditing(true)}>Edit</button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="font-semibold">{result.parameter_name}</td>
      <td><input className="w-full p-1 rounded bg-white/5 border border-white/10" value={form.value} onChange={e => setForm({...form, value: e.target.value})} /></td>
      <td>
        <div className="space-y-1">
            <div className="flex gap-1">
                <input className="w-1/2 p-1 text-[9px] rounded bg-white/5 border border-white/10" placeholder="Pos" value={form.positive_control} onChange={e => setForm({...form, positive_control: e.target.value})} />
                <input className="w-1/2 p-1 text-[9px] rounded bg-white/5 border border-white/10" placeholder="Neg" value={form.negative_control} onChange={e => setForm({...form, negative_control: e.target.value})} />
            </div>
            <div className="flex gap-1">
                <input className="w-1/2 p-1 text-[9px] rounded bg-white/5 border border-white/10" placeholder="Hrs" value={form.incubation_time} onChange={e => setForm({...form, incubation_time: e.target.value})} />
                <input className="w-1/2 p-1 text-[9px] rounded bg-white/5 border border-white/10" placeholder="°C" value={form.incubation_temp} onChange={e => setForm({...form, incubation_temp: e.target.value})} />
            </div>
            <input className="w-full p-1 text-[9px] rounded bg-white/5 border border-white/10 font-mono" placeholder="Lot #" value={form.reagent_lot} onChange={e => setForm({...form, reagent_lot: e.target.value})} />
        </div>
      </td>
      <td><input className="w-full p-1 rounded bg-white/5 border border-white/10" value={form.measurement_uncertainty} onChange={e => setForm({...form, measurement_uncertainty: e.target.value})} /></td>
      <td><input className="w-full p-1 rounded bg-white/5 border border-white/10" value={form.specification_limit} onChange={e => setForm({...form, specification_limit: e.target.value})} /></td>
      <td>
        <select className="w-full p-1 rounded bg-white/5 border border-white/10" value={form.pass_fail} onChange={e => setForm({...form, pass_fail: e.target.value})}>
          <option value="N/A">N/A</option>
          <option value="Pass">Pass</option>
          <option value="Fail">Fail</option>
        </select>
      </td>
      <td>
        <select 
          className="w-full p-1 rounded bg-white/5 border border-white/10" 
          value={form.equipment_id} 
          onChange={e => setForm({...form, equipment_id: e.target.value})}
        >
          <option value="">-- Select --</option>
          {equipment.map(e => {
            const expired = e.calibration_expiry && new Date(e.calibration_expiry) < new Date();
            return (
              <option key={e.id} value={e.serial_number} disabled={e.status !== 'ACTIVE' || expired}>
                {e.name} ({e.serial_number}) {expired ? "⚠️ EXPIRED" : ""}
              </option>
            );
          })}
        </select>
      </td>
      <td>
        <div className="flex gap-1">
          <button className="btn-sm btn-success px-2 py-1 text-xs" onClick={save}>✓</button>
          <button className="btn-sm btn-danger px-2 py-1 text-xs" onClick={() => setEditing(false)}>✗</button>
        </div>
      </td>
    </tr>
  );
}
