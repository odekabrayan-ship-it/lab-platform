import { useState, useEffect } from "react";
import API from "../services/api";

export default function ProficiencyTesting() {
    const [pts, setPts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ scheme_name: '', provider: '', analyte: '', round_year: new Date().getFullYear(), assigned_value: '', standard_deviation: '', unit: '' });
    const [submitResultId, setSubmitResultId] = useState(null);
    const [resultForm, setResultForm] = useState({ our_result: '', investigation_notes: '' });

    const fetchPts = async () => {
        setLoading(true);
        try {
            const res = await API.get("/api/proficiency-tests");
            setPts(res.data.data || []);
        } catch { setPts([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchPts(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await API.post("/api/proficiency-tests", form);
            setShowModal(false);
            fetchPts();
        } catch (err) { alert(err.response?.data?.message || "Failed"); }
    };

    const handleSubmitResult = async (e) => {
        e.preventDefault();
        try {
            const res = await API.patch(`/api/proficiency-tests/${submitResultId}/submit`, resultForm);
            if (res.data.data.ncr_raised) {
                alert(`WARNING: Z-Score ${res.data.data.z_score} is UNSATISFACTORY. NCR #${res.data.data.ncr_id} has been automatically raised.`);
            }
            setSubmitResultId(null);
            fetchPts();
        } catch (err) { alert(err.response?.data?.message || "Failed"); }
    };

    const statusColor = (s) => {
        if(s === 'SATISFACTORY') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if(s === 'UNSATISFACTORY') return 'text-red-400 bg-red-500/10 border-red-500/20';
        if(s === 'QUESTIONABLE') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Proficiency <span className="text-emerald-500">Testing</span></h2>
                    <p className="text-slate-400 text-sm mt-1">ISO 17025 §7.7.2 — External Quality Assessment and Z-Score Tracking.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all">
                    + Register PT Scheme
                </button>
            </div>

            <div className="glass-panel p-0 overflow-hidden">
                <table className="data-table text-sm w-full">
                    <thead>
                        <tr>
                            <th>Scheme / Provider</th>
                            <th>Analyte</th>
                            <th>Assigned Value</th>
                            <th>Our Result</th>
                            <th>Z-Score</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? <tr><td colSpan="7" className="text-center py-8">Loading...</td></tr> : pts.map(pt => (
                            <tr key={pt.id}>
                                <td>
                                    <div className="font-bold text-white">{pt.scheme_name}</div>
                                    <div className="text-[10px] text-slate-500">{pt.provider} ({pt.round_year})</div>
                                </td>
                                <td className="font-bold text-slate-300">{pt.analyte}</td>
                                <td>
                                    {pt.assigned_value ? `${pt.assigned_value} ± ${pt.standard_deviation} ${pt.unit||''}` : <span className="text-slate-600">Pending</span>}
                                </td>
                                <td className="font-bold text-white">{pt.our_result || '--'} {pt.our_result && pt.unit}</td>
                                <td>
                                    {pt.z_score !== null ? (
                                        <span className={`font-black ${Math.abs(pt.z_score) > 2 ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {pt.z_score}
                                        </span>
                                    ) : '--'}
                                </td>
                                <td>
                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${statusColor(pt.status)}`}>
                                        {pt.status}
                                    </span>
                                </td>
                                <td>
                                    {pt.status === 'PENDING' && (
                                        <button onClick={() => { setSubmitResultId(pt.id); setResultForm({ our_result: '', investigation_notes: ''}); }} className="text-[10px] font-bold text-blue-400 hover:underline">Submit Result</button>
                                    )}
                                    {pt.ncr_id && <span className="ml-2 text-[10px] font-bold text-red-400">NCR Raised</span>}
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
                        <h3 className="text-xl font-black text-white mb-4">Register PT Scheme</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input required className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="Scheme Name (e.g. FAPAS)" value={form.scheme_name} onChange={e => setForm({...form, scheme_name: e.target.value})} />
                            <input required className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="Provider" value={form.provider} onChange={e => setForm({...form, provider: e.target.value})} />
                            <input required className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="Analyte (e.g. Lead, Salmonella)" value={form.analyte} onChange={e => setForm({...form, analyte: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" step="any" className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="Assigned Value" value={form.assigned_value} onChange={e => setForm({...form, assigned_value: e.target.value})} />
                                <input type="number" step="any" className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="Standard Deviation" value={form.standard_deviation} onChange={e => setForm({...form, standard_deviation: e.target.value})} />
                            </div>
                            <input className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="Unit (e.g. mg/kg)" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-800 text-white font-black text-[10px] uppercase rounded-xl">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-black text-[10px] uppercase rounded-xl">Register</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Submit Result Modal */}
            {submitResultId && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="glass-panel w-full max-w-lg p-6 border-l-4 border-blue-500">
                        <h3 className="text-xl font-black text-white mb-2">Submit PT Result</h3>
                        <p className="text-xs text-slate-400 mb-4">Entering this result will automatically calculate the Z-score and trigger an NCR if |z| &gt; 2.0.</p>
                        <form onSubmit={handleSubmitResult} className="space-y-4">
                            <input required type="number" step="any" className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm text-2xl font-black" placeholder="Our Result" value={resultForm.our_result} onChange={e => setResultForm({...resultForm, our_result: e.target.value})} />
                            <textarea className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm h-24" placeholder="Investigation Notes (Optional)" value={resultForm.investigation_notes} onChange={e => setResultForm({...resultForm, investigation_notes: e.target.value})} />
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setSubmitResultId(null)} className="flex-1 py-3 bg-slate-800 text-white font-black text-[10px] uppercase rounded-xl">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-black text-[10px] uppercase rounded-xl">Calculate Z-Score</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
