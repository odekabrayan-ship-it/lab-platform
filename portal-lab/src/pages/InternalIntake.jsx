import { useState, useEffect } from "react";
import API from "../services/api";

export default function InternalIntake() {
    const [specs, setSpecs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [intakeLog, setIntakeLog] = useState([]);
    const [formData, setFormData] = useState({
        product_name: "",
        batch_number: "",
        sample_id: "",
        sampling_date: new Date().toISOString().split('T')[0],
        sampled_by: ""
    });

    useEffect(() => {
        const fetchSpecs = async () => {
            try {
                const res = await API.get("/api/specs");
                setSpecs(res.data.data);
            } catch (e) {} finally { setLoading(false); }
        };
        fetchSpecs();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newEntry = {
            ...formData,
            id: Date.now(),
            qr_code: `IQC-${formData.batch_number}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        };
        setIntakeLog([newEntry, ...intakeLog]);
        setFormData({ ...formData, sample_id: "", sampled_by: "" });
        // In a real system, this would POST to /api/samples/internal
    };

    const printLabel = (sample) => {
        const win = window.open("", "Print Label", "width=400,height=300");
        win.document.write(`
            <div style="font-family: sans-serif; border: 2px solid black; padding: 20px; text-align: center;">
                <div style="font-size: 10px; font-weight: bold; margin-bottom: 5px;">INTERNAL QUALITY CONTROL</div>
                <div style="font-size: 18px; font-weight: 900;">${sample.qr_code}</div>
                <div style="font-size: 14px; margin: 10px 0;">${sample.product_name}</div>
                <div style="font-size: 10px;">Batch: ${sample.batch_number} | Date: ${sample.sampling_date}</div>
                <div style="margin-top: 15px; border: 1px solid #ccc; padding: 10px; font-mono; font-size: 8px;">[ QR CODE PLACEHOLDER ]</div>
            </div>
        `);
        win.print();
        win.close();
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Internal Intake Unit</h2>
                    <p className="text-slate-400 text-sm mt-1">Scan and register in-house samples into the IQC Chain of Custody.</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Scanner Status</div>
                    <div className="text-emerald-500 font-black text-xs flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        READY FOR INPUT
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Registration Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-6 border-blue-500/20">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4">New Sample Entry</h3>
                        
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Select Product Spec</label>
                            <select 
                                required
                                className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                                value={formData.product_name}
                                onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                            >
                                <option value="">-- Choose Standard --</option>
                                {[...new Set(specs.map(s => s.product_name))].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Plant Batch Number</label>
                            <input 
                                required
                                className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm font-mono"
                                placeholder="e.g. LOT-2026-X4"
                                value={formData.batch_number}
                                onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Sampling Date</label>
                                <input 
                                    type="date"
                                    className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                                    value={formData.sampling_date}
                                    onChange={e => setFormData({ ...formData, sampling_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Sampled By</label>
                                <input 
                                    className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                                    placeholder="Initials"
                                    value={formData.sampled_by}
                                    onChange={e => setFormData({ ...formData, sampled_by: e.target.value })}
                                />
                            </div>
                        </div>

                        <button type="submit" className="w-full btn-primary py-4 bg-blue-600 font-bold uppercase tracking-widest text-xs">
                            Register & Generate ID
                        </button>
                    </form>
                </div>

                {/* Session Intake Log */}
                <div className="lg:col-span-2">
                    <div className="glass-panel p-0 overflow-hidden min-h-[400px]">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Session Intake Log</h3>
                            <span className="text-[10px] font-bold text-slate-500">{intakeLog.length} Registered</span>
                        </div>
                        
                        {intakeLog.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[350px] text-slate-600">
                                <div className="text-4xl mb-4">🏷️</div>
                                <p className="text-xs uppercase font-bold tracking-widest">Awaiting First Entry</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>IQC Tracker ID</th>
                                        <th>Product</th>
                                        <th>Batch</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {intakeLog.map(sample => (
                                        <tr key={sample.id} className="animate-slide-in">
                                            <td className="font-mono text-blue-400 font-bold">{sample.qr_code}</td>
                                            <td className="text-white font-bold">{sample.product_name}</td>
                                            <td className="text-slate-400">{sample.batch_number}</td>
                                            <td className="text-right">
                                                <button 
                                                    onClick={() => printLabel(sample)}
                                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-bold text-white uppercase transition-all"
                                                >
                                                    🖨️ Print Label
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
