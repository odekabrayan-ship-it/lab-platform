import { useState, useEffect } from "react";
import API from "../services/api";

export default function InternalCAPA() {
    const [ncrs, setNcrs] = useState([
        { 
            id: "NCR-2026-001", 
            sample_id: "IQC-B22-X2", 
            product: "Finished Product X", 
            issue: "Lead levels exceeded Sovereign Spec (0.062 vs 0.05)",
            status: "OPEN",
            priority: "CRITICAL",
            rca: "",
            corrective_action: ""
        }
    ]);

    const [selectedNCR, setSelectedNCR] = useState(null);
    const [capaData, setCapaData] = useState({ rca: "", corrective_action: "" });

    const handleResolve = (id) => {
        setNcrs(ncrs.map(n => n.id === id ? { ...n, ...capaData, status: "RESOLVED" } : n));
        setSelectedNCR(null);
        setCapaData({ rca: "", corrective_action: "" });
        alert("CAPA plan committed. Product lockdown lifted.");
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">CAPA Command Center</h2>
                    <p className="text-slate-400 text-sm mt-1">ISO 17025 Clause 8.7 Compliance: Non-Conformance management and Corrective Actions.</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Quality Risk</div>
                    <div className="text-red-500 font-black text-xs flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        ACTIVE NON-CONFORMANCES
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* NCR Ledger */}
                <div className="lg:col-span-1">
                    <div className="glass-panel p-0 overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Open NCRs</h3>
                            <span className="text-[10px] font-bold text-red-500">{ncrs.filter(n => n.status === 'OPEN').length} Active</span>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                            {ncrs.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => setSelectedNCR(n)}
                                    className={`p-4 cursor-pointer transition-all hover:bg-white/5 ${selectedNCR?.id === n.id ? 'bg-red-500/10 border-r-4 border-red-500' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-black text-white">{n.id}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${n.status === 'OPEN' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{n.status}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium">{n.product}</div>
                                    <div className="text-[10px] text-slate-500 mt-2 line-clamp-1">{n.issue}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CAPA Workspace */}
                <div className="lg:col-span-2">
                    {selectedNCR ? (
                        <div className="glass-panel p-0 overflow-hidden animate-slide-in">
                            <div className="p-8 border-b border-white/5 bg-red-500/5">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-2xl font-black text-white">{selectedNCR.id}: Investigation</h3>
                                    <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold rounded uppercase tracking-widest border border-red-500/20">Operational Lockdown Active</span>
                                </div>
                                <div className="p-4 bg-black/20 rounded border border-white/5">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Non-Conformance Detail</div>
                                    <p className="text-sm text-slate-300 leading-relaxed">{selectedNCR.issue}</p>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-3">Root Cause Analysis (RCA)</label>
                                        <textarea 
                                            disabled={selectedNCR.status === 'RESOLVED'}
                                            className="w-full p-4 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-red-500 text-sm h-40"
                                            placeholder="Perform 5-Why analysis... Was it instrument drift? Method deviation? Reagent contamination?"
                                            value={selectedNCR.status === 'RESOLVED' ? selectedNCR.rca : capaData.rca}
                                            onChange={e => setCapaData({ ...capaData, rca: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-3">Corrective Action (CAPA)</label>
                                        <textarea 
                                            disabled={selectedNCR.status === 'RESOLVED'}
                                            className="w-full p-4 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-red-500 text-sm h-40"
                                            placeholder="Define actions to prevent recurrence... e.g. Re-calibration, Staff Re-training, Vendor Complaint."
                                            value={selectedNCR.status === 'RESOLVED' ? selectedNCR.corrective_action : capaData.corrective_action}
                                            onChange={e => setCapaData({ ...capaData, corrective_action: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {selectedNCR.status === 'OPEN' && (
                                    <div className="flex gap-4 pt-4 border-t border-white/5">
                                        <button 
                                            onClick={() => handleResolve(selectedNCR.id)}
                                            className="flex-1 btn-primary bg-red-600 hover:bg-red-500 border-none py-4 font-black uppercase tracking-widest text-xs shadow-[0_0_25px_rgba(239,68,68,0.3)]"
                                        >
                                            🚀 Resolve & Lift Lockdown
                                        </button>
                                        <button className="btn-secondary px-8 py-4 font-black uppercase tracking-widest text-xs">
                                            📥 Export for Auditor
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel flex flex-col items-center justify-center h-[600px] text-slate-600 border-dashed">
                            <div className="text-5xl mb-6">🕵️‍♂️</div>
                            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-widest">Awaiting CAPA Analysis</h3>
                            <p className="text-sm max-w-xs text-center leading-relaxed">
                                Select an active Non-Conformance to begin the investigative and corrective process.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
