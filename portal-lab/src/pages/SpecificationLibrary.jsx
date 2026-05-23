import { useState, useEffect } from "react";
import API from "../services/api";

export default function SpecificationLibrary() {
    const [specs, setSpecs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        product_name: "",
        parameter_name: "",
        limit_type: "MAX",
        limit_value: "",
        unit: "",
        method_reference: ""
    });

    const fetchSpecs = async () => {
        try {
            const res = await API.get("/api/specs");
            setSpecs(res.data.data);
        } catch (e) {
            console.error("Failed to fetch specifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSpecs(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post("/api/specs", formData);
            alert("Specification added to Golden Library.");
            setFormData({ product_name: "", parameter_name: "", limit_type: "MAX", limit_value: "", unit: "", method_reference: "" });
            setShowForm(false);
            fetchSpecs();
        } catch (e) {
            alert("Failed to save specification");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to remove this quality specification?")) return;
        try {
            await API.delete(`/api/specs/${id}`);
            fetchSpecs();
        } catch (e) { alert("Deletion failed"); }
    };

    // Group specs by product for better UI
    const groupedSpecs = specs.reduce((acc, spec) => {
        if (!acc[spec.product_name]) acc[spec.product_name] = [];
        acc[spec.product_name].push(spec);
        return acc;
    }, {});

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Specification Sovereignty</h2>
                    <p className="text-slate-400 text-sm mt-1">Manage the "Golden Specifications" that define your quality standards.</p>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="btn-primary px-6 py-2 text-xs font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-500"
                >
                    {showForm ? "✕ Close Form" : "＋ Add New Spec"}
                </button>
            </div>

            {showForm && (
                <div className="glass-panel p-6 animate-slide-in border-blue-500/20 bg-blue-500/5">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Product Name</label>
                            <input 
                                className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                                placeholder="e.g. Raw Material A, Finished Product X"
                                value={formData.product_name}
                                onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Parameter / Test</label>
                            <input 
                                className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                                placeholder="e.g. Lead Content, Moisture, Purity"
                                value={formData.parameter_name}
                                onChange={e => setFormData({ ...formData, parameter_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Limit Type</label>
                                <select 
                                    className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                                    value={formData.limit_type}
                                    onChange={e => setFormData({ ...formData, limit_type: e.target.value })}
                                >
                                    <option value="MAX">MAX (≤)</option>
                                    <option value="MIN">MIN (≥)</option>
                                    <option value="RANGE">RANGE</option>
                                    <option value="EXACT">EXACT (=)</option>
                                    <option value="PASS_FAIL">PASS/FAIL</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Value</label>
                                <input 
                                    className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm font-mono"
                                    placeholder="e.g. 0.05, 5.0 - 6.0"
                                    value={formData.limit_value}
                                    onChange={e => setFormData({ ...formData, limit_value: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Unit</label>
                            <input 
                                className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                                placeholder="e.g. ppm, %, mg/L"
                                value={formData.unit}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Method Reference</label>
                            <input 
                                className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                                placeholder="e.g. ISO 1234, ASTM D-45, In-house Method v2"
                                value={formData.method_reference}
                                onChange={e => setFormData({ ...formData, method_reference: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-3 flex justify-end pt-4">
                            <button type="submit" className="btn-primary px-8 py-3 bg-blue-600 text-sm">Save to Library</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-slate-500">Scanning quality intelligence ledger...</div>
            ) : Object.keys(groupedSpecs).length === 0 ? (
                <div className="glass-panel p-12 text-center border-dashed border-white/10 bg-transparent">
                    <div className="text-4xl mb-4">📚</div>
                    <h3 className="text-xl font-bold text-white mb-2">Library is Empty</h3>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                        The QA Director has not yet established the Golden Specifications. Start by adding a product standard above.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedSpecs).map(([product, items]) => (
                        <div key={product} className="glass-panel p-0 overflow-hidden">
                            <div className="bg-white/5 px-6 py-3 border-b border-white/5 flex justify-between items-center">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">{product}</h3>
                                <span className="text-[10px] font-bold text-slate-500">{items.length} Parameters</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Parameter</th>
                                            <th>Limit</th>
                                            <th>Method</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(spec => (
                                            <tr key={spec.id} className="hover:bg-white/5 transition-colors">
                                                <td className="font-bold text-slate-300">{spec.parameter_name}</td>
                                                <td>
                                                    <span className="text-blue-400 font-mono text-xs">{spec.limit_type}</span>
                                                    <span className="ml-2 font-black text-white">{spec.limit_value}</span>
                                                    <span className="ml-1 text-[10px] text-slate-500">{spec.unit}</span>
                                                </td>
                                                <td className="text-xs text-slate-500 font-medium italic">{spec.method_reference || "N/A"}</td>
                                                <td className="text-right">
                                                    <button 
                                                        onClick={() => handleDelete(spec.id)}
                                                        className="p-2 hover:text-red-500 transition-colors text-slate-600"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
