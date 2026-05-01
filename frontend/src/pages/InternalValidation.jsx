import { useState, useEffect } from "react";
import API from "../services/api";

export default function InternalValidation() {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [reviewNotes, setReviewNotes] = useState("");

    const fetchQueue = async () => {
        try {
            const mockQueue = [
                { 
                    id: 1, 
                    qr_code: "IQC-B22-X1", 
                    product: "Raw Material A", 
                    parameter: "Moisture", 
                    analyst_result: "4.8", 
                    unit: "%",
                    spec_limit: "MAX 5.0 %", 
                    analyst: "John Doe (Analyst)",
                    timestamp: "10 mins ago",
                    observations: "Samples were dried for 4 hours at 105C.",
                    run_env: { temp: 22.1, humidity: 44 },
                    instrument: { id: "OVEN-004", status: "CALIBRATED" },
                    controls: { blank: "ND", lcs: "98.5%" }
                },
                { 
                    id: 2, 
                    qr_code: "IQC-B22-X2", 
                    product: "Finished Product X", 
                    parameter: "Lead", 
                    analyst_result: "0.062", 
                    unit: "ppm",
                    spec_limit: "MAX 0.05 ppm", 
                    analyst: "Jane Smith (Analyst)",
                    timestamp: "35 mins ago",
                    observations: "High background interference noted in duplicate.",
                    run_env: { temp: 23.5, humidity: 52 },
                    instrument: { id: "ICPMS-A9", status: "CALIBRATED" },
                    controls: { blank: "ND", lcs: "102.1%" }
                }
            ];
            setQueue(mockQueue);
        } catch (e) {
            console.error("Failed to fetch validation queue");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQueue(); }, []);

    const handleDecision = (decision) => {
        const status = decision === 'APPROVE' ? 'TECHNICAL_VALIDATED' : decision === 'REJECT' ? 'FAILED' : 'RETEST_ORDERED';
        
        if (decision === 'REJECT') {
            alert(`Sovereign Rejection Triggered for ${selectedEntry.qr_code}. Redirecting to CAPA Command Center for mandatory NCR creation.`);
            window.location.href = "/internal-capa";
            return;
        }

        if (decision === 'APPROVE') {
            alert(`Technical Validation Complete for ${selectedEntry.qr_code}. Entry routed to Lab Manager for Sovereign CoA Issuance.`);
        } else {
            alert(`Validation Decision: ${decision} for ${selectedEntry.qr_code}. Entry moved to ${status} ledger.`);
        }

        setQueue(queue.filter(q => q.id !== selectedEntry.id));
        setSelectedEntry(null);
        setReviewNotes("");
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">Scientific <span className="text-emerald-500">Validation Unit</span></h2>
                    <p className="text-slate-400 text-sm mt-1">Independent technical oversight for ISO-17025 result certification.</p>
                </div>
                <div className="flex gap-8">
                    <div className="text-right">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Backlog</div>
                        <div className="text-xl font-black text-white mt-1">{queue.length} <span className="text-xs text-slate-500 uppercase">Batches</span></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Validation Queue */}
                <div className="xl:col-span-1">
                    <div className="glass-panel p-0 overflow-hidden border-emerald-500/10">
                        <div className="p-5 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Verification Queue</h3>
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                            {queue.map(entry => {
                                const isOOS = parseFloat(entry.analyst_result) > parseFloat(entry.spec_limit.split(' ')[1]);
                                return (
                                    <div 
                                        key={entry.id} 
                                        onClick={() => setSelectedEntry(entry)}
                                        className={`p-5 cursor-pointer transition-all hover:bg-white/5 group ${selectedEntry?.id === entry.id ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] font-black ${selectedEntry?.id === entry.id ? 'text-emerald-400' : 'text-white'} transition-colors`}>{entry.qr_code}</span>
                                            {isOOS && <span className="text-[8px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded animate-pulse">OOS ALERT</span>}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-bold">{entry.product}</div>
                                        <div className="text-[9px] text-slate-600 font-black uppercase mt-2 tracking-widest">{entry.parameter}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Evidence Chain OS */}
                <div className="xl:col-span-3">
                    {selectedEntry ? (
                        <div className="space-y-8 animate-scale-up">
                            {/* Intelligence Matrix */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left: Raw Data & Observations */}
                                <div className="glass-panel p-8 space-y-8 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/50"></div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Analyst Evidence Chain</div>
                                    <div className="space-y-2">
                                        <div className="text-6xl font-black text-white tracking-tighter">
                                            {selectedEntry.analyst_result}<span className="text-xl text-slate-500 ml-2 font-bold">{selectedEntry.unit}</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-400">Captured by <strong className="text-blue-400">{selectedEntry.analyst}</strong> — {selectedEntry.timestamp}</p>
                                    </div>
                                    
                                    <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-3">Technical Observations</h4>
                                        <p className="text-sm text-slate-300 leading-relaxed font-medium italic">"{selectedEntry.observations}"</p>
                                    </div>

                                    {/* Run Environment Snapshot */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                            <div className="text-[9px] font-black text-slate-500 uppercase mb-2">Run Environment</div>
                                            <div className="text-sm font-black text-emerald-400">{selectedEntry.run_env.temp}°C / {selectedEntry.run_env.humidity}% RH</div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                            <div className="text-[9px] font-black text-slate-500 uppercase mb-2">Asset Health</div>
                                            <div className="text-sm font-black text-blue-400">{selectedEntry.instrument.id} (VALID)</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Spec Compliance & Decision */}
                                <div className="glass-panel p-8 space-y-8 bg-emerald-500/5 border-emerald-500/10">
                                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sovereign Specification Compliance</div>
                                    <div className="space-y-2">
                                        <div className="text-6xl font-black text-emerald-400 tracking-tighter">
                                            {selectedEntry.spec_limit.split(' ')[1]}<span className="text-xl text-emerald-600/50 ml-2 font-bold">{selectedEntry.unit}</span>
                                        </div>
                                        <p className="text-sm font-black text-emerald-600 uppercase tracking-widest">Mandatory Upper Limit</p>
                                    </div>

                                    <div className="bg-slate-950 p-6 rounded-2xl border border-emerald-500/20 space-y-4">
                                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-b border-emerald-500/10 pb-3">Analytical Controls (QC)</h4>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <div className="text-[9px] text-slate-500 font-black uppercase mb-1">Method Blank</div>
                                                <div className="text-lg font-black text-white">{selectedEntry.controls.blank}</div>
                                                <div className="text-[8px] font-black text-emerald-500 uppercase mt-1">✓ PASS</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] text-slate-500 font-black uppercase mb-1">Calibration Std</div>
                                                <div className="text-lg font-black text-white">{selectedEntry.controls.lcs}</div>
                                                <div className="text-[8px] font-black text-emerald-500 uppercase mt-1">✓ PASS</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Scientific Rationale / Decision Log</label>
                                        <textarea 
                                            className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl outline-none focus:border-emerald-500 text-sm h-32 transition-all"
                                            placeholder="Document the scientific rationale for this certification decision..."
                                            value={reviewNotes}
                                            onChange={e => setReviewNotes(e.target.value)}
                                        />
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => handleDecision('APPROVE')}
                                                className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-500 border-none py-4 font-black uppercase tracking-widest text-[10px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)]"
                                            >
                                                🛡️ Certify Result
                                            </button>
                                            <button 
                                                onClick={() => handleDecision('REJECT')}
                                                className="flex-1 btn-primary bg-red-600 hover:bg-red-500 border-none py-4 font-black uppercase tracking-widest text-[10px] shadow-[0_20px_40px_-10px_rgba(239,68,68,0.4)]"
                                            >
                                                ❌ Reject Batch
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel flex flex-col items-center justify-center h-[600px] bg-slate-950/20 border-dashed border-white/10">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl mb-8 animate-pulse">🛡️</div>
                            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-widest">Awaiting Technical Review</h3>
                            <p className="text-slate-500 font-bold max-w-sm text-center leading-relaxed">
                                Select a technical entry from the backlog to perform an evidence-based quality certification.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
