import { useState, useEffect } from "react";
import API from "../services/api";
import { Link } from "react-router-dom";

export default function PlantOperations() {
    const [lab, setLab] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ samples: 0, inventory: 0, equipment: 0 });

    const fetchPlantData = async () => {
        try {
            // First, get or initialize internal lab
            const res = await API.get("/api/lab/internal");
            setLab(res.data.data);
            
            // Fetch plant-specific KPIs
            // (Mocking for now until specific plant endpoints are robust)
            setStats({
                samples: 12,
                inventory: 45,
                equipment: 8
            });
        } catch (e) {
            console.error("Plant initialization failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPlantData(); }, []);

    if (loading) return <div className="p-12 text-center text-slate-500">Initializing Plant Operating System...</div>;

    if (!lab) return (
        <div className="max-w-2xl mx-auto py-20 text-center">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 text-4xl mx-auto mb-8 border border-emerald-500/20">🏗️</div>
            <h2 className="text-3xl font-black text-white mb-4">Initialize Internal Laboratory</h2>
            <p className="text-slate-400 mb-10 leading-relaxed">
                Your account is currently configured for **External Subcontracted Testing**. 
                To manage an in-house laboratory facility, you must initialize the **Internal IQC System**.
            </p>
            <button 
                onClick={async () => {
                    setLoading(true);
                    await API.post("/api/lab/internal/init");
                    fetchPlantData();
                }}
                className="btn-primary bg-emerald-600 hover:bg-emerald-500 border-none px-10 py-4 text-lg font-bold shadow-[0_0_30px_rgba(16,185,129,0.3)]"
            >
                Initialize Internal IQC →
            </button>
        </div>
    );

    return (
        <div className="animate-fade-in space-y-8">
            {/* Plant Header */}
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl font-black text-white tracking-tight">Internal Quality Control Command</h2>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded uppercase border border-emerald-500/20">IQC Active</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">Direct oversight of <strong>{lab.name}</strong>. In-house analytical workflows active.</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/samples" className="btn-secondary px-6 py-2 text-xs font-bold uppercase no-underline">🧪 Intake Sample</Link>
                    <Link to="/results" className="btn-primary bg-emerald-600 hover:bg-emerald-500 px-6 py-2 text-xs font-bold uppercase no-underline border-none">📊 Bench Queue</Link>
                </div>
            </div>

            {/* Plant KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 border-l-4 border-emerald-500 bg-emerald-500/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Internal Throughput</div>
                    <div className="text-3xl font-black text-white">{stats.samples} Samples</div>
                    <div className="text-xs text-slate-500 mt-1">Currently on the bench</div>
                </div>
                <div className="glass-panel p-6 border-l-4 border-blue-500 bg-blue-500/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Resource Status</div>
                    <div className="text-3xl font-black text-white">{stats.inventory} Reagents</div>
                    <div className="text-xs text-slate-500 mt-1">Inventory levels stable</div>
                </div>
                <div className="glass-panel p-6 border-l-4 border-amber-500 bg-amber-500/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Equipment Health</div>
                    <div className="text-3xl font-black text-white">{stats.equipment} Units</div>
                    <div className="text-xs text-slate-500 mt-1">All calibrations up to date</div>
                </div>
            </div>

            {/* Operations Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* CoA Issuance Queue (The Sovereign Gate) */}
                <div className="glass-panel p-0 overflow-hidden border-emerald-500/30">
                    <div className="p-4 border-b border-white/5 bg-emerald-500/5 flex justify-between items-center">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Sovereign CoA Issuance</h3>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">PENDING RELEASE</span>
                    </div>
                    <div className="divide-y divide-white/5">
                        {[1, 2].map(i => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                                <div>
                                    <div className="text-xs font-black text-white">Batch #IQC-B22-X{i}</div>
                                    <div className="text-[10px] text-slate-500 mt-1">Technically Validated by QA Unit • 15m ago</div>
                                </div>
                                <button 
                                    onClick={() => alert(`Certificate of Analysis (CoA) for Batch X${i} digitally signed and released to Sovereign Ledger.`)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black text-white uppercase tracking-widest rounded transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                >
                                    🖋️ Issue CoA
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 bg-black/20 text-center text-[9px] text-slate-600 font-bold uppercase tracking-tighter">
                        ⚠️ Digital Signature will be appended to final document
                    </div>
                </div>

                {/* Bench Activity Log */}
                <div className="glass-panel">
                    <h3 className="text-lg font-black text-white mb-6">Bench Activity Log</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5 transition-all">
                                <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center text-sm">🧪</div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-white">Sample #INT-{2000+i} Processing</div>
                                    <div className="text-[10px] text-slate-500">Assigned to: Senior Analyst • 2h ago</div>
                                </div>
                                <div className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">ANALYZING</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Equipment / Maintenance Radar */}
                <div className="glass-panel">
                    <h3 className="text-lg font-black text-white mb-6">Maintenance & Calibration</h3>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">HPLC System Alpha</span>
                            <span className="text-[10px] text-green-400 font-bold bg-green-400/10 px-2 py-1 rounded">CALIBRATED</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">GC-MS Delta</span>
                            <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-1 rounded">DUE IN 4 DAYS</span>
                        </div>
                        <div className="flex justify-between items-center opacity-40">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Micro-Balance II</span>
                            <span className="text-[10px] text-slate-500 font-bold bg-slate-500/10 px-2 py-1 rounded">OFFLINE</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
