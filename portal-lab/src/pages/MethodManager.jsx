import { useState, useEffect } from "react";
import API from "../services/api";

const VALIDATION_STATUS_STYLES = {
  VALIDATED:      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  VERIFIED:       'bg-blue-500/20 text-blue-400 border-blue-500/30',
  IN_DEVELOPMENT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  PENDING:        'bg-slate-700 text-slate-400 border-white/10',
  RETIRED:        'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function MethodManager() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedMethod, setExpandedMethod] = useState(null);
  const [muForm, setMuForm] = useState({ typical_mu: '', mu_unit: '%', mu_coverage_factor: '2', mu_confidence_level: '95%', mu_calculation_method: 'GUM' });
  const [valForm, setValForm] = useState({ validation_status: 'PENDING', scope_of_application: '', validated_by_name: '', linearity_range: '', detection_limit: '', quantitation_limit: '', precision_rsd: '', recovery_percent: '', bias_percent: '', validation_report_url: '' });
  const [form, setForm] = useState({ 
    parameter_name: "", default_unit: "", method_reference: "", specification_limit: "",
    lld: "", uncertainty: "", tat_days: "", version: "1.0", price: "", description: ""
  });

  const loadMethods = async () => {
    try {
      const res = await API.get("/api/methods");
      setMethods(res.data.data);
    } catch (err) {
      console.error("Failed to load methods");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMethods(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/methods", form);
      setForm({ 
        parameter_name: "", default_unit: "", method_reference: "", specification_limit: "",
        lld: "", uncertainty: "", tat_days: "", version: "1.0", price: "", description: ""
      });
      setShowAdd(false);
      loadMethods();
    } catch (err) {
      alert("Failed to save method");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Retire this test method?")) return;
    try {
      await API.delete(`/api/methods/${id}`);
      setMethods(methods.filter(m => m.id !== id));
    } catch (err) {
      alert("Delete failed");
    }
  };

  const openMethodEditor = (method) => {
    setExpandedMethod(method.id === expandedMethod ? null : method.id);
    setMuForm({
      typical_mu: method.typical_mu || '',
      mu_unit: method.mu_unit || '%',
      mu_coverage_factor: method.mu_coverage_factor || '2',
      mu_confidence_level: method.mu_confidence_level || '95%',
      mu_calculation_method: method.mu_calculation_method || 'GUM',
    });
    setValForm({
      validation_status: method.validation_status || 'PENDING',
      scope_of_application: method.scope_of_application || '',
      validated_by_name: method.validated_by_name || '',
      linearity_range: method.linearity_range || '',
      detection_limit: method.detection_limit || '',
      quantitation_limit: method.quantitation_limit || '',
      precision_rsd: method.precision_rsd || '',
      recovery_percent: method.recovery_percent || '',
      bias_percent: method.bias_percent || '',
      validation_report_url: method.validation_report_url || '',
    });
  };

  const saveMU = async (methodId) => {
    try {
      await API.patch(`/api/methods/${methodId}/mu`, muForm);
      alert('✅ MU Library updated. Will auto-populate in result entry.');
      loadMethods();
    } catch (err) { alert('Failed to save MU'); }
  };

  const saveValidation = async (methodId) => {
    try {
      await API.patch(`/api/methods/${methodId}/validation`, valForm);
      alert(`✅ Method validation status set to ${valForm.validation_status}`);
      loadMethods();
    } catch (err) { alert('Failed to save validation status'); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-gradient">📋 Test Method (SOP) Registry</h2>
          <p className="text-muted">ISO 17025 §7.2 — Pre-define parameters, MU library, and validation status for all test methods.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>➕ Add New Test</button>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Analyte / Parameter</th>
              <th>Method / Version</th>
              <th>MU Library (§7.6)</th>
              <th>Validation Status (§7.2)</th>
              <th>Economics</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center">Loading registry...</td></tr>
            ) : methods.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-10 text-muted">No test methods defined.</td></tr>
            ) : methods.map(m => (
              <>
                <tr key={m.id} className={expandedMethod === m.id ? 'bg-blue-500/5' : ''}>
                  <td>
                      <div className="font-bold">{m.parameter_name}</div>
                      <div className="text-[10px] text-muted uppercase">{m.description || 'No description'}</div>
                      <div className="text-[9px] font-mono text-slate-500 mt-1">Limit: {m.specification_limit || 'N/A'} {m.default_unit}</div>
                  </td>
                  <td>
                      <div className="text-sm font-mono text-primary font-bold">{m.method_reference || 'N/A'}</div>
                      <div className="text-[10px] text-muted italic">Rev: {m.version} | TAT: {m.tat_days || '?'}d</div>
                  </td>
                  <td>
                      {m.typical_mu ? (
                        <div>
                          <div className="font-mono font-black text-emerald-400">± {m.typical_mu} {m.mu_unit || '%'}</div>
                          <div className="text-[9px] text-slate-500">k={m.mu_coverage_factor || 2} ({m.mu_confidence_level || '95%'}) · {m.mu_calculation_method || 'GUM'}</div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-bold uppercase">⚠️ Not Set</span>
                      )}
                  </td>
                  <td>
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${VALIDATION_STATUS_STYLES[m.validation_status] || VALIDATION_STATUS_STYLES.PENDING}`}>
                        {m.validation_status || 'PENDING'}
                      </span>
                      {m.validated_by_name && (
                        <div className="text-[9px] text-slate-500 mt-1">By: {m.validated_by_name}</div>
                      )}
                      {m.validated_date && (
                        <div className="text-[8px] text-slate-600">{new Date(m.validated_date).toLocaleDateString()}</div>
                      )}
                  </td>
                  <td>
                      <div className="text-sm font-bold text-green-600">${m.price || '0.00'}</div>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => openMethodEditor(m)} className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${expandedMethod === m.id ? 'bg-blue-600 text-white border-blue-500' : 'border-white/10 text-slate-400 hover:text-white'}`}>
                        {expandedMethod === m.id ? 'Close' : '⚙️ Edit'}
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:underline text-xs font-bold">Retire</button>
                    </div>
                  </td>
                </tr>
                {/* Inline Method Editor for MU + Validation Status */}
                {expandedMethod === m.id && (
                  <tr key={`${m.id}-editor`}>
                    <td colSpan="6" className="bg-slate-900/50 p-0">
                      <div className="p-6 space-y-6 border-t border-blue-500/20">
                        <div className="grid grid-cols-2 gap-8">
                          {/* MU Library Editor */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest border-b border-white/5 pb-2">📊 MU Library (ISO 17025 §7.6)</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Typical MU Value *</label>
                                <input className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" placeholder="e.g. 5" value={muForm.typical_mu} onChange={e => setMuForm({...muForm, typical_mu: e.target.value})} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">MU Unit</label>
                                <select className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" value={muForm.mu_unit} onChange={e => setMuForm({...muForm, mu_unit: e.target.value})}>
                                  <option value="%">% (Relative)</option>
                                  <option value="abs">Absolute</option>
                                  <option value="mg/L">mg/L</option>
                                  <option value="ppm">ppm</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Coverage Factor (k)</label>
                                <input className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" placeholder="2" value={muForm.mu_coverage_factor} onChange={e => setMuForm({...muForm, mu_coverage_factor: e.target.value})} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Confidence Level</label>
                                <select className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" value={muForm.mu_confidence_level} onChange={e => setMuForm({...muForm, mu_confidence_level: e.target.value})}>
                                  <option value="95%">95%</option>
                                  <option value="99%">99%</option>
                                  <option value="68%">68%</option>
                                </select>
                              </div>
                              <div className="col-span-2">
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">MU Calculation Method</label>
                                <select className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" value={muForm.mu_calculation_method} onChange={e => setMuForm({...muForm, mu_calculation_method: e.target.value})}>
                                  <option value="GUM">GUM (Guide to Uncertainty Measurement)</option>
                                  <option value="EUROLAB">EUROLAB Technical Report</option>
                                  <option value="NORDTEST">NORDTEST TR 537</option>
                                  <option value="EMPIRICAL">Empirical (Validation Data)</option>
                                </select>
                              </div>
                            </div>
                            <button onClick={() => saveMU(m.id)} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase rounded transition-all">Save MU Library →</button>
                          </div>

                          {/* Validation Status Editor */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest border-b border-white/5 pb-2">🛡️ Method Validation Status (ISO 17025 §7.2)</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2">
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Validation Status *</label>
                                <select className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" value={valForm.validation_status} onChange={e => setValForm({...valForm, validation_status: e.target.value})}>
                                  <option value="PENDING">Pending Assessment</option>
                                  <option value="IN_DEVELOPMENT">In Development</option>
                                  <option value="VALIDATED">Validated (In-house Method)</option>
                                  <option value="VERIFIED">Verified (Standard Method Adapted)</option>
                                  <option value="RETIRED">Retired</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Validated By</label>
                                <input className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" placeholder="Name of validator" value={valForm.validated_by_name} onChange={e => setValForm({...valForm, validated_by_name: e.target.value})} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Linearity Range</label>
                                <input className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" placeholder="e.g. 0.01–10 mg/L" value={valForm.linearity_range} onChange={e => setValForm({...valForm, linearity_range: e.target.value})} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">LOD</label>
                                <input className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" placeholder="0.001 mg/L" value={valForm.detection_limit} onChange={e => setValForm({...valForm, detection_limit: e.target.value})} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">LOQ</label>
                                <input className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" placeholder="0.005 mg/L" value={valForm.quantitation_limit} onChange={e => setValForm({...valForm, quantitation_limit: e.target.value})} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Precision (%RSD)</label>
                                <input className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" placeholder="2.5" value={valForm.precision_rsd} onChange={e => setValForm({...valForm, precision_rsd: e.target.value})} />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Recovery (%)</label>
                                <input className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" placeholder="98–102" value={valForm.recovery_percent} onChange={e => setValForm({...valForm, recovery_percent: e.target.value})} />
                              </div>
                              <div className="col-span-2">
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Scope of Application</label>
                                <input className="w-full p-2 bg-slate-800 border border-white/10 rounded text-sm" placeholder="e.g. Potable water, wastewater, food matrices" value={valForm.scope_of_application} onChange={e => setValForm({...valForm, scope_of_application: e.target.value})} />
                              </div>
                            </div>
                            <button onClick={() => saveValidation(m.id)} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded transition-all">Save Validation Record →</button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-6">
                <h3 style={{ margin: 0 }}>Register Professional Test Method</h3>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">ISO 17025 COMPLIANT</span>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Parameter / Analyte *</label>
                    <input required className="w-full p-2 border rounded text-sm" placeholder="e.g. Lead (Pb)" value={form.parameter_name} onChange={e => setForm({...form, parameter_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Method Reference (SOP)</label>
                    <input className="w-full p-2 border rounded text-sm" placeholder="e.g. EPA 200.8 / ISO 11885" value={form.method_reference} onChange={e => setForm({...form, method_reference: e.target.value})} />
                  </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Default Unit</label>
                  <input className="w-full p-2 border rounded text-sm" placeholder="mg/L" value={form.default_unit} onChange={e => setForm({...form, default_unit: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">SOP Version</label>
                  <input className="w-full p-2 border rounded text-sm" placeholder="1.0" value={form.version} onChange={e => setForm({...form, version: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Standard Price ($)</label>
                  <input type="number" step="0.01" className="w-full p-2 border rounded text-sm" placeholder="45.00" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Std Limit</label>
                  <input className="w-full p-2 border rounded text-sm" placeholder="< 0.05" value={form.specification_limit} onChange={e => setForm({...form, specification_limit: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">LLD</label>
                  <input className="w-full p-2 border rounded text-sm" placeholder="0.001" value={form.lld} onChange={e => setForm({...form, lld: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">MU (±)</label>
                  <input className="w-full p-2 border rounded text-sm" placeholder="5%" value={form.uncertainty} onChange={e => setForm({...form, uncertainty: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">TAT (Days)</label>
                  <input type="number" className="w-full p-2 border rounded text-sm" placeholder="5" value={form.tat_days} onChange={e => setForm({...form, tat_days: e.target.value})} />
                </div>
              </div>

              <div>
                  <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Technical Description / Scope</label>
                  <textarea rows="2" className="w-full p-2 border rounded text-sm" placeholder="Briefly describe the analytical scope..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Commit to Registry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
