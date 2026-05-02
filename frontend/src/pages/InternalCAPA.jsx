import { useState, useEffect } from "react";
import API from "../services/api";

const PRIORITY_COLORS = {
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
    HIGH:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
    MEDIUM:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
    LOW:      'bg-slate-700 text-slate-400 border-white/10',
};

const SOURCE_LABELS = {
    MANUAL: 'Manual Entry',
    INTERNAL_REVIEW: 'Internal Review',
    SAMPLE_RECEIPT: 'Sample Receipt',
    CLIENT_COMPLAINT: 'Client Complaint',
    AUDIT: 'Audit Finding',
    EXTERNAL_PT: 'Proficiency Test',
};

export default function InternalCAPA() {
    const [ncrs, setNcrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNCR, setSelectedNCR] = useState(null);
    const [capaData, setCapaData] = useState({ rca: "", corrective_action: "", preventive_action: "", verification_method: "", effectiveness_check_date: "" });
    const [showNewNCR, setShowNewNCR] = useState(false);
    const [newNCRForm, setNewNCRForm] = useState({ product_description: "", issue_description: "", priority: "MEDIUM", source: "MANUAL", batch_number: "" });
    const [submitting, setSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState("ALL");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const fetchNCRs = async () => {
        setLoading(true);
        try {
            // P1-2 FIX: Real persistent API call (ISO 17025 §8.7)
            const res = await API.get("/api/nonconformances");
            setNcrs(res.data.data || []);
        } catch (e) {
            console.error("Failed to fetch NCRs", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchNCRs(); }, []);

    const handleCreateNCR = async (e) => {
        e.preventDefault();
        if (!newNCRForm.issue_description.trim()) return;
        setSubmitting(true);
        try {
            const res = await API.post("/api/nonconformances", newNCRForm);
            alert(`NCR ${res.data.data.ncr_number} created and persisted to the quality ledger.`);
            setShowNewNCR(false);
            setNewNCRForm({ product_description: "", issue_description: "", priority: "MEDIUM", source: "MANUAL", batch_number: "" });
            fetchNCRs();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to create NCR");
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolve = async () => {
        if (!capaData.rca.trim() || !capaData.corrective_action.trim()) {
            alert("Both Root Cause Analysis and Corrective Action are mandatory to close an NCR (ISO 17025 §8.7).");
            return;
        }
        if (!confirm(`Resolve NCR ${selectedNCR.ncr_number}? This will lift the operational hold. The record is permanently stored.`)) return;
        setSubmitting(true);
        try {
            await API.patch(`/api/nonconformances/${selectedNCR.id}/resolve`, capaData);
            alert(`✅ NCR ${selectedNCR.ncr_number} resolved. CAPA plan committed and locked in the quality ledger.`);
            setSelectedNCR(null);
            setCapaData({ rca: "", corrective_action: "", preventive_action: "", verification_method: "", effectiveness_check_date: "" });
            fetchNCRs();
        } catch (err) {
            alert(err.response?.data?.message || "Resolution failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleExportNCR = (ncr) => {
        const content = `NON-CONFORMANCE RECORD
======================
NCR Number: ${ncr.ncr_number}
Status: ${ncr.status}
Priority: ${ncr.priority}
Source: ${SOURCE_LABELS[ncr.source] || ncr.source}
Date Created: ${new Date(ncr.created_at).toLocaleString()}
Detected By: ${ncr.detected_by_email || 'N/A'}

PRODUCT / BATCH
---------------
Product: ${ncr.product_description || 'N/A'}
Batch: ${ncr.batch_number || 'N/A'}
Sample: ${ncr.sample_code || 'N/A'}

ISSUE DESCRIPTION
-----------------
${ncr.issue_description}

IMMEDIATE ACTION
----------------
${ncr.immediate_action || 'None recorded'}

ROOT CAUSE ANALYSIS (RCA)
--------------------------
${ncr.rca || 'Pending investigation'}

CORRECTIVE ACTION
-----------------
${ncr.corrective_action || 'Pending'}

PREVENTIVE ACTION
-----------------
${ncr.preventive_action || 'Pending'}

VERIFICATION METHOD
-------------------
${ncr.verification_method || 'N/A'}

Effectiveness Check Date: ${ncr.effectiveness_check_date || 'N/A'}
Resolved By: ${ncr.resolved_by || 'N/A'}
Resolved At: ${ncr.resolved_at ? new Date(ncr.resolved_at).toLocaleString() : 'N/A'}

--- ISO 17025 §8.7 Compliant CAPA Record ---`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ncr.ncr_number}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filtered = filterStatus === 'ALL' ? ncrs : ncrs.filter(n => n.status === filterStatus);
    const openCount = ncrs.filter(n => n.status === 'OPEN' || n.status === 'INVESTIGATING').length;

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">CAPA <span className="text-red-500">Command Center</span></h2>
                    <p className="text-slate-400 text-sm mt-1">ISO 17025 §8.7 — Persistent Non-Conformance Management & Corrective Actions</p>
                </div>
                <div className="flex items-center gap-4">
                    {openCount > 0 && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-widest">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            {openCount} ACTIVE NCR{openCount !== 1 ? 's' : ''}
                        </div>
                    )}
                    <button onClick={() => setShowNewNCR(true)} className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all">
                        + Raise NCR
                    </button>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2">
                {['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                            filterStatus === s
                                ? 'bg-red-600 border-red-500 text-white'
                                : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {s} <span className="ml-1 opacity-60">{s === 'ALL' ? ncrs.length : ncrs.filter(n => n.status === s).length}</span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* NCR Ledger */}
                <div className="lg:col-span-1">
                    <div className="glass-panel p-0 overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Quality Ledger</h3>
                            <button onClick={fetchNCRs} className="text-[9px] text-slate-500 hover:text-white transition-all">🔄</button>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[700px] overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center text-slate-500 text-sm">Loading NCR ledger...</div>
                            ) : filtered.length === 0 ? (
                                <div className="p-8 text-center text-slate-600 italic text-sm">No NCRs found</div>
                            ) : filtered.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => { setSelectedNCR(n); setCapaData({ rca: n.rca || "", corrective_action: n.corrective_action || "", preventive_action: n.preventive_action || "", verification_method: n.verification_method || "", effectiveness_check_date: n.effectiveness_check_date || "" }); }}
                                    className={`p-4 cursor-pointer transition-all hover:bg-white/5 ${selectedNCR?.id === n.id ? 'bg-red-500/10 border-r-4 border-red-500' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-black text-white">{n.ncr_number}</span>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${n.status === 'RESOLVED' || n.status === 'CLOSED' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'}`}>
                                            {n.status}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium leading-snug">{n.product_description || 'No product specified'}</div>
                                    <div className="text-[10px] text-slate-500 mt-2 line-clamp-2">{n.issue_description}</div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[n.priority] || PRIORITY_COLORS.MEDIUM}`}>
                                            {n.priority}
                                        </span>
                                        <span className="text-[8px] text-slate-600">{SOURCE_LABELS[n.source] || n.source}</span>
                                    </div>
                                    {n.sample_code && <div className="text-[9px] font-mono text-blue-400 mt-1">Sample: {n.sample_code}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CAPA Workspace */}
                <div className="lg:col-span-2">
                    {selectedNCR ? (
                        <div className="glass-panel p-0 overflow-hidden animate-slide-in">
                            {/* NCR Header */}
                            <div className="p-8 border-b border-white/5 bg-red-500/5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-2xl font-black text-white">{selectedNCR.ncr_number}</h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Created {new Date(selectedNCR.created_at).toLocaleDateString()} · {SOURCE_LABELS[selectedNCR.source]} · Detected by: {selectedNCR.detected_by_email || 'System'}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 text-[10px] font-bold rounded uppercase tracking-widest border ${PRIORITY_COLORS[selectedNCR.priority]}`}>
                                        {selectedNCR.priority}
                                    </span>
                                </div>
                                <div className="p-4 bg-black/20 rounded border border-white/5">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Non-Conformance Detail</div>
                                    <p className="text-sm text-slate-300 leading-relaxed">{selectedNCR.issue_description}</p>
                                    {selectedNCR.sample_code && (
                                        <div className="mt-2 text-[10px] font-mono text-blue-400">Linked Sample: {selectedNCR.sample_code}</div>
                                    )}
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Immediate Action */}
                                <div>
                                    <label className="text-[10px] font-bold text-amber-400 uppercase block mb-2">Immediate Containment Action</label>
                                    <textarea
                                        disabled={selectedNCR.status === 'RESOLVED' || selectedNCR.status === 'CLOSED'}
                                        className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-amber-500 text-sm h-20 disabled:opacity-50"
                                        placeholder="Describe immediate actions taken to contain the impact (quarantine, stop shipment, hold batch)..."
                                        defaultValue={selectedNCR.immediate_action || ''}
                                        onBlur={async (e) => {
                                            if (e.target.value !== selectedNCR.immediate_action) {
                                                await API.patch(`/api/nonconformances/${selectedNCR.id}`, { immediate_action: e.target.value });
                                            }
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Root Cause Analysis (5-Why / Ishikawa) *</label>
                                        <textarea
                                            disabled={selectedNCR.status === 'RESOLVED' || selectedNCR.status === 'CLOSED'}
                                            className="w-full p-4 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-red-500 text-sm h-36 disabled:opacity-50"
                                            placeholder="Perform 5-Why analysis... Was it instrument drift? Method deviation? Reagent contamination? Training gap?"
                                            value={capaData.rca}
                                            onChange={e => setCapaData({ ...capaData, rca: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Corrective Action (CAPA) *</label>
                                        <textarea
                                            disabled={selectedNCR.status === 'RESOLVED' || selectedNCR.status === 'CLOSED'}
                                            className="w-full p-4 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-red-500 text-sm h-36 disabled:opacity-50"
                                            placeholder="Define specific actions to eliminate the root cause... Re-calibration, Re-training, SOP update, Vendor complaint."
                                            value={capaData.corrective_action}
                                            onChange={e => setCapaData({ ...capaData, corrective_action: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Preventive Action</label>
                                        <textarea
                                            disabled={selectedNCR.status === 'RESOLVED' || selectedNCR.status === 'CLOSED'}
                                            className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm h-24 disabled:opacity-50"
                                            placeholder="Actions to prevent recurrence across other processes..."
                                            value={capaData.preventive_action}
                                            onChange={e => setCapaData({ ...capaData, preventive_action: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Verification Method & Effectiveness Date</label>
                                        <input
                                            type="text"
                                            disabled={selectedNCR.status === 'RESOLVED' || selectedNCR.status === 'CLOSED'}
                                            className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm mb-2 disabled:opacity-50"
                                            placeholder="e.g. Re-run proficiency test, next audit review..."
                                            value={capaData.verification_method}
                                            onChange={e => setCapaData({ ...capaData, verification_method: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            disabled={selectedNCR.status === 'RESOLVED' || selectedNCR.status === 'CLOSED'}
                                            className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm disabled:opacity-50"
                                            value={capaData.effectiveness_check_date}
                                            onChange={e => setCapaData({ ...capaData, effectiveness_check_date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {selectedNCR.status === 'RESOLVED' || selectedNCR.status === 'CLOSED' ? (
                                    <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                        <div>
                                            <div className="text-xs font-black text-emerald-400 uppercase">NCR Resolved & Locked</div>
                                            <p className="text-[10px] text-slate-500 mt-0.5">Resolved by {selectedNCR.resolved_by || 'N/A'} on {selectedNCR.resolved_at ? new Date(selectedNCR.resolved_at).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                        <button onClick={() => handleExportNCR(selectedNCR)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black uppercase rounded transition-all">
                                            📥 Export for Auditor
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-4 pt-4 border-t border-white/5">
                                        <button
                                            onClick={handleResolve}
                                            disabled={submitting}
                                            className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_25px_rgba(239,68,68,0.3)] transition-all disabled:opacity-50"
                                        >
                                            {submitting ? '⏳ Committing...' : '🚀 Resolve NCR & Lift Lockdown'}
                                        </button>
                                        <button onClick={() => handleExportNCR(selectedNCR)} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all">
                                            📥 Export
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel flex flex-col items-center justify-center h-[600px] text-slate-600 border-dashed">
                            <div className="text-5xl mb-6">🕵️‍♂️</div>
                            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-widest">CAPA Workspace</h3>
                            <p className="text-sm max-w-xs text-center leading-relaxed text-slate-500">
                                Select an active Non-Conformance to begin investigation. All records persist permanently.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* New NCR Modal */}
            {showNewNCR && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="glass-panel w-full max-w-lg animate-scale-up">
                        <h3 className="text-xl font-black text-white mb-1">Raise Non-Conformance Record</h3>
                        <p className="text-xs text-slate-400 mb-6">ISO 17025 §8.7 — This NCR will be permanently stored in the quality ledger.</p>
                        <form onSubmit={handleCreateNCR} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Issue Description *</label>
                                <textarea
                                    required
                                    className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-red-500 text-sm h-28"
                                    placeholder="Describe the non-conformance in detail..."
                                    value={newNCRForm.issue_description}
                                    onChange={e => setNewNCRForm({ ...newNCRForm, issue_description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Product / Material</label>
                                    <input
                                        className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-red-500 text-sm"
                                        placeholder="e.g. Finished Product X"
                                        value={newNCRForm.product_description}
                                        onChange={e => setNewNCRForm({ ...newNCRForm, product_description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Batch / Lot Number</label>
                                    <input
                                        className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-red-500 text-sm"
                                        placeholder="e.g. LOT-2026-045"
                                        value={newNCRForm.batch_number}
                                        onChange={e => setNewNCRForm({ ...newNCRForm, batch_number: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Priority</label>
                                    <select className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none text-sm" value={newNCRForm.priority} onChange={e => setNewNCRForm({ ...newNCRForm, priority: e.target.value })}>
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Source</label>
                                    <select className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none text-sm" value={newNCRForm.source} onChange={e => setNewNCRForm({ ...newNCRForm, source: e.target.value })}>
                                        {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-2">
                                <button type="button" onClick={() => setShowNewNCR(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase rounded-xl">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase rounded-xl disabled:opacity-50">
                                    {submitting ? '⏳ Raising...' : '🚨 Raise NCR'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
