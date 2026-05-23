import { useState, useEffect } from "react";
import API from "../services/api";

export default function ReagentManager() {
  const [reagents, setReagents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", manufacturer: "", lot_number: "", expiry_date: "", opened_at: "" });

  const loadReagents = async () => {
    try {
      const res = await API.get("/api/reagents");
      setReagents(res.data.data);
    } catch (err) { console.error("Failed to load reagents"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReagents(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/reagents", form);
      setForm({ name: "", manufacturer: "", lot_number: "", expiry_date: "", opened_at: "" });
      setShowAdd(false);
      loadReagents();
    } catch (err) { alert("Failed to save reagent"); }
  };

  const updateStatus = async (id, status) => {
      try {
          await API.patch(`/api/reagents/${id}/status`, { status });
          loadReagents();
      } catch (err) { alert("Status update failed"); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-gradient">🧪 Reagents & Consumables Registry</h2>
          <p className="text-muted">Maintain traceability for critical supplies. Expired reagents are automatically flagged.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>➕ Register Supply</button>
      </div>

      <div className="glass-panel p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Supply / Lot</th>
              <th>Manufacturer</th>
              <th>Expiry Date</th>
              <th>Opened At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
                <tr><td colSpan="6" className="text-center">Loading supplies...</td></tr>
            ) : reagents.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-muted">No reagents registered.</td></tr>
            ) : reagents.map(r => (
                <tr key={r.id}>
                    <td>
                        <div className="font-bold">{r.name}</div>
                        <div className="text-[10px] font-mono text-muted">Lot: {r.lot_number}</div>
                    </td>
                    <td className="text-sm">{r.manufacturer || 'N/A'}</td>
                    <td>
                        <div className={`text-sm ${new Date(r.expiry_date) < new Date() ? 'text-red-500 font-bold' : ''}`}>
                            {new Date(r.expiry_date).toLocaleDateString()}
                        </div>
                    </td>
                    <td className="text-sm text-muted">{r.opened_at || 'Never Opened'}</td>
                    <td>
                        <span className={`pill ${r.status === 'ACTIVE' && new Date(r.expiry_date) >= new Date() ? 'pill-paid' : 'pill-danger'}`}>
                            {new Date(r.expiry_date) < new Date() ? 'EXPIRED' : r.status}
                        </span>
                    </td>
                    <td>
                        {r.status === 'ACTIVE' && (
                            <button onClick={() => updateStatus(r.id, 'DEPLETED')} className="text-xs text-slate-400 hover:text-red-500 underline font-bold">Depleted</button>
                        )}
                    </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 500 }}>
            <h3>Register Reagent / Supply</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Supply Name *</label>
                <input required className="w-full p-2 border rounded" placeholder="e.g. 1.0M Hydrochloric Acid" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Manufacturer</label>
                  <input className="w-full p-2 border rounded" placeholder="Sigma Aldrich" value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Lot Number *</label>
                  <input required className="w-full p-2 border rounded" placeholder="LOT-8892-X" value={form.lot_number} onChange={e => setForm({...form, lot_number: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Expiry Date *</label>
                  <input type="date" required className="w-full p-2 border rounded" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Opened At (Optional)</label>
                  <input type="date" className="w-full p-2 border rounded" value={form.opened_at} onChange={e => setForm({...form, opened_at: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Register Supply</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
