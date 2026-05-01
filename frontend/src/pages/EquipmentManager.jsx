import { useState, useEffect } from "react";
import API from "../services/api";

export default function EquipmentManager() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // For Passport view
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ 
    name: "", manufacturer: "", model_number: "", serial_number: "", 
    internal_asset_id: "", location: "", purchase_date: "", 
    criticality: "NON-CRITICAL", calibration_interval_months: 12,
    calibration_date: "", calibration_expiry: "" 
  });
  const [logForm, setLogForm] = useState({ action_type: "CLEANING", notes: "" });

  const loadEquipment = async () => {
    try {
      const res = await API.get("/api/equipment");
      setEquipment(res.data.data);
    } catch (err) {
      console.error("Failed to load equipment");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (id) => {
    try {
        const res = await API.get(`/api/equipment/${id}/logs`);
        setLogs(res.data.data);
    } catch (err) { console.error("Logs failed"); }
  };

  useEffect(() => { loadEquipment(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/equipment", form);
      setShowAdd(false);
      setForm({ 
        name: "", manufacturer: "", model_number: "", serial_number: "", 
        internal_asset_id: "", location: "", purchase_date: "", 
        criticality: "NON-CRITICAL", calibration_interval_months: 12,
        calibration_date: "", calibration_expiry: "" 
      });
      loadEquipment();
    } catch (err) { alert("Failed to add equipment"); }
  };

  const handleLogSubmit = async (e) => {
      e.preventDefault();
      try {
          await API.post(`/api/equipment/${selectedItem.id}/logs`, logForm);
          setLogForm({ action_type: "CLEANING", notes: "" });
          fetchLogs(selectedItem.id);
          loadEquipment();
          alert("Log entry saved!");
      } catch (err) { alert("Log failed"); }
  };

  const getStatusPill = (status, expiry) => {
    const isExpired = new Date(expiry) < new Date();
    if (isExpired) return <span className="pill pill-danger">EXPIRED</span>;
    if (status === 'MAINTENANCE') return <span className="pill pill-review">MAINTENANCE</span>;
    if (status === 'OUT_OF_SERVICE') return <span className="pill pill-danger">OOS</span>;
    return <span className="pill pill-paid">ACTIVE</span>;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-gradient">🔬 Equipment & Calibration Registry</h2>
          <p className="text-muted">Manage your lab assets, maintenance logs, and ISO 17025 calibration compliance.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>➕ Register Equipment</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <div className="glass-panel p-0 overflow-hidden">
                <table className="data-table">
                <thead>
                    <tr>
                    <th>Asset ID / Internal Tag</th>
                    <th>Status / Criticality</th>
                    <th>Maintenance Details</th>
                    <th>Calibration Health</th>
                    <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {equipment.map(item => (
                    <tr key={item.id} className={`${selectedItem?.id === item.id ? 'bg-blue-50/50' : ''} ${item.criticality === 'CRITICAL' ? 'border-l-4 border-l-amber-500' : ''}`}>
                        <td>
                            <div className="font-bold">{item.name}</div>
                            <div className="text-[10px] font-mono text-primary">{item.internal_asset_id || item.serial_number}</div>
                            <div className="text-[9px] text-muted uppercase">{item.manufacturer} {item.model_number}</div>
                        </td>
                        <td>
                            <div className="mb-1">{getStatusPill(item.status, item.calibration_expiry)}</div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.criticality === 'CRITICAL' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                {item.criticality}
                            </span>
                        </td>
                        <td>
                            <div className="text-xs text-slate-600">Loc: <span className="font-medium">{item.location || 'Central Lab'}</span></div>
                            <div className="text-[10px] text-muted">Cleaned: {item.last_cleaning_date || 'Never'}</div>
                        </td>
                        <td>
                            <div className={`text-xs font-bold ${new Date(item.calibration_expiry) < new Date() ? 'text-red-500' : 'text-green-600'}`}>
                                Due: {new Date(item.calibration_expiry).toLocaleDateString()}
                            </div>
                            <div className="text-[9px] text-muted">Every {item.calibration_interval_months} Months</div>
                        </td>
                        <td>
                        <button className="btn-sm btn-secondary py-1 text-[10px]" onClick={() => { setSelectedItem(item); fetchLogs(item.id); }}>
                            Asset Passport →
                        </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </div>

        <div>
            {selectedItem ? (
                <div className="glass-panel animate-slide-up">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg">📋 Asset Passport</h3>
                        <button className="text-xs text-muted" onClick={() => setSelectedItem(null)}>✕ Close</button>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">Technical Identification</div>
                        <div className="font-mono text-sm mb-1">{selectedItem.manufacturer} {selectedItem.model_number}</div>
                        <div className="text-xs text-muted mb-4">SN: {selectedItem.serial_number} | Tag: {selectedItem.internal_asset_id || 'N/A'}</div>
                        
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 border-t pt-4 border-slate-200">
                            <div>
                                <div className="text-[9px] uppercase font-bold text-slate-400">Installation</div>
                                <div className="text-xs font-medium">{selectedItem.purchase_date || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-[9px] uppercase font-bold text-slate-400">Interval</div>
                                <div className="text-xs font-medium">{selectedItem.calibration_interval_months} Mo.</div>
                            </div>
                            <div>
                                <div className="text-[9px] uppercase font-bold text-slate-400">Last Maint.</div>
                                <div className="text-xs font-medium">{selectedItem.last_maintenance_date || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-[9px] uppercase font-bold text-slate-400">Next Due</div>
                                <div className="text-xs font-bold text-blue-600">{new Date(selectedItem.calibration_expiry).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleLogSubmit} className="mb-8 p-4 border-2 border-dashed border-slate-200 rounded-lg">
                        <h4 className="text-xs font-bold uppercase mb-3">Log Lifecycle Action</h4>
                        <select className="w-full p-2 text-xs border rounded mb-2" value={logForm.action_type} onChange={e => setLogForm({...logForm, action_type: e.target.value})}>
                            <option value="CLEANING">🧼 Cleaning</option>
                            <option value="MAINTENANCE">🔧 Routine Maintenance</option>
                            <option value="CALIBRATION">⚖️ Calibration</option>
                            <option value="REPAIR">🛠️ Repair</option>
                            <option value="CHECK">✅ Performance Check</option>
                        </select>
                        <textarea className="w-full p-2 text-xs border rounded mb-3" placeholder="Notes (e.g. Standard 7.0 checked)" value={logForm.notes} onChange={e => setLogForm({...logForm, notes: e.target.value})} />
                        <button type="submit" className="btn-sm btn-primary w-full text-xs">Save Log Entry</button>
                    </form>

                    <h4 className="text-xs font-bold uppercase mb-4">Activity History</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {logs.map(log => (
                            <div key={log.id} className="text-xs border-l-2 border-blue-200 pl-3 py-1">
                                <div className="flex justify-between font-bold">
                                    <span>{log.action_type}</span>
                                    <span className="text-[10px] text-muted">{new Date(log.performed_at).toLocaleDateString()}</span>
                                </div>
                                <div className="text-muted italic">{log.notes || 'No notes'}</div>
                                <div className="text-[9px] text-slate-400">by {log.performed_by_email}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="glass-panel flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="text-4xl mb-4">📑</div>
                    <p className="text-sm text-center">Select an asset to view its full Lifecycle Passport and Logs.</p>
                </div>
            )}
        </div>
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-6">
                <h3 style={{ margin: 0 }}>Register Certified Laboratory Asset</h3>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">ISO 17025 ASSET CONTROL</span>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Equipment Name *</label>
                        <input required className="w-full p-2 border rounded text-sm" placeholder="e.g. ICP-MS Spectrometer" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Internal Asset Tag (ID)</label>
                        <input className="w-full p-2 border rounded text-sm" placeholder="e.g. LAB-EQ-001" value={form.internal_asset_id} onChange={e => setForm({...form, internal_asset_id: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Manufacturer</label>
                        <input className="w-full p-2 border rounded text-sm" placeholder="e.g. Agilent" value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Model</label>
                        <input className="w-full p-2 border rounded text-sm" placeholder="7900 Series" value={form.model_number} onChange={e => setForm({...form, model_number: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Serial Number *</label>
                        <input required className="w-full p-2 border rounded text-sm" placeholder="SN-8822-X" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Current Location</label>
                        <input className="w-full p-2 border rounded text-sm" placeholder="Inorganic Suite" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Criticality</label>
                        <select className="w-full p-2 border rounded text-sm" value={form.criticality} onChange={e => setForm({...form, criticality: e.target.value})}>
                            <option value="NON-CRITICAL">Non-Critical</option>
                            <option value="CRITICAL">⚠️ Critical (Primary)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Cal. Interval (Mo)</label>
                        <input type="number" className="w-full p-2 border rounded text-sm" value={form.calibration_interval_months} onChange={e => setForm({...form, calibration_interval_months: e.target.value})} />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Purchase Date</label>
                        <input type="date" className="w-full p-2 border rounded text-sm" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Last Cal. Date</label>
                        <input type="date" required className="w-full p-2 border rounded text-sm" value={form.calibration_date} onChange={e => setForm({...form, calibration_date: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold mb-1 uppercase text-slate-500">Cal. Expiry Date</label>
                        <input type="date" required className="w-full p-2 border rounded text-sm" value={form.calibration_expiry} onChange={e => setForm({...form, calibration_expiry: e.target.value})} />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                    <button type="submit" className="btn-primary">Commit Asset to Ledger</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
