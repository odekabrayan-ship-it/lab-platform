import { useState, useEffect } from "react";
import API from "../services/api";

export default function StorageManager() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", capacity: 100 });

  const loadStorage = async () => {
    try {
      const res = await API.get("/api/lab/storage");
      setLocations(res.data.data);
    } catch (err) { console.error("Failed to load storage"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadStorage(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/lab/storage", form);
      setForm({ name: "", description: "", capacity: 100 });
      setShowAdd(false);
      loadStorage();
    } catch (err) { alert("Failed to add location"); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-gradient">📦 Lab Storage & Inventory</h2>
          <p className="text-muted">Define your physical storage locations (Fridges, Incubators, Shelves) to track sample custody.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>➕ Add Location</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
            <p>Loading storage...</p>
        ) : locations.map(loc => (
            <div key={loc.id} className="glass-panel">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold">{loc.name}</h3>
                    <span className={`pill ${loc.current_load > loc.capacity * 0.8 ? 'pill-danger' : 'pill-paid'}`}>
                        {Math.round((loc.current_load / loc.capacity) * 100)}% Full
                    </span>
                </div>
                <p className="text-sm text-muted mb-6">{loc.description || 'No description provided.'}</p>
                <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                    <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (loc.current_load / loc.capacity) * 100)}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                    <span>{loc.current_load} Samples</span>
                    <span>Capacity: {loc.capacity}</span>
                </div>
            </div>
        ))}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 400 }}>
            <h3>Define Storage Location</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Location Name *</label>
                <input required className="w-full p-2 border rounded" placeholder="e.g. Fridge #3 (Micro)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Description</label>
                <textarea className="w-full p-2 border rounded" placeholder="e.g. Temperature controlled at 4°C" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-bold mb-1 uppercase text-slate-500">Storage Capacity (Units)</label>
                <input type="number" required className="w-full p-2 border rounded" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Location</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
