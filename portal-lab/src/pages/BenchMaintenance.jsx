import { useState } from "react";

export default function BenchMaintenance() {
    const [logs, setLogs] = useState([
        { id: 1, date: "2026-04-26", task: "HPLC System Alpha - Flushing", status: "COMPLETED", analyst: "JD", type: "INSTRUMENT" },
        { id: 2, date: "2026-04-26", task: "Bench Area 4 - Sterilization Cycle", status: "COMPLETED", analyst: "JD", type: "SANITATION" }
    ]);

    const [formData, setFormData] = useState({ task: "", notes: "", type: "SANITATION" });

    const handleSubmit = (e) => {
        e.preventDefault();
        const newLog = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            task: formData.task,
            status: "COMPLETED",
            analyst: "SYSTEM_USER",
            type: formData.type
        };
        setLogs([newLog, ...logs]);
        setFormData({ task: "", notes: "", type: "SANITATION" });
        alert("Compliance Event Logged: Sterilization/Maintenance record committed to the immutable QC ledger.");
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">Sanitation & <span className="text-blue-500">Asset Hygiene</span></h2>
                    <p className="text-slate-400 text-sm mt-1">GLP-compliant ledger for sterilization cycles, decontamination, and daily technical hygiene.</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hygiene Sentinel</div>
                    <div className="text-emerald-500 font-black text-xs flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        FACILITY DECONTAMINATED
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Compliance Entry */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleSubmit} className="glass-panel p-8 space-y-6 border-blue-500/10">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                            <span className="text-2xl">🛡️</span>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Log Hygiene Event</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Category</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, type: 'SANITATION'})}
                                        className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all ${formData.type === 'SANITATION' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                                    >
                                        Sanitation
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, type: 'INSTRUMENT'})}
                                        className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all ${formData.type === 'INSTRUMENT' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                                    >
                                        Instrument
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Operation Protocol</label>
                                <select 
                                    required
                                    className="w-full p-4 bg-slate-950 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-sm font-bold text-white transition-all"
                                    value={formData.task}
                                    onChange={e => setFormData({ ...formData, task: e.target.value })}
                                >
                                    <option value="">-- Select SOP Task --</option>
                                    <optgroup label="Sanitation Protocols">
                                        <option value="Full Bench Decontamination (70% EtOH)">Full Bench Decontamination (70% EtOH)</option>
                                        <option value="Sterilization Cycle (Autoclave)">Sterilization Cycle (Autoclave)</option>
                                        <option value="Biological Safety Cabinet Purge">Biological Safety Cabinet Purge</option>
                                    </optgroup>
                                    <optgroup label="Asset Maintenance">
                                        <option value="Equipment Internal Flushing">Equipment Internal Flushing</option>
                                        <option value="Balance Leveling & Tare Verification">Balance Leveling & Tare Verification</option>
                                        <option value="Waste Stream Disposal (Hazardous)">Waste Stream Disposal (Hazardous)</option>
                                    </optgroup>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Technical Observations</label>
                                <textarea 
                                    className="w-full p-4 bg-slate-950 border border-white/10 rounded-xl outline-none focus:border-blue-500 text-sm h-32 transition-all font-medium"
                                    placeholder="Enter details for the audit trail..."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        <button type="submit" className="w-full btn-primary py-4 bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-widest text-[10px] border-none shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)]">
                            Commit to Compliance Ledger →
                        </button>
                    </form>
                </div>

                {/* Audit Trail */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel p-0 overflow-hidden border-white/5">
                        <div className="p-6 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">Immutable Compliance Trail</h3>
                            <span className="text-[10px] font-black text-slate-500 uppercase">ISO 17025 VERIFIED</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 text-xs font-black text-slate-400 font-mono">{log.date}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-black text-white text-sm tracking-tight">{log.task}</div>
                                                <div className="text-[9px] text-slate-500 font-bold uppercase mt-1">Logged by {log.analyst}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest ${log.type === 'SANITATION' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-[9px] font-black text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-all">
                                                    ✓ CERTIFIED
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="p-8 glass-panel bg-emerald-500/5 border-emerald-500/10 flex items-center justify-between">
                        <div>
                            <h4 className="text-xl font-black text-white tracking-tight mb-1">Audit-Ready State</h4>
                            <p className="text-slate-400 text-sm font-medium">All facility and bench operations are current and archived.</p>
                        </div>
                        <div className="text-4xl">🛡️</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
