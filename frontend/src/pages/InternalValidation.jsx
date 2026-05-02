import { useState, useEffect } from "react";
import API from "../services/api";

export default function InternalValidation() {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [reviewNotes, setReviewNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [ncrReason, setNcrReason] = useState("");
    const [showRejectModal, setShowRejectModal] = useState(false);
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const fetchQueue = async () => {
        setLoading(true);
        try {
            // P1-1 FIX: Real API call replacing mock data (ISO 17025 §7.7.1)
            const res = await API.get("/api/internal/validation-queue");
            setQueue(res.data.data || []);
        } catch (e) {
            console.error("Failed to fetch validation queue", e);
            setQueue([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQueue(); }, []);

    const handleApprove = async () => {
        if (!reviewNotes.trim()) {
            alert("Scientific rationale / decision log is required before certifying results.");
            return;
        }
        if (!confirm(`Certify all draft results for Sample ${selectedEntry.sample_code}? This action is IRREVERSIBLE and will lock these results.`)) return;

        setSubmitting(true);
        try {
            await API.patch(`/api/internal/validate/${selectedEntry.sample_id}`, { decision_notes: reviewNotes });
            alert(`✅ ${selectedEntry.sample_code} certified. Results are now locked and the sample is eligible for CoA generation.`);
            setSelectedEntry(null);
            setReviewNotes("");
            fetchQueue();
        } catch (err) {
            alert(err.response?.data?.message || "Certification failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!ncrReason.trim()) {
            alert("NCR description is mandatory (ISO 17025 §8.7).");
            return;
        }
        setSubmitting(true);
        try {
            const res = await API.patch(`/api/internal/reject/${selectedEntry.sample_id}`, {
                rejection_reason: reviewNotes || ncrReason,
                ncr_issue: ncrReason
            });
            alert(`❌ Results rejected. NCR ${res.data.data.ncr_number} created automatically. Technician will be notified to correct and resubmit.`);
            setShowRejectModal(false);
            setSelectedEntry(null);
            setReviewNotes("");
            setNcrReason("");
            fetchQueue();
        } catch (err) {
            alert(err.response?.data?.message || "Rejection failed");
        } finally {
            setSubmitting(false);
        }
    };

    // Helper: determine if a result is OOS (out of spec)
    const isOOS = (result) => {
        if (!result.value || !result.specification_limit) return false;
        const val = parseFloat(result.value);
        const limit = result.specification_limit;
        if (isNaN(val)) return false;
        // Parse "MAX x", "MIN x", "x - y" formats
        const maxMatch = limit.match(/MAX\s+([\d.]+)/i);
        const minMatch = limit.match(/MIN\s+([\d.]+)/i);
        const rangeMatch = limit.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
        if (maxMatch && val > parseFloat(maxMatch[1])) return true;
        if (minMatch && val < parseFloat(minMatch[1])) return true;
        if (rangeMatch && (val < parseFloat(rangeMatch[1]) || val > parseFloat(rangeMatch[2]))) return true;
        return false;
    };

    const hasOOS = selectedEntry?.results?.some(r => isOOS(r));

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">Scientific <span className="text-emerald-500">Validation Unit</span></h2>
                    <p className="text-slate-400 text-sm mt-1">ISO 17025 §7.7.1 — Independent technical oversight for result certification.</p>
                </div>
                <div className="flex gap-8">
                    <div className="text-right">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Backlog</div>
                        <div className="text-xl font-black text-white mt-1">{queue.length} <span className="text-xs text-slate-500 uppercase">Samples</span></div>
                    </div>
                    <button onClick={fetchQueue} className="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
                        🔄 Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Validation Queue */}
                <div className="xl:col-span-1">
                    <div className="glass-panel p-0 overflow-hidden border-emerald-500/10">
                        <div className="p-5 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Pending Review</h3>
                            <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center text-slate-500 text-sm">Loading validation queue...</div>
                            ) : queue.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="text-3xl mb-3">✅</div>
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Queue Clear</p>
                                    <p className="text-slate-600 text-xs mt-1">No samples pending review</p>
                                </div>
                            ) : queue.map(entry => {
                                const oos = entry.results?.some(r => isOOS(r));
                                return (
                                    <div
                                        key={entry.sample_id}
                                        onClick={() => { setSelectedEntry(entry); setReviewNotes(""); }}
                                        className={`p-5 cursor-pointer transition-all hover:bg-white/5 group ${selectedEntry?.sample_id === entry.sample_id ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] font-black ${selectedEntry?.sample_id === entry.sample_id ? 'text-emerald-400' : 'text-white'} transition-colors`}>
                                                {entry.sample_code}
                                            </span>
                                            {oos && <span className="text-[8px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded animate-pulse">OOS ALERT</span>}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-bold">{entry.description || entry.test_description}</div>
                                        <div className="text-[9px] text-slate-600 font-black uppercase mt-2 tracking-widest">{entry.company_name}</div>
                                        <div className="text-[9px] text-slate-700 mt-1">{entry.results?.length} result(s) awaiting review</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Evidence Chain */}
                <div className="xl:col-span-3">
                    {selectedEntry ? (
                        <div className="space-y-8 animate-scale-up">
                            {/* OOS Alert Banner */}
                            {hasOOS && (
                                <div className="glass-panel border-red-500/30 bg-red-500/5 p-4 flex items-center gap-4">
                                    <span className="text-2xl">🚨</span>
                                    <div>
                                        <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">Out-Of-Specification ALERT</div>
                                        <p className="text-xs text-slate-400 mt-0.5">One or more results exceed the specification limit. Review carefully before certifying.</p>
                                    </div>
                                </div>
                            )}

                            {/* Result Review Table */}
                            <div className="glass-panel p-0 overflow-hidden">
                                <div className="p-6 border-b border-white/5 bg-slate-900/30 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-black text-white">{selectedEntry.sample_code}</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">{selectedEntry.description} · {selectedEntry.company_name} · Tech: {selectedEntry.assigned_technician_email || 'N/A'}</p>
                                    </div>
                                    {selectedEntry.env && (
                                        <div className="text-right">
                                            <div className="text-[9px] text-slate-500 uppercase font-black">Run Environment</div>
                                            <div className="text-xs font-black text-emerald-400">{selectedEntry.env.temperature}°C / {selectedEntry.env.humidity}% RH</div>
                                        </div>
                                    )}
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="data-table text-sm">
                                        <thead>
                                            <tr className="bg-slate-900/50">
                                                <th className="text-[9px] uppercase tracking-widest text-slate-500 py-4">Parameter</th>
                                                <th className="text-[9px] uppercase tracking-widest text-slate-500">Value (± MU)</th>
                                                <th className="text-[9px] uppercase tracking-widest text-slate-500">Spec Limit</th>
                                                <th className="text-[9px] uppercase tracking-widest text-slate-500">Compliance</th>
                                                <th className="text-[9px] uppercase tracking-widest text-slate-500">Method</th>
                                                <th className="text-[9px] uppercase tracking-widest text-slate-500">Controls (P/N)</th>
                                                <th className="text-[9px] uppercase tracking-widest text-slate-500">Equipment</th>
                                                <th className="text-[9px] uppercase tracking-widest text-slate-500">Analyst</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {selectedEntry.results.map(r => {
                                                const oos = isOOS(r);
                                                return (
                                                    <tr key={r.id} className={oos ? 'bg-red-500/5' : ''}>
                                                        <td className="font-bold text-white py-3">{r.parameter_name}</td>
                                                        <td>
                                                            <span className={`font-mono font-black ${oos ? 'text-red-400' : 'text-blue-300'}`}>
                                                                {r.value} {r.unit}
                                                            </span>
                                                            {r.measurement_uncertainty && (
                                                                <span className="text-slate-500 text-[10px] ml-1">± {r.measurement_uncertainty}</span>
                                                            )}
                                                        </td>
                                                        <td className="text-slate-400 text-[11px]">{r.specification_limit || '—'}</td>
                                                        <td>
                                                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                                                                oos ? 'bg-red-500/20 text-red-400' : 
                                                                r.pass_fail === 'Pass' ? 'bg-green-500/20 text-green-400' : 
                                                                r.pass_fail === 'Fail' ? 'bg-red-500/20 text-red-400' : 
                                                                'bg-slate-700 text-slate-400'
                                                            }`}>
                                                                {oos ? '⚠️ OOS' : r.pass_fail || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="text-slate-400 text-[10px]">{r.method_name || r.method_reference || '—'}</td>
                                                        <td className="text-[10px]">
                                                            <span className="text-blue-400">P: {r.positive_control || '—'}</span>
                                                            <span className="text-red-400 ml-2">N: {r.negative_control || '—'}</span>
                                                        </td>
                                                        <td className="font-mono text-[10px] text-slate-500">{r.equipment_id || '—'}</td>
                                                        <td className="text-[10px] text-slate-500">{r.entered_by_email?.split('@')[0]}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Decision Panel */}
                            <div className="glass-panel p-8 space-y-6 bg-emerald-500/5 border-emerald-500/10">
                                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Scientific Decision Log (ISO 17025 §7.7.1) *</div>
                                <textarea
                                    className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl outline-none focus:border-emerald-500 text-sm h-32 transition-all"
                                    placeholder="Document your scientific rationale for this certification decision. Reference specific results, controls, and any observations..."
                                    value={reviewNotes}
                                    onChange={e => setReviewNotes(e.target.value)}
                                />
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleApprove}
                                        disabled={submitting}
                                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] disabled:opacity-50"
                                    >
                                        {submitting ? '⏳ Processing...' : '🛡️ Certify Results & Lock'}
                                    </button>
                                    <button
                                        onClick={() => setShowRejectModal(true)}
                                        disabled={submitting}
                                        className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-[0_20px_40px_-10px_rgba(239,68,68,0.4)] disabled:opacity-50"
                                    >
                                        ❌ Reject & Raise NCR
                                    </button>
                                </div>
                                <p className="text-[9px] text-slate-600 text-center uppercase tracking-widest">
                                    Maker-Checker enforced · Your decision is immutably logged · ISO 17025 §7.7.2 Compliant
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel flex flex-col items-center justify-center h-[600px] bg-slate-950/20 border-dashed border-white/10">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl mb-8 animate-pulse">🛡️</div>
                            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-widest">Awaiting Technical Review</h3>
                            <p className="text-slate-500 font-bold max-w-sm text-center leading-relaxed">
                                {queue.length === 0
                                    ? "All samples are clear. No pending reviews."
                                    : "Select a sample from the backlog to perform evidence-based quality certification."}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Reject + NCR Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="glass-panel w-full max-w-lg animate-scale-up border-red-500/20">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-2xl">🚨</div>
                            <div>
                                <h3 className="text-xl font-black text-white">Reject & Raise NCR</h3>
                                <p className="text-xs text-slate-400 mt-1">ISO 17025 §8.7 — A Non-Conformance Record will be created automatically.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-red-400 uppercase block mb-2">NCR Issue Description *</label>
                                <textarea
                                    className="w-full p-4 bg-slate-900 border border-red-500/30 rounded-xl outline-none focus:border-red-500 text-sm h-28"
                                    placeholder="Describe the specific non-conformance (e.g. 'Lead result 0.062 ppm exceeds MAX 0.05 ppm. High background interference noted in duplicate run.')"
                                    value={ncrReason}
                                    onChange={e => setNcrReason(e.target.value)}
                                />
                            </div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                                The sample will be returned to the technician for correction. An NCR will be created in the CAPA Command Center.
                            </p>
                            <div className="flex gap-4 pt-2">
                                <button onClick={() => setShowRejectModal(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase rounded-xl transition-all">
                                    Cancel
                                </button>
                                <button onClick={handleReject} disabled={submitting || !ncrReason.trim()} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase rounded-xl transition-all disabled:opacity-50">
                                    {submitting ? '⏳ Raising NCR...' : '❌ Confirm Rejection'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
