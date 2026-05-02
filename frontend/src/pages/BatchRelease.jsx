import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

// ── Conformance Badge ──────────────────────────────────────────────────────────
function ConformanceBadge({ status }) {
    const map = {
        PASS: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        FAIL: 'bg-red-500/20 text-red-400 border-red-500/30',
        NOT_EVALUATED: 'bg-slate-800 text-slate-500 border-slate-700',
    };
    const labels = { PASS: '✓ PASS', FAIL: '✕ FAIL', NOT_EVALUATED: '— N/A' };
    return (
        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${map[status] || map.NOT_EVALUATED}`}>
            {labels[status] || status}
        </span>
    );
}

// ── Decision Badge ──────────────────────────────────────────────────────────────
function DecisionBadge({ decision }) {
    const map = {
        RELEASED:    'bg-emerald-500/20 text-emerald-400',
        QUARANTINED: 'bg-amber-500/20 text-amber-400',
        REJECTED:    'bg-red-500/20 text-red-400',
    };
    const icons = { RELEASED: '🟢', QUARANTINED: '🟡', REJECTED: '🔴' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${map[decision]}`}>
            {icons[decision]} {decision}
        </span>
    );
}

// ── Conformance Panel (inline for pending batches) ─────────────────────────────
function ConformancePanel({ requestId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        API.get(`/api/requests/${requestId}/conformance`)
            .then(r => setData(r.data.data))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [requestId]);
    if (loading) return <div className="text-[10px] text-slate-500 py-2">Loading conformance data...</div>;
    if (!data || data.results.length === 0) return <div className="text-[10px] text-slate-600 py-2">No validated results yet.</div>;
    return (
        <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-4 mb-3">
                <div className={`text-sm font-black ${data.summary.all_pass ? 'text-emerald-400' : 'text-red-400'}`}>
                    {data.summary.all_pass ? '✅ FULL CONFORMANCE' : `⚠️ ${data.summary.fail} PARAMETER(S) OUT OF SPEC`}
                </div>
                <span className="text-[9px] text-slate-500 font-bold uppercase">{data.summary.pass} pass / {data.summary.fail} fail / {data.summary.not_evaluated} N/A</span>
            </div>
            {data.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-lg">
                    <div>
                        <span className="text-xs font-bold text-white">{r.parameter_name}</span>
                        <span className="text-[10px] text-slate-400 ml-2">{r.value} {r.unit}</span>
                        {r.spec_linked && <span className="text-[9px] text-blue-400 ml-2">(spec: {r.limit_type} {r.limit_value} {r.spec_unit})</span>}
                    </div>
                    <ConformanceBadge status={r.conformance} />
                </div>
            ))}
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BatchRelease() {
    const [pending, setPending] = useState([]);
    const [history, setHistory] = useState([]);
    const [loadingPending, setLoadingPending] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [decisionModal, setDecisionModal] = useState(null); // { id, batch_number }
    const [form, setForm] = useState({ decision: 'RELEASED', decision_notes: '' });
    const [submitting, setSubmitting] = useState(false);
    const [tab, setTab] = useState('PENDING');

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const fetchPending = () => {
        API.get('/api/batch-releases/pending')
            .then(r => setPending(r.data.data || []))
            .catch(() => {})
            .finally(() => setLoadingPending(false));
    };
    const fetchHistory = () => {
        API.get('/api/batch-releases')
            .then(r => setHistory(r.data.data || []))
            .catch(() => {})
            .finally(() => setLoadingHistory(false));
    };

    useEffect(() => { fetchPending(); fetchHistory(); }, []);

    const handleDecision = async (e) => {
        e.preventDefault();
        if (!form.decision_notes.trim()) return alert('Decision notes are required for audit purposes.');
        setSubmitting(true);
        try {
            const res = await API.post('/api/batch-releases', {
                request_id: decisionModal.id,
                decision: form.decision,
                decision_notes: form.decision_notes,
            });
            alert(`✅ Decision recorded.\nCertificate: ${res.data.data.certificate_number}`);
            setDecisionModal(null);
            setForm({ decision: 'RELEASED', decision_notes: '' });
            fetchPending();
            fetchHistory();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to record decision');
        } finally {
            setSubmitting(false);
        }
    };

    const DECISIONS = [
        { value: 'RELEASED',    label: '🟢 Release for Distribution',  desc: 'All parameters conform. Batch approved for sale/use.', color: 'border-emerald-500/50 bg-emerald-500/5' },
        { value: 'QUARANTINED', label: '🟡 Quarantine for Investigation', desc: 'One or more results require further investigation before release.', color: 'border-amber-500/50 bg-amber-500/5' },
        { value: 'REJECTED',    label: '🔴 Reject Batch',              desc: 'Batch fails to meet specification. Initiate CAPA/destruction.', color: 'border-red-500/50 bg-red-500/5' },
    ];

    return (
        <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Batch <span className="text-indigo-400">Release Control</span></h2>
                    <p className="text-slate-400 text-sm mt-1">GMP / ISO 9001 §8.6 — Formal batch release decisions with full audit trail.</p>
                </div>
                <div className="flex items-center gap-3">
                    {pending.length > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-pulse">
                            <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                            <span className="text-[10px] font-black text-amber-400 uppercase">{pending.length} Awaiting Release Decision</span>
                        </div>
                    )}
                    <Link to="/create-request" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase no-underline transition-all">
                        + New Test Request
                    </Link>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Pending Release', val: pending.length, icon: '⏳', color: 'text-amber-400' },
                    { label: 'Released', val: history.filter(h => h.decision === 'RELEASED').length, icon: '🟢', color: 'text-emerald-400' },
                    { label: 'Quarantined', val: history.filter(h => h.decision === 'QUARANTINED').length, icon: '🟡', color: 'text-amber-400' },
                    { label: 'Rejected', val: history.filter(h => h.decision === 'REJECTED').length, icon: '🔴', color: 'text-red-400' },
                ].map(k => (
                    <div key={k.label} className="glass-panel p-5 flex items-center gap-4">
                        <span className="text-2xl">{k.icon}</span>
                        <div>
                            <div className={`text-2xl font-black ${k.color}`}>{k.val}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{k.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/5 pb-0">
                {[['PENDING', 'Pending Release', pending.length], ['HISTORY', 'Release History', history.length]].map(([val, label, count]) => (
                    <button key={val} onClick={() => setTab(val)} className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 -mb-[1px] ${tab === val ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                        {label} <span className="ml-1.5 px-1.5 py-0.5 bg-white/5 rounded-full text-slate-400">{count}</span>
                    </button>
                ))}
            </div>

            {/* PENDING TAB */}
            {tab === 'PENDING' && (
                <div className="space-y-4">
                    {loadingPending ? (
                        <div className="text-slate-400 py-8 text-center">Loading pending batches...</div>
                    ) : pending.length === 0 ? (
                        <div className="glass-panel p-12 text-center border border-dashed border-white/10">
                            <div className="text-4xl mb-4">✅</div>
                            <h3 className="text-white font-black text-lg mb-2">All Batches Released</h3>
                            <p className="text-slate-500 text-sm">No completed test batches are awaiting a formal release decision.</p>
                        </div>
                    ) : pending.map(batch => (
                        <div key={batch.id} className={`glass-panel border ${batch.fail_count > 0 ? 'border-red-500/30 bg-red-500/[0.02]' : 'border-white/5'}`}>
                            {/* Batch Header */}
                            <div className="p-6 flex items-start justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === batch.id ? null : batch.id)}>
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${batch.fail_count > 0 ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                                        {batch.fail_count > 0 ? '⚠️' : '⏳'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-sm font-black text-white">Request #{batch.id}</span>
                                            {batch.batch_number && <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">Batch: {batch.batch_number}</span>}
                                            {batch.fail_count > 0 && <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full animate-pulse">{batch.fail_count} RESULT(S) OUT OF SPEC</span>}
                                        </div>
                                        <p className="text-xs text-slate-400 max-w-lg line-clamp-2">{batch.test_description}</p>
                                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-bold uppercase">
                                            <span>Lab: <span className="text-slate-300">{batch.lab_name}</span></span>
                                            {batch.po_number && <><span className="opacity-30">|</span><span>PO: {batch.po_number}</span></>}
                                            <span className="opacity-30">|</span>
                                            <span>{batch.validated_results} validated results</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                    {batch.report_id && (
                                        <Link to="/vault" className="text-[9px] font-bold text-slate-400 hover:text-white uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-lg no-underline transition-all" onClick={e => e.stopPropagation()}>View CoA →</Link>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setDecisionModal(batch); }} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase rounded-xl transition-all">
                                        Record Decision
                                    </button>
                                    <span className="text-slate-600 text-lg">{expandedId === batch.id ? '▲' : '▼'}</span>
                                </div>
                            </div>

                            {/* Expanded Conformance Panel */}
                            {expandedId === batch.id && (
                                <div className="border-t border-white/5 p-6 bg-black/20">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Conformance Check — Parameter vs. Specification</h4>
                                    <ConformancePanel requestId={batch.id} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* HISTORY TAB */}
            {tab === 'HISTORY' && (
                <div className="glass-panel overflow-hidden">
                    {loadingHistory ? (
                        <div className="p-8 text-center text-slate-400">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-3xl mb-3 opacity-30">📋</div>
                            <p className="text-slate-500 text-sm font-bold">No release decisions recorded yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {['Certificate #', 'Batch', 'PO', 'Lab', 'Decision', 'Released By', 'Date', ''].map(h => (
                                        <th key={h} className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {history.map(r => (
                                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-4 font-black text-white text-xs font-mono">{r.release_certificate_number}</td>
                                        <td className="px-4 py-4 text-xs text-slate-300">{r.batch_number || <span className="text-slate-600">—</span>}</td>
                                        <td className="px-4 py-4 text-xs text-slate-400">{r.po_number || <span className="text-slate-600">—</span>}</td>
                                        <td className="px-4 py-4 text-xs text-slate-300 font-bold">{r.lab_name}</td>
                                        <td className="px-4 py-4"><DecisionBadge decision={r.decision} /></td>
                                        <td className="px-4 py-4 text-[10px] text-slate-400">{r.released_by_email}</td>
                                        <td className="px-4 py-4 text-[10px] text-slate-500">{new Date(r.released_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</td>
                                        <td className="px-4 py-4">
                                            <button className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors" onClick={() => alert(`Certificate: ${r.release_certificate_number}\nDecision: ${r.decision}\nNotes: ${r.decision_notes}\nBy: ${r.released_by_email}`)}>View ↗</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* DECISION MODAL */}
            {decisionModal && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[300] flex items-center justify-center p-6" onClick={() => setDecisionModal(null)}>
                    <div className="glass-panel w-full max-w-lg border-t-4 border-indigo-500" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/5">
                            <h3 className="text-xl font-black text-white">Batch Release Decision</h3>
                            <p className="text-xs text-slate-400 mt-1">This decision is permanent and will be recorded in the compliance audit trail with your identity and timestamp.</p>
                            <div className="mt-3 flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase">
                                <span>Request #{decisionModal.id}</span>
                                {decisionModal.batch_number && <><span>·</span><span className="text-blue-400">Batch: {decisionModal.batch_number}</span></>}
                                {decisionModal.fail_count > 0 && <span className="text-red-400">· {decisionModal.fail_count} FAILURES DETECTED</span>}
                            </div>
                        </div>
                        <form onSubmit={handleDecision} className="p-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Release Decision *</label>
                                <div className="mt-3 space-y-2">
                                    {DECISIONS.map(d => (
                                        <label key={d.value} className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${form.decision === d.value ? d.color : 'border-white/5 bg-transparent hover:bg-white/[0.02]'}`}>
                                            <input type="radio" name="decision" value={d.value} checked={form.decision === d.value} onChange={e => setForm({ ...form, decision: e.target.value })} className="mt-0.5" />
                                            <div>
                                                <div className="text-sm font-black text-white">{d.label}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{d.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Decision Basis / Notes * <span className="text-slate-600 font-normal normal-case">(Required for audit trail)</span></label>
                                <textarea required rows={4} className="mt-2 w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm text-slate-200 resize-none" placeholder={`State the basis for your decision. Reference report #, conformance status, any deviations noted, and QA authority sign-off statement.\n\nE.g. "All 12 parameters conform to KEBS KS 05-459. CoA ${decisionModal.report_number || 'available'}. Authorized for release by QA Manager."`} value={form.decision_notes} onChange={e => setForm({ ...form, decision_notes: e.target.value })} />
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                <span className="text-base">🔐</span>
                                <p className="text-[10px] text-blue-400 font-bold">This action will be recorded as: <strong>{user.email}</strong> · {new Date().toLocaleString()}</p>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setDecisionModal(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase rounded-xl transition-all">Cancel</button>
                                <button type="submit" disabled={submitting || !form.decision_notes.trim()} className={`flex-1 py-3 font-black text-[10px] uppercase rounded-xl transition-all text-white disabled:opacity-40 disabled:cursor-not-allowed ${form.decision === 'RELEASED' ? 'bg-emerald-600 hover:bg-emerald-500' : form.decision === 'QUARANTINED' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-red-700 hover:bg-red-600'}`}>
                                    {submitting ? 'Recording...' : `Confirm ${form.decision} Decision`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
