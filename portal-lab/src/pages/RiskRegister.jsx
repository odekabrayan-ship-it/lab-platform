import { useState, useEffect } from "react";
import API from "../services/api";

// P3-5: Risk Register Module (ISO 17025 §8.5 / ISO 31000)

const LIKELIHOOD_LABELS = ['', 'Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS     = ['', 'Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

const riskColor = (score) => {
    if (score >= 15) return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'CRITICAL' };
    if (score >= 9)  return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'HIGH' };
    if (score >= 5)  return { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'MEDIUM' };
    return              { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'LOW' };
};

const RISK_CATEGORIES = [
    'Impartiality', 'Technical Competence', 'Equipment & Calibration', 
    'Sample Integrity', 'IT & Data Security', 'Regulatory & Accreditation',
    'Supplier', 'Environmental', 'Personnel', 'Customer'
];

const emptyRisk = () => ({
    title: '', description: '', category: 'Impartiality', likelihood: 3, impact: 3,
    mitigation_plan: '', owner: '', review_date: '', residual_likelihood: 1, residual_impact: 1
});

export default function RiskRegister() {
    const [risks, setRisks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editRisk, setEditRisk] = useState(null);
    const [form, setForm] = useState(emptyRisk());
    const [submitting, setSubmitting] = useState(false);
    const [filterCategory, setFilterCategory] = useState('ALL');

    const fetchRisks = async () => {
        setLoading(true);
        try {
            const res = await API.get("/api/risk-register");
            setRisks(res.data.data || []);
        } catch { setRisks([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRisks(); }, []);

    const handleOpen = (risk = null) => {
        setEditRisk(risk);
        setForm(risk ? { ...risk } : emptyRisk());
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editRisk) {
                await API.patch(`/api/risk-register/${editRisk.id}`, form);
            } else {
                await API.post("/api/risk-register", form);
            }
            setShowModal(false);
            fetchRisks();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to save risk");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Remove this risk from the register?")) return;
        await API.delete(`/api/risk-register/${id}`);
        fetchRisks();
    };

    const filtered = filterCategory === 'ALL' ? risks : risks.filter(r => r.category === filterCategory);
    const inherentScores = risks.map(r => (r.likelihood || 1) * (r.impact || 1));
    const criticalCount = risks.filter(r => r.likelihood * r.impact >= 15).length;
    const highCount = risks.filter(r => { const s = r.likelihood * r.impact; return s >= 9 && s < 15; }).length;

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Risk <span className="text-purple-500">Register</span></h2>
                    <p className="text-slate-400 text-sm mt-1">ISO 17025 §8.5 / ISO 31000 — Systematic identification and mitigation of operational risks.</p>
                </div>
                <button onClick={() => handleOpen()} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all">
                    + Add Risk
                </button>
            </div>

            {/* Risk Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Total Risks', value: risks.length, color: 'text-white' },
                    { label: 'Critical', value: criticalCount, color: 'text-red-400' },
                    { label: 'High', value: highCount, color: 'text-orange-400' },
                    { label: 'Low/Medium', value: risks.length - criticalCount - highCount, color: 'text-emerald-400' }
                ].map(s => (
                    <div key={s.label} className="glass-panel p-5 text-center">
                        <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Risk Heat Map */}
            <div className="glass-panel p-6">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Risk Heat Map</h3>
                <div className="grid grid-cols-6 gap-1 max-w-md">
                    <div className="text-[8px] font-black text-slate-600 flex items-center justify-center">Impact →</div>
                    {[1,2,3,4,5].map(i => <div key={i} className="text-[8px] font-black text-slate-500 text-center py-1">{i}</div>)}
                    {[5,4,3,2,1].map(l => (
                        [null,...[1,2,3,4,5]].map((imp, impIdx) => {
                            if (impIdx === 0) return <div key={`l${l}`} className="text-[8px] font-black text-slate-500 flex items-center justify-center">L{l}</div>;
                            const score = l * imp;
                            const c = riskColor(score);
                            const count = risks.filter(r => r.likelihood === l && r.impact === imp).length;
                            return (
                                <div key={`${l}-${imp}`} className={`aspect-square rounded flex items-center justify-center text-[10px] font-black ${c.bg} ${c.text}`}>
                                    {count > 0 ? count : ''}
                                </div>
                            );
                        })
                    ))}
                </div>
                <div className="flex gap-4 mt-4 text-[8px]">
                    {[{l:'Critical (≥15)',c:'text-red-400'},{l:'High (9-14)',c:'text-orange-400'},{l:'Medium (5-8)',c:'text-amber-400'},{l:'Low (<5)',c:'text-emerald-400'}].map(x => (
                        <div key={x.l} className={`font-black ${x.c}`}>{x.l}</div>
                    ))}
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
                {['ALL', ...RISK_CATEGORIES].map(cat => (
                    <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border transition-all ${filterCategory === cat ? 'bg-purple-600 text-white border-purple-500' : 'border-white/10 text-slate-500 hover:text-white'}`}>
                        {cat}
                    </button>
                ))}
            </div>

            {/* Risk Table */}
            <div className="glass-panel p-0 overflow-hidden">
                <table className="data-table text-sm">
                    <thead>
                        <tr>
                            <th>Risk Title</th>
                            <th>Category</th>
                            <th>Inherent Risk</th>
                            <th>Mitigation Plan</th>
                            <th>Residual Risk</th>
                            <th>Owner</th>
                            <th>Review Due</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan="8" className="text-center py-8">Loading risk register...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="8" className="text-center py-10 text-slate-600">No risks registered. Add your first risk.</td></tr>
                        ) : filtered.map(r => {
                            const inherent = (r.likelihood || 1) * (r.impact || 1);
                            const residual = (r.residual_likelihood || 1) * (r.residual_impact || 1);
                            const ic = riskColor(inherent);
                            const rc = riskColor(residual);
                            return (
                                <tr key={r.id}>
                                    <td>
                                        <div className="font-bold text-white">{r.title}</div>
                                        <div className="text-[10px] text-slate-500 line-clamp-2">{r.description}</div>
                                    </td>
                                    <td>
                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[9px] font-bold uppercase">{r.category}</span>
                                    </td>
                                    <td>
                                        <div className="text-center">
                                            <span className={`px-2 py-1 rounded text-sm font-black ${ic.bg} ${ic.text}`}>{inherent}</span>
                                            <div className="text-[8px] text-slate-600 mt-0.5">{ic.label}</div>
                                            <div className="text-[8px] text-slate-500">{LIKELIHOOD_LABELS[r.likelihood]}×{IMPACT_LABELS[r.impact]}</div>
                                        </div>
                                    </td>
                                    <td className="text-[11px] text-slate-400 max-w-xs">{r.mitigation_plan || '—'}</td>
                                    <td>
                                        <div className="text-center">
                                            <span className={`px-2 py-1 rounded text-sm font-black ${rc.bg} ${rc.text}`}>{residual}</span>
                                            <div className="text-[8px] text-slate-600 mt-0.5">{rc.label}</div>
                                        </div>
                                    </td>
                                    <td className="text-xs text-slate-400">{r.owner || '—'}</td>
                                    <td className={`font-mono text-xs ${r.review_date && new Date(r.review_date) < new Date() ? 'text-red-400' : 'text-slate-400'}`}>
                                        {r.review_date ? new Date(r.review_date).toLocaleDateString() : '—'}
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleOpen(r)} className="text-[10px] font-bold text-blue-400 hover:underline">Edit</button>
                                            <button onClick={() => handleDelete(r.id)} className="text-[10px] font-bold text-red-400 hover:underline">Remove</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Risk Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="glass-panel w-full max-w-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black text-white mb-1">{editRisk ? 'Edit Risk' : 'Register New Risk'}</h3>
                        <p className="text-xs text-slate-400 mb-6">ISO 17025 §8.5 — Document the risk, its source, assessment, and mitigation plan.</p>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Risk Title *</label>
                                <input required className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="e.g. Analyst uses expired calibration standard" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Description</label>
                                <textarea className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm h-20" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Category</label>
                                    <select className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                        {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Likelihood (1-5)</label>
                                    <select className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" value={form.likelihood} onChange={e => setForm({...form, likelihood: parseInt(e.target.value)})}>
                                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {LIKELIHOOD_LABELS[n]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Impact (1-5)</label>
                                    <select className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" value={form.impact} onChange={e => setForm({...form, impact: parseInt(e.target.value)})}>
                                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {IMPACT_LABELS[n]}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="p-3 rounded-lg border border-white/5 bg-white/5">
                                <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Inherent Risk Score</div>
                                <div className={`text-2xl font-black ${riskColor(form.likelihood * form.impact).text}`}>
                                    {form.likelihood * form.impact} — {riskColor(form.likelihood * form.impact).label}
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Mitigation Plan</label>
                                <textarea className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm h-20" placeholder="Actions to reduce likelihood or impact..." value={form.mitigation_plan} onChange={e => setForm({...form, mitigation_plan: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Residual Likelihood</label>
                                    <select className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" value={form.residual_likelihood} onChange={e => setForm({...form, residual_likelihood: parseInt(e.target.value)})}>
                                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Residual Impact</label>
                                    <select className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" value={form.residual_impact} onChange={e => setForm({...form, residual_impact: parseInt(e.target.value)})}>
                                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Review Date</label>
                                    <input type="date" className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" value={form.review_date} onChange={e => setForm({...form, review_date: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Risk Owner</label>
                                <input className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="Name / role responsible" value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} />
                            </div>
                            <div className="flex gap-4 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-800 text-white font-black text-[10px] uppercase rounded-xl">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase rounded-xl disabled:opacity-50">
                                    {submitting ? '⏳ Saving...' : editRisk ? '💾 Update Risk' : '⚠️ Register Risk'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
