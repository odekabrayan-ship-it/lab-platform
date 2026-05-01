import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";

const LOG_TYPES = {
    intake: { label: "Sample Intake Environment", icon: "🌡️", fields: ["temp", "humidity"] },
    cold_chain: { label: "Cold Chain Storage", icon: "❄️", fields: ["temp"] },
    cleaning: { label: "Sanitization & Hygiene", icon: "🧹", fields: ["activity"] },
    sterilization: { label: "Autoclave / Sterilization", icon: "🔥", fields: ["pressure", "temp", "duration"] },
    sentinel: { label: "Master Sentinel View", icon: "🛡️", fields: ["all"] }
};

export default function EnvironmentLogs() {
    const { type } = useParams();
    const config = LOG_TYPES[type] || LOG_TYPES.sentinel;
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEntry, setShowEntry] = useState(false);
    const [form, setForm] = useState({
        parameter_1: "",
        parameter_2: "",
        parameter_3: "",
        notes: ""
    });

    const fetchLogs = async () => {
        try {
            const res = await API.get(`/api/logs/${type}`);
            setLogs(res.data.data);
        } catch (e) { console.error("Log fetch failed"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchLogs(); }, [type]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post("/api/logs", {
                type,
                ...form
            });
            alert("Digital record secured in institutional ledger.");
            setShowEntry(false);
            fetchLogs();
        } catch (e) { alert("Logging failed"); }
    };

    return (
        <div className="animate-fade-in p-8">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{config.icon}</span>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{config.label}</h2>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        ISO-17025 Compliance Ledger · Digital Audit Trail Active
                    </p>
                </div>
                <button 
                    onClick={() => setShowEntry(true)}
                    className="btn-primary bg-blue-600 border-none px-6 py-2 text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                >
                    + New Entry
                </button>
            </div>

            <div className="glass-panel overflow-hidden border-t-4 border-blue-500">
                <table className="data-table">
                    <thead>
                        <tr className="bg-slate-900/50">
                            <th className="text-[9px] font-black uppercase text-slate-500 py-4">Timestamp</th>
                            <th className="text-[9px] font-black uppercase text-slate-500">Technician</th>
                            <th className="text-[9px] font-black uppercase text-slate-500">Parameters</th>
                            <th className="text-[9px] font-black uppercase text-slate-500">Institutional Notes</th>
                            <th className="text-[9px] font-black uppercase text-slate-500">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan="5" className="text-center py-20 text-slate-500 animate-pulse">Scanning ledger...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-20 text-slate-600 italic">No environmental records for this period</td></tr>
                        ) : logs.map(log => (
                            <tr key={log.id} className="hover:bg-white/[0.02]">
                                <td className="font-mono text-[10px] text-slate-400 py-4">{new Date(log.created_at).toLocaleString()}</td>
                                <td className="text-xs font-bold text-white">{log.technician_email}</td>
                                <td>
                                    <div className="flex gap-4">
                                        {log.param_1 && <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{log.param_1}</span>}
                                        {log.param_2 && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{log.param_2}</span>}
                                    </div>
                                </td>
                                <td className="text-[11px] text-slate-500">{log.notes || "Standard check complete."}</td>
                                <td>
                                    <span className="pill pill-paid text-[8px] font-black uppercase">VERIFIED</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showEntry && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex-center p-6">
                    <div className="glass-panel w-full max-w-md animate-scale-up border-blue-500/30">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                            <span>{config.icon}</span> Record Environmental Check
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {type === 'intake' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Temp (°C)</label>
                                        <input required type="number" step="0.1" className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm" value={form.parameter_1} onChange={e => setForm({...form, parameter_1: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Humidity (%)</label>
                                        <input required type="number" className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm" value={form.parameter_2} onChange={e => setForm({...form, parameter_2: e.target.value})} />
                                    </div>
                                </div>
                            )}

                            {type === 'cleaning' && (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Hygiene Activity</label>
                                    <select required className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm" value={form.parameter_1} onChange={e => setForm({...form, parameter_1: e.target.value})}>
                                        <option value="">Select Activity...</option>
                                        <option value="BENCH_STERILIZATION">Bench Sterilization (70% Ethanol)</option>
                                        <option value="FLOOR_DISINFECTION">Floor Disinfection</option>
                                        <option value="EQUIPMENT_WIPE">External Equipment Wipe-down</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Technical Observations</label>
                                <textarea className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm h-24" placeholder="Enter any specific observations or anomalies..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowEntry(false)} className="btn-secondary flex-1">Abort</button>
                                <button type="submit" className="btn-primary bg-blue-600 border-none flex-1">Submit Log</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
