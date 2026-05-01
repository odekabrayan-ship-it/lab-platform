import { useState, useEffect } from "react";
import API from "../services/api";

export default function ProcurementManager() {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ item_name: "", quantity: "", unit: "", estimated_cost: "", priority: "Normal" });
  const [reviewing, setReviewing] = useState(null);
  const [notes, setNotes] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const loadData = async () => {
    try {
      const res = await API.get("/api/procurement");
      setRequisitions(res.data.data);
    } catch (err) { console.error("Procurement load failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/procurement", form);
      setShowModal(false);
      setForm({ item_name: "", quantity: "", unit: "", estimated_cost: "", priority: "Normal" });
      loadData();
    } catch (err) { alert("Failed to submit requisition"); }
  };

  const handleAction = async (id, type) => {
    try {
      if (type === 'approve') await API.patch(`/api/procurement/${id}/approve`, { notes });
      if (type === 'commit') await API.patch(`/api/procurement/${id}/commit`, { notes, action: 'APPROVED' });
      if (type === 'receive') await API.patch(`/api/procurement/${id}/receive`);
      
      setReviewing(null);
      setNotes("");
      loadData();
      alert(`Action ${type} successful`);
    } catch (err) { alert("Action failed"); }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-gradient">Acquisition & Procurement</h2>
          <p className="text-muted">Manage the lifecycle of laboratory reagents, consumables, and instruments.</p>
        </div>
        {user.sub_role === 'TECHNICIAN' && (
            <button className="btn-primary py-2 px-6 font-bold" onClick={() => setShowModal(true)}>
                + New Requisition
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
          <div className="glass-panel p-0 overflow-hidden">
              <table className="data-table">
                  <thead>
                      <tr>
                          <th>Item / Specs</th>
                          <th>Qty / Unit</th>
                          <th>Est. Cost</th>
                          <th>Priority</th>
                          <th>Lifecycle Status</th>
                          <th>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {requisitions.map(item => (
                          <tr key={item.id}>
                              <td>
                                  <div className="font-bold text-slate-200">{item.item_name}</div>
                                  <div className="text-[10px] text-muted">Requested by: {item.requester_email}</div>
                              </td>
                              <td>{item.quantity} {item.unit}</td>
                              <td className="font-mono text-xs">${item.estimated_cost?.toLocaleString()}</td>
                              <td>
                                  <span className={`pill ${item.priority === 'Critical' ? 'pill-danger' : item.priority === 'Urgent' ? 'pill-warning' : 'pill-secondary'}`}>
                                      {item.priority}
                                  </span>
                              </td>
                              <td>
                                  <div className="flex flex-col gap-1">
                                      <span className={`pill text-[10px] ${item.status === 'RECEIVED' ? 'pill-success' : 'pill-primary'}`}>{item.status}</span>
                                      {item.manager_notes && <div className="text-[9px] text-slate-500 italic">MGR: {item.manager_notes}</div>}
                                      {item.accountant_notes && <div className="text-[9px] text-slate-500 italic">FIN: {item.accountant_notes}</div>}
                                  </div>
                              </td>
                              <td>
                                  <div className="flex gap-2">
                                      {user.sub_role === 'LAB_MANAGER' && item.status === 'PENDING_MANAGER' && (
                                          <button className="btn-sm bg-blue-600 text-white" onClick={() => setReviewing({ ...item, type: 'approve' })}>Approve Tech</button>
                                      )}
                                      {user.sub_role === 'ACCOUNTANT' && item.status === 'PENDING_FINANCE' && (
                                          <button className="btn-sm bg-green-600 text-white" onClick={() => setReviewing({ ...item, type: 'commit' })}>Commit Funds</button>
                                      )}
                                      {(item.status === 'APPROVED' || item.status === 'ORDERED') && (
                                          <button className="btn-sm bg-slate-700 text-white" onClick={() => handleAction(item.id, 'receive')}>Receive Item</button>
                                      )}
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {showModal && (
          <div className="modal-overlay">
              <div className="glass-panel w-full max-w-md">
                  <h3 className="mb-4">New Requisition</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Item Name / Specification</label>
                          <input required className="w-full p-2 border rounded" placeholder="e.g. HPLC Column C18" value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Quantity</label>
                            <input required type="number" className="w-full p-2 border rounded" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Unit</label>
                            <input required className="w-full p-2 border rounded" placeholder="vials, L, pk" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
                          </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Est. Cost ($)</label>
                          <input type="number" step="0.01" className="w-full p-2 border rounded" value={form.estimated_cost} onChange={e => setForm({...form, estimated_cost: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Priority</label>
                          <select className="w-full p-2 border rounded" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                              <option>Normal</option>
                              <option>Urgent</option>
                              <option>Critical</option>
                          </select>
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                          <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                          <button type="submit" className="btn-primary">Submit Requisition</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {reviewing && (
          <div className="modal-overlay">
              <div className="glass-panel w-full max-w-md">
                  <h3 className="mb-2 uppercase tracking-tighter text-sm font-black">
                      {reviewing.type === 'approve' ? 'Technical Approval' : 'Financial Commitment'}
                  </h3>
                  <p className="text-xs text-muted mb-4">Item: {reviewing.item_name} ({reviewing.quantity} {reviewing.unit})</p>
                  
                  <div className="mb-4">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Authorization Notes</label>
                      <textarea className="w-full p-2 border rounded text-xs" rows="3" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enter comments or procurement instructions..." />
                  </div>

                  <div className="flex justify-end gap-3">
                      <button className="btn-secondary" onClick={() => setReviewing(null)}>Cancel</button>
                      <button className="btn-primary px-6" onClick={() => handleAction(reviewing.id, reviewing.type)}>
                          Confirm {reviewing.type === 'approve' ? 'Review' : 'Payment'} →
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
