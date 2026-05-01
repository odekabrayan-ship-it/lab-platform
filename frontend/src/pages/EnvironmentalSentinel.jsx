import { useState, useEffect } from "react";
import API from "../services/api";

export default function EnvironmentalSentinel() {
    const [history, setHistory] = useState([
        { id: 1, timestamp: "2026-04-26 08:00", temp: 22.1, humidity: 45, pressure: 1012, status: "OPTIMAL" },
        { id: 2, timestamp: "2026-04-26 12:00", temp: 24.5, humidity: 48, pressure: 1010, status: "OPTIMAL" }
    ]);

    const [formData, setFormData] = useState({ temp: "", humidity: "", pressure: "" });
    const [limits] = useState({ temp: 25, humidity: 60 }); // ISO typical limits

    const handleSubmit = (e) => {
        e.preventDefault();
        const t = parseFloat(formData.temp);
        const h = parseFloat(formData.humidity);
        const isOOR = t > limits.temp || h > limits.humidity;

        const newLog = {
            id: Date.now(),
            timestamp: new Date().toLocaleString(),
            temp: t,
            humidity: h,
            pressure: formData.pressure,
            status: isOOR ? "CRITICAL (OOR)" : "OPTIMAL"
        };

        setHistory([newLog, ...history]);
        setFormData({ temp: "", humidity: "", pressure: "" });
        
        if (isOOR) {
            alert("⚠️ WARNING: Environmental conditions are OUT OF RANGE. Bench operations will be flagged as COMPROMISED.");
        }
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Environmental Sentinel</h2>
                    <p className="text-slate-400 text-sm mt-1">ISO 17025 Clause 6.3 Compliance: Monitoring of laboratory environmental parameters.</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">System Status</div>
                    <div className="text-emerald-500 font-black text-xs flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        MONITORING ACTIVE
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Panel */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-6 border-blue-500/20">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4">Shift Environment Sync</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Temperature (°C)</label>
                                <input 
                                    required
                                    type="number" step="0.1"
                                    className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                                    placeholder="22.5"
                                    value={formData.temp}
                                    onChange={e => setFormData({ ...formData, temp: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Humidity (%)</label>
                                <input 
                                    required
                                    type="number" step="1"
                                    className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                                    placeholder="45"
                                    value={formData.humidity}
                                    onChange={e => setFormData({ ...formData, humidity: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Pressure (hPa)</label>
                            <input 
                                required
                                type="number"
                                className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                                placeholder="1013"
                                value={formData.pressure}
                                onChange={e => setFormData({ ...formData, pressure: e.target.value })}
                            />
                        </div>

                        <div className="bg-white/5 p-4 rounded text-[10px] text-slate-500 leading-relaxed italic">
                            Measurement traceability is mandatory. Ensure all values are from calibrated sensors.
                        </div>

                        <button type="submit" className="w-full btn-primary py-4 bg-blue-600 font-bold uppercase tracking-widest text-xs">
                            Sync Laboratory State
                        </button>
                    </form>
                </div>

                {/* Tracking History */}
                <div className="lg:col-span-2">
                    <div className="glass-panel p-0 overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Environmental Audit Ledger</h3>
                            <div className="flex gap-4">
                                <div className="text-[10px] text-slate-500">T_LIMIT: <strong>{limits.temp}°C</strong></div>
                                <div className="text-[10px] text-slate-500">H_LIMIT: <strong>{limits.humidity}%</strong></div>
                            </div>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Temp</th>
                                    <th>Humidity</th>
                                    <th>Pressure</th>
                                    <th className="text-right">Condition</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(log => (
                                    <tr key={log.id} className="hover:bg-white/5">
                                        <td className="text-xs font-mono text-slate-400">{log.timestamp}</td>
                                        <td className="font-bold text-white">{log.temp}°C</td>
                                        <td className="font-bold text-white">{log.humidity}%</td>
                                        <td className="text-slate-500">{log.pressure} hPa</td>
                                        <td className="text-right">
                                            <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase ${log.status === 'OPTIMAL' ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10 animate-pulse'}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
