import { useState, useEffect, useRef } from "react";
import API from "../services/api";

// P3-1: Levey-Jennings / Control Chart Module (ISO 17025 §7.7)
// Tracks QC results over time, calculates mean/SD, plots Westgard-style control limits

const WESTGARD_RULES = [
    { id: "1-2s",  desc: "1 value exceeds ±2SD",   check: (pts, m, sd) => pts.some(p => Math.abs(p - m) > 2 * sd) },
    { id: "1-3s",  desc: "1 value exceeds ±3SD",   check: (pts, m, sd) => pts.some(p => Math.abs(p - m) > 3 * sd), critical: true },
    { id: "2-2s",  desc: "2 consecutive > +2SD or < -2SD", check: (pts, m, sd) => {
        for (let i = 0; i < pts.length - 1; i++) {
            if ((pts[i] - m > 2*sd && pts[i+1] - m > 2*sd) || (m - pts[i] > 2*sd && m - pts[i+1] > 2*sd)) return true;
        }
        return false;
    }},
    { id: "10x",   desc: "10 consecutive on same side of mean", check: (pts, m) => {
        let run = 1;
        for (let i = 1; i < pts.length; i++) {
            if ((pts[i] > m) === (pts[i-1] > m)) { run++; if (run >= 10) return true; }
            else run = 1;
        }
        return false;
    }, critical: true },
];

const calcStats = (values) => {
    if (!values.length) return { mean: 0, sd: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    return { mean, sd: Math.sqrt(variance) };
};

export default function ControlChart() {
    const [methods, setMethods] = useState([]);
    const [selectedMethod, setSelectedMethod] = useState("");
    const [selectedQCType, setSelectedQCType] = useState("METHOD_BLANK");
    const [qcData, setQcData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ method_id: "", qc_type: "METHOD_BLANK", value: "", unit: "", run_date: new Date().toISOString().split('T')[0], batch_id: "", notes: "" });
    const [submitting, setSubmitting] = useState(false);
    const svgRef = useRef(null);

    const QC_TYPES = {
        METHOD_BLANK: { label: "Method Blank", color: "#3b82f6" },
        CALIBRATION_STANDARD: { label: "Calibration Standard", color: "#10b981" },
        SPIKED_SAMPLE: { label: "Spiked Sample (Recovery)", color: "#f59e0b" },
        QC_SAMPLE: { label: "QC Reference Sample", color: "#8b5cf6" },
        DUPLICATE: { label: "Duplicate/Split", color: "#06b6d4" },
    };

    useEffect(() => {
        API.get("/api/methods").then(r => setMethods(r.data.data || []));
    }, []);

    useEffect(() => {
        if (!selectedMethod) return;
        fetchQCData();
    }, [selectedMethod, selectedQCType]);

    const fetchQCData = async () => {
        setLoading(true);
        try {
            const res = await API.get(`/api/qc-results?method_id=${selectedMethod}&qc_type=${selectedQCType}&limit=30`);
            setQcData(res.data.data || []);
        } catch {
            setQcData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddQC = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await API.post("/api/qc-results", { ...addForm, method_id: selectedMethod || addForm.method_id });
            setShowAddModal(false);
            setAddForm({ method_id: "", qc_type: "METHOD_BLANK", value: "", unit: "", run_date: new Date().toISOString().split('T')[0], batch_id: "", notes: "" });
            fetchQCData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to log QC result");
        } finally {
            setSubmitting(false);
        }
    };

    const values = qcData.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
    const { mean, sd } = calcStats(values);

    // Westgard Rule Checks
    const violations = WESTGARD_RULES.filter(r => values.length >= 2 && r.check(values, mean, sd));

    // SVG Chart Builder
    const chartWidth = 700;
    const chartHeight = 220;
    const padL = 55, padR = 20, padT = 20, padB = 40;
    const plotW = chartWidth - padL - padR;
    const plotH = chartHeight - padT - padB;

    const yMin = mean - 3.5 * sd;
    const yMax = mean + 3.5 * sd;
    const yScale = v => padT + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
    const xScale = i => padL + (i / Math.max(values.length - 1, 1)) * plotW;

    const sdLine = (nSD, color, dash = "") => {
        const y = yScale(mean + nSD * sd);
        return <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke={color} strokeWidth={nSD === 0 ? 2 : 1} strokeDasharray={dash} opacity={0.7} />;
    };

    const methodObj = methods.find(m => m.id == selectedMethod);

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Control Chart <span className="text-amber-500">Monitor</span></h2>
                    <p className="text-slate-400 text-sm mt-1">ISO 17025 §7.7 — Levey-Jennings QC trending with Westgard rule violation detection.</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all">
                    + Log QC Result
                </button>
            </div>

            {/* Filter Row */}
            <div className="flex gap-4 flex-wrap">
                <select
                    className="p-3 bg-slate-900 border border-white/10 rounded-lg text-sm outline-none focus:border-amber-500 min-w-[220px]"
                    value={selectedMethod}
                    onChange={e => setSelectedMethod(e.target.value)}
                >
                    <option value="">— Select Test Method —</option>
                    {methods.map(m => <option key={m.id} value={m.id}>{m.parameter_name} ({m.code || m.method_reference})</option>)}
                </select>
                {Object.entries(QC_TYPES).map(([k, v]) => (
                    <button key={k} onClick={() => setSelectedQCType(k)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${selectedQCType === k ? 'text-white border-amber-500 bg-amber-600' : 'border-white/10 text-slate-500 hover:text-white'}`}>
                        {v.label}
                    </button>
                ))}
            </div>

            {selectedMethod ? (
                <div className="space-y-6">
                    {/* Westgard Violation Alerts */}
                    {violations.length > 0 && (
                        <div className="glass-panel border-red-500/30 bg-red-500/5 p-5 space-y-3">
                            <div className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                Westgard Rule Violations Detected — Analytical Run May Be OUT OF CONTROL
                            </div>
                            {violations.map(v => (
                                <div key={v.id} className={`flex items-center gap-3 text-xs ${v.critical ? 'text-red-400' : 'text-amber-400'}`}>
                                    <span className={`w-8 text-center font-mono font-black text-[9px] py-0.5 rounded border ${v.critical ? 'border-red-500/30 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>{v.id}</span>
                                    {v.desc}
                                    {v.critical && <span className="text-[8px] font-black text-red-500 uppercase">REJECT RUN</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {violations.length === 0 && values.length >= 2 && (
                        <div className="glass-panel border-emerald-500/20 bg-emerald-500/5 p-4">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">✅ All Westgard Rules Pass — Process In Control</span>
                        </div>
                    )}

                    {/* Levey-Jennings Chart */}
                    <div className="glass-panel p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-black text-white">{methodObj?.parameter_name} — {QC_TYPES[selectedQCType]?.label}</h3>
                                {values.length >= 2 && <p className="text-[10px] text-slate-500 mt-0.5">Mean: {mean.toFixed(4)} | SD: {sd.toFixed(4)} | n={values.length}</p>}
                            </div>
                            <div className="flex gap-4 text-[9px]">
                                {[['+3SD', '#ef4444'], ['+2SD', '#f59e0b'], ['Mean', '#10b981'], ['-2SD', '#f59e0b'], ['-3SD', '#ef4444']].map(([l, c]) => (
                                    <div key={l} className="flex items-center gap-1"><div className="w-4 h-0.5 rounded" style={{ background: c }}></div><span className="text-slate-500">{l}</span></div>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div className="h-[220px] flex items-center justify-center text-slate-500">Loading QC data...</div>
                        ) : values.length < 2 ? (
                            <div className="h-[220px] flex items-center justify-center text-slate-600">Log at least 2 QC results to generate control chart.</div>
                        ) : (
                            <svg ref={svgRef} width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
                                {/* Grid */}
                                <rect x={padL} y={padT} width={plotW} height={plotH} fill="rgba(255,255,255,0.02)" />

                                {/* SD lines */}
                                {sdLine(3, '#ef4444', '4,3')}
                                {sdLine(2, '#f59e0b', '4,3')}
                                {sdLine(1, '#94a3b8', '2,3')}
                                {sdLine(0, '#10b981')}
                                {sdLine(-1, '#94a3b8', '2,3')}
                                {sdLine(-2, '#f59e0b', '4,3')}
                                {sdLine(-3, '#ef4444', '4,3')}

                                {/* SD labels */}
                                {[3, 2, 1, 0, -1, -2, -3].map(n => (
                                    <text key={n} x={padL - 5} y={yScale(mean + n * sd) + 4} textAnchor="end" fontSize="8" fill={n === 0 ? '#10b981' : Math.abs(n) === 3 ? '#ef4444' : '#f59e0b'}>
                                        {n > 0 ? `+${n}SD` : n === 0 ? 'Mean' : `${n}SD`}
                                    </text>
                                ))}

                                {/* Connecting line */}
                                <polyline
                                    points={values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ')}
                                    fill="none" stroke="#64748b" strokeWidth="1.5"
                                />

                                {/* Data points */}
                                {values.map((v, i) => {
                                    const isViolation = Math.abs(v - mean) > 2 * sd;
                                    const isCritical = Math.abs(v - mean) > 3 * sd;
                                    return (
                                        <g key={i}>
                                            <circle cx={xScale(i)} cy={yScale(v)} r={5} fill={isCritical ? '#ef4444' : isViolation ? '#f59e0b' : '#3b82f6'} stroke={isCritical ? '#fca5a5' : isViolation ? '#fde68a' : '#93c5fd'} strokeWidth="2" />
                                            <text x={xScale(i)} y={chartHeight - padB + 15} textAnchor="middle" fontSize="7" fill="#475569">
                                                {qcData[i] ? new Date(qcData[i].run_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : ''}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        )}
                    </div>

                    {/* QC Data Table */}
                    <div className="glass-panel p-0 overflow-hidden">
                        <div className="p-5 border-b border-white/5 bg-white/5">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">QC Run History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table text-sm">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>QC Type</th>
                                        <th>Value</th>
                                        <th>Z-Score</th>
                                        <th>Status</th>
                                        <th>Batch</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {qcData.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center py-8 text-slate-600">No QC data. Log your first QC result.</td></tr>
                                    ) : qcData.map(d => {
                                        const val = parseFloat(d.value);
                                        const z = sd > 0 ? ((val - mean) / sd).toFixed(2) : 'N/A';
                                        const absZ = Math.abs(parseFloat(z));
                                        return (
                                            <tr key={d.id} className={absZ > 3 ? 'bg-red-500/5' : absZ > 2 ? 'bg-amber-500/5' : ''}>
                                                <td className="font-mono text-xs">{new Date(d.run_date).toLocaleDateString()}</td>
                                                <td className="text-[10px]">{QC_TYPES[d.qc_type]?.label || d.qc_type}</td>
                                                <td className="font-mono font-black text-blue-300">{d.value} {d.unit}</td>
                                                <td className={`font-mono font-black text-sm ${absZ > 3 ? 'text-red-400' : absZ > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>{z}</td>
                                                <td>
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${absZ > 3 ? 'bg-red-500/20 text-red-400' : absZ > 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                        {absZ > 3 ? '⛔ Reject' : absZ > 2 ? '⚠️ Warning' : '✅ In Control'}
                                                    </span>
                                                </td>
                                                <td className="font-mono text-xs text-slate-500">{d.batch_id || '—'}</td>
                                                <td className="text-[10px] text-slate-500">{d.notes || '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-panel flex items-center justify-center h-80 border-dashed text-slate-600">
                    <div className="text-center">
                        <div className="text-4xl mb-4">📈</div>
                        <p className="font-black text-white uppercase tracking-widest mb-2">Select a Method</p>
                        <p className="text-sm">Choose a test method above to view its control chart.</p>
                    </div>
                </div>
            )}

            {/* Add QC Result Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="glass-panel w-full max-w-md animate-scale-up">
                        <h3 className="text-xl font-black text-white mb-1">Log QC Result</h3>
                        <p className="text-xs text-slate-400 mb-6">ISO 17025 §7.7 — Record quality control sample data for trending.</p>
                        <form onSubmit={handleAddQC} className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Test Method</label>
                                <select required className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm outline-none" value={addForm.method_id || selectedMethod} onChange={e => setAddForm({...addForm, method_id: e.target.value})}>
                                    <option value="">Select method...</option>
                                    {methods.map(m => <option key={m.id} value={m.id}>{m.parameter_name} ({m.code || m.method_reference})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">QC Type</label>
                                    <select required className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" value={addForm.qc_type} onChange={e => setAddForm({...addForm, qc_type: e.target.value})}>
                                        {Object.entries(QC_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Run Date</label>
                                    <input type="date" required className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" value={addForm.run_date} onChange={e => setAddForm({...addForm, run_date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Value *</label>
                                    <input type="number" step="any" required className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm font-mono" placeholder="0.0000" value={addForm.value} onChange={e => setAddForm({...addForm, value: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Unit</label>
                                    <input className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="mg/L" value={addForm.unit} onChange={e => setAddForm({...addForm, unit: e.target.value})} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Batch / Lot ID</label>
                                    <input className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm font-mono" placeholder="e.g. RUN-2026-045" value={addForm.batch_id} onChange={e => setAddForm({...addForm, batch_id: e.target.value})} />
                                </div>
                            </div>
                            <textarea className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm h-16" placeholder="Notes (analyst, instrument, any deviations)..." value={addForm.notes} onChange={e => setAddForm({...addForm, notes: e.target.value})} />
                            <div className="flex gap-4 pt-2">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase rounded-xl">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase rounded-xl disabled:opacity-50">
                                    {submitting ? '⏳ Logging...' : '📈 Log QC Result'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
