import { useState, useEffect } from "react";
import API from "../services/api";

export default function CompetencyAssessment() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [users, setUsers] = useState([]);
    const [methods, setMethods] = useState([]);
    
    const [form, setForm] = useState({ user_id: '', method_id: '', technique_name: '', next_assessment_date: '', status: 'COMPETENT', notes: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [recRes, usersRes, methodsRes] = await Promise.all([
                API.get("/api/competency"),
                API.get("/api/users"), // Assume we have an endpoint for this, or we just type it in if not
                API.get("/api/methods")
            ]);
            setRecords(recRes.data.data || []);
            // Assuming users list is returned, otherwise we might need a dedicated endpoint
            setUsers(usersRes.data.data?.filter(u => u.role === 'lab') || []); 
            setMethods(methodsRes.data.data || []);
        } catch { 
            // Fallback if users/methods endpoints don't behave as expected in this context
            try {
                const recRes = await API.get("/api/competency");
                setRecords(recRes.data.data || []);
            } catch { setRecords([]); }
        }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await API.post("/api/competency", form);
            setShowModal(false);
            fetchData();
        } catch (err) { alert(err.response?.data?.message || "Failed"); }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await API.patch(`/api/competency/${id}`, { status: newStatus });
            fetchData();
        } catch (err) { alert(err.response?.data?.message || "Failed"); }
    };

    const statusBadge = (s) => {
        if(s === 'COMPETENT') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        if(s === 'SUSPENDED') return 'bg-red-500/20 text-red-400 border-red-500/30';
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Staff <span className="text-purple-500">Competency</span></h2>
                    <p className="text-slate-400 text-sm mt-1">ISO 17025 §6.2.5 — Authorization and competency monitoring for analytical staff.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all">
                    + Record Assessment
                </button>
            </div>

            <div className="glass-panel p-0 overflow-hidden">
                <table className="data-table text-sm w-full">
                    <thead>
                        <tr>
                            <th>Technician</th>
                            <th>Method / Technique</th>
                            <th>Status</th>
                            <th>Assessed By</th>
                            <th>Date / Next Due</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr> : records.map(rec => (
                            <tr key={rec.id}>
                                <td className="font-bold text-white">{rec.technician_email?.split('@')[0]}</td>
                                <td>
                                    {rec.method_code ? (
                                        <div>
                                            <div className="font-bold text-slate-300">{rec.method_code}</div>
                                            <div className="text-[10px] text-slate-500">{rec.method_name}</div>
                                        </div>
                                    ) : (
                                        <div className="font-bold text-slate-400">{rec.technique_name}</div>
                                    )}
                                </td>
                                <td><span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${statusBadge(rec.status)}`}>{rec.status}</span></td>
                                <td className="text-xs text-slate-400">{rec.assessor_email?.split('@')[0] || 'System'}</td>
                                <td>
                                    <div className="text-xs text-slate-300">Done: {new Date(rec.assessment_date).toLocaleDateString()}</div>
                                    <div className={`text-xs ${rec.next_assessment_date && new Date(rec.next_assessment_date) < new Date() ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                                        Due: {rec.next_assessment_date || '--'}
                                    </div>
                                </td>
                                <td>
                                    <select 
                                        className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[10px] font-bold text-slate-300"
                                        value={rec.status}
                                        onChange={(e) => handleStatusChange(rec.id, e.target.value)}
                                    >
                                        <option value="COMPETENT">Set Competent</option>
                                        <option value="IN_TRAINING">Set In Training</option>
                                        <option value="SUSPENDED">Suspend Authorization</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="glass-panel w-full max-w-lg p-6">
                        <h3 className="text-xl font-black text-white mb-4">Record Competency Assessment</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase">Technician User ID</label>
                                <input required type="number" className="w-full mt-1 p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="User ID" value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} />
                            </div>
                            
                            <div className="p-3 border border-white/5 bg-white/5 rounded-lg space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Assessment Target (Provide one)</p>
                                <select className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm text-slate-300" value={form.method_id} onChange={e => setForm({...form, method_id: e.target.value})}>
                                    <option value="">-- Select Specific Method --</option>
                                    {methods.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                                </select>
                                <div className="text-center text-xs font-bold text-slate-600">OR</div>
                                <input className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="General Technique (e.g. Pipetting, Weighing)" value={form.technique_name} onChange={e => setForm({...form, technique_name: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase">Assessment Status</label>
                                    <select className="w-full mt-1 p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                                        <option value="COMPETENT">Competent (Authorized)</option>
                                        <option value="IN_TRAINING">In Training</option>
                                        <option value="SUSPENDED">Suspended</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase">Next Assessment Due</label>
                                    <input type="date" required className="w-full mt-1 p-3 bg-slate-900 border border-white/10 rounded-lg text-sm text-slate-300" value={form.next_assessment_date} onChange={e => setForm({...form, next_assessment_date: e.target.value})} />
                                </div>
                            </div>
                            
                            <textarea className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm h-20" placeholder="Assessment Notes (e.g. Passed blind sample #1234)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-800 text-white font-black text-[10px] uppercase rounded-xl">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-purple-600 text-white font-black text-[10px] uppercase rounded-xl">Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
