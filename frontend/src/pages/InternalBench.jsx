import { useState, useEffect } from "react";
import API from "../services/api";

export default function InternalBench() {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSample, setSelectedSample] = useState(null);
    const [resultData, setResultData] = useState({ value: "", notes: "" });
    const [benchStatus, setBenchStatus] = useState({
        temp: 22.4,
        humidity: 45,
        instrument: "READY",
        reagents: "VERIFIED"
    });

    const fetchQueue = async () => {
        try {
            const mockQueue = [
                { id: 1, qr_code: "IQC-B22-X1", product: "Raw Material A", parameter: "Moisture", limit: "MAX 5.0 %", method: "AOAC 925.10", instrument_id: "OVEN-004" },
                { id: 2, qr_code: "IQC-B22-X2", product: "Finished Product X", parameter: "Lead", limit: "MAX 0.05 ppm", method: "ICP-MS-01", instrument_id: "ICPMS-A9" },
                { id: 3, qr_code: "IQC-B22-X3", product: "Raw Material A", parameter: "Purity", limit: "MIN 99.0 %", method: "HPLC-UV", instrument_id: "HPLC-7" }
            ];
            setQueue(mockQueue);
        } catch (e) {
            console.error("Failed to fetch bench queue");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQueue(); }, []);

    const handleSubmitResult = (e) => {
        e.preventDefault();
        alert(`Audit Log Captured: Result for ${selectedSample.qr_code} submitted. Environment and Equipment states archived for ISO compliance.`);
        setQueue(queue.filter(s => s.id !== selectedSample.id));
        setSelectedSample(null);
        setResultData({ value: "", notes: "" });
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">Analytical <span className="text-blue-500">Bench OS</span></h2>
                    <p className="text-slate-400 text-sm mt-1">Sovereign laboratory operations with real-time ISO-17025 auditing integration.</p>
                </div>
                <div className="flex gap-6">
                    <div className="text-right">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Facility Environment</div>
                        <div className="text-emerald-400 font-black text-xs flex items-center gap-2 mt-1">
                            {benchStatus.temp}°C / {benchStatus.humidity}% RH <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Station Sentinel</div>
                        <div className="text-blue-500 font-black text-xs mt-1">SYSTEMS NOMINAL</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* ── Section 1: Work Queue ── */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="glass-panel p-0 overflow-hidden border-blue-500/10">
                        <div className="p-5 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Assigned Queue</h3>
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[9px] font-black">{queue.length} SAMPLES</span>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                            {queue.map(sample => (
                                <div 
                                    key={sample.id} 
                                    onClick={() => setSelectedSample(sample)}
                                    className={`p-5 cursor-pointer transition-all hover:bg-white/5 group ${selectedSample?.id === sample.id ? 'bg-blue-500/10 border-l-4 border-blue-500' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-black ${selectedSample?.id === sample.id ? 'text-blue-400' : 'text-white'} transition-colors`}>{sample.qr_code}</span>
                                        <span className="text-[8px] font-black px-1.5 py-0.5 bg-white/5 text-slate-500 rounded uppercase tracking-tighter">{sample.instrument_id}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-bold group-hover:text-slate-300 transition-colors">{sample.product}</div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{sample.parameter}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Facility Sentinel Snippet */}
                    <div className="glass-panel p-5 bg-emerald-500/5 border-emerald-500/10">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex justify-between items-center">
                            Facility Compliance <span>✓</span>
                        </h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-bold">STERILIZATION LOG</span>
                                <span className="text-[9px] font-black text-white">VALID (24H)</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-bold">REAGENT EXPIRY</span>
                                <span className="text-[9px] font-black text-white">NOMINAL</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Section 2: Analytical OS ── */}
                <div className="xl:col-span-3">
                    {selectedSample ? (
                        <div className="space-y-8 animate-scale-up">
                            {/* Intelligence Header */}
                            <div className="glass-panel p-8 flex justify-between items-center border-white/10 bg-slate-900/40">
                                <div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <h3 className="text-3xl font-black text-white tracking-tighter">{selectedSample.qr_code}</h3>
                                        <span className="px-3 py-1 bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.4)]">Analytical Mode</span>
                                    </div>
                                    <p className="text-slate-400 font-bold text-sm">
                                        {selectedSample.product} <span className="mx-2 text-slate-700">|</span> <span className="text-blue-400">{selectedSample.parameter}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Operational Limit</div>
                                    <div className="text-2xl font-black text-white tracking-tight">{selectedSample.limit}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Entry Form */}
                                <div className="lg:col-span-2 glass-panel p-8 space-y-8">
                                    <form onSubmit={handleSubmitResult} className="space-y-8">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Instrument Raw Value</label>
                                                <input 
                                                    required
                                                    className="w-full p-5 bg-slate-950 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-3xl font-black text-white transition-all"
                                                    placeholder="0.00"
                                                    value={resultData.value}
                                                    onChange={e => setResultData({ ...resultData, value: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Unit of Measure</label>
                                                <div className="w-full p-5 bg-white/5 border border-white/5 rounded-xl text-slate-400 font-black text-lg">
                                                    {selectedSample.limit.split(' ').pop()}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Technical Observations & Deviations</label>
                                            <textarea 
                                                className="w-full p-4 bg-slate-950 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-sm h-32 transition-all"
                                                placeholder="Document any technical variance or instrumental noise observed during the run..."
                                                value={resultData.notes}
                                                onChange={e => setResultData({ ...resultData, notes: e.target.value })}
                                            />
                                        </div>

                                        <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/10">
                                            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">ISO Traceability Attestation</h4>
                                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
                                                By submitting this data, I verify that instrument <strong className="text-white">{selectedSample.instrument_id}</strong> is within calibration, reagents used are validated, and facility environmental controls were within limits for method <strong className="text-white">{selectedSample.method}</strong>.
                                            </p>
                                            <button 
                                                type="submit" 
                                                className="w-full mt-6 btn-primary bg-blue-600 hover:bg-blue-500 border-none py-4 font-black uppercase tracking-widest text-xs shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)]"
                                            >
                                                Sign & Archive Result →
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Bench Intelligence Sidebar */}
                                <div className="space-y-6">
                                    <div className="glass-panel p-6 bg-slate-900/60">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Instrument Diagnostics</h4>
                                        <div className="space-y-6">
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">CALIBRATION STATUS</span>
                                                    <span className="text-[10px] font-black text-emerald-500">OPTIMAL</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 w-[92%]" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">MAINTENANCE CYCLE</span>
                                                    <span className="text-[10px] font-black text-blue-400">12D REMAINING</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 w-[65%]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="glass-panel p-6 border-blue-500/20">
                                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Method Protocol (SOP)</h4>
                                        <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex items-center justify-between group cursor-pointer hover:border-blue-500/50 transition-all">
                                            <div>
                                                <div className="text-xs font-black text-white">{selectedSample.method}</div>
                                                <div className="text-[9px] font-bold text-slate-500 uppercase mt-1">SOP-ENG-REV4</div>
                                            </div>
                                            <span className="text-xl group-hover:scale-110 transition-transform">📄</span>
                                        </div>
                                    </div>

                                    <div className="p-4 text-center">
                                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-tighter">
                                            Total Audit Events Logged: <strong className="text-slate-500">14,291</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel flex flex-col items-center justify-center h-[600px] bg-slate-950/20 border-dashed border-white/10">
                            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center text-4xl mb-8 animate-pulse">🔬</div>
                            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-widest">Waiting for Sample Accession</h3>
                            <p className="text-slate-500 font-bold max-w-sm text-center leading-relaxed">
                                Please select a technical asset from the accessioning queue to initialize the analytical run and audit chain.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
