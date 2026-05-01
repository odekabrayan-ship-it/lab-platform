import { useState, useEffect } from "react";
import API from "../services/api";

export default function MethodManager() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
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
    if (!confirm("Delete this test method?")) return;
    try {
      await API.delete(`/api/methods/${id}`);
      setMethods(methods.filter(m => m.id !== id));
    } catch (err) {
      alert("Delete failed");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-gradient">📋 Test Method (SOP) Registry</h2>
          <p className="text-muted">Pre-define your parameters, units, and methods to accelerate result entry.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>➕ Add New Test</button>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Analyte / Parameter</th>
              <th>Method / Version</th>
              <th>Technical Spec (LLD / MU)</th>
              <th>Economics (Price / TAT)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center">Loading registry...</td></tr>
            ) : methods.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-10 text-muted">No test methods defined.</td></tr>
            ) : methods.map(m => (
              <tr key={m.id}>
                <td>
                    <div className="font-bold">{m.parameter_name}</div>
                    <div className="text-[10px] text-muted uppercase">{m.description || 'No description'}</div>
                </td>
                <td>
                    <div className="text-sm font-mono text-primary font-bold">{m.method_reference || 'N/A'}</div>
                    <div className="text-[10px] text-muted italic">Rev: {m.version}</div>
                </td>
                <td>
                    <div className="text-xs">Limit: <span className="font-bold">{m.specification_limit || 'N/A'}</span> {m.default_unit}</div>
                    <div className="text-[10px] text-slate-400">LLD: {m.lld || '-'} | MU: {m.uncertainty || '-'}</div>
                </td>
                <td>
                    <div className="text-sm font-bold text-green-600">${m.price || '0.00'}</div>
                    <div className="text-[10px] text-muted">{m.tat_days || '?'} Day TAT</div>
                </td>
                <td>
                  <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:underline text-xs font-bold">Retire</button>
                </td>
              </tr>
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
