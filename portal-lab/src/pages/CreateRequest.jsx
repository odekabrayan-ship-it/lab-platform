import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

export default function CreateRequest() {
    const [engagements, setEngagements] = useState([]);
    const [allSpecs, setAllSpecs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1); // 1=scope, 2=specs, 3=review
    const [submittedRequestId, setSubmittedRequestId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        engagement_id: "",
        test_description: "",
        po_number: "",
        batch_number: "",
        regulatory_market: ""
    });

    const [selectedSpecIds, setSelectedSpecIds] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [engRes, specRes] = await Promise.all([
                    API.get("/api/engagements/active"),
                    API.get("/api/specs")
                ]);
                setEngagements(engRes.data.data || []);
                setAllSpecs(specRes.data.data || []);
            } catch (err) {
                console.error("Failed to fetch data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await API.post("/api/requests", formData);
            const newRequestId = res.data.data.id;
            setSubmittedRequestId(newRequestId);

            // Link selected specs if any
            if (selectedSpecIds.length > 0) {
                await API.post(`/api/requests/${newRequestId}/specs`, { spec_ids: selectedSpecIds });
            }

            setStep(3); // Go to review/success step
        } catch (err) {
            alert(err.response?.data?.message || "Failed to submit request");
        } finally {
            setSubmitting(false);
        }
    };

    const toggleSpec = (id) => {
        setSelectedSpecIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const products = [...new Set(allSpecs.map(s => s.product_name))].sort();
    const selectedSpecs = allSpecs.filter(s => selectedSpecIds.includes(s.id));
    const selectedProduct = selectedSpecs.length > 0 ? selectedSpecs[0].product_name : null;

    const REGULATORY_MARKETS = [
        { value: '', label: '-- Not specified --' },
        { value: 'KEBS', label: 'Kenya Bureau of Standards (KEBS)' },
        { value: 'EU_EXPORT', label: 'EU Market (EC Regulations)' },
        { value: 'FDA_21CFR', label: 'US Market (FDA 21 CFR)' },
        { value: 'WHO_GMP', label: 'WHO GMP (International)' },
        { value: 'CODEX', label: 'Codex Alimentarius' },
        { value: 'INTERNAL', label: 'Internal QC Only' },
    ];

    if (loading) return <div className="animate-fade-in text-center py-20 text-slate-400">Loading authorized partners...</div>;

    // Step 3: Success
    if (step === 3) {
        return (
            <div className="animate-fade-in max-w-2xl mx-auto">
                <div className="glass-panel p-12 text-center border-t-4 border-emerald-500">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✅</div>
                    <h2 className="text-3xl font-black text-white mb-2">Request Submitted</h2>
                    <p className="text-slate-400 mb-2">The laboratory has been notified and will accept your formal scope of work.</p>
                    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 text-left space-y-2">
                        <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Request ID</span><span className="text-white font-black">#{submittedRequestId}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Batch</span><span className="text-white">{formData.batch_number || 'N/A'}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">PO</span><span className="text-white">{formData.po_number || 'N/A'}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Specs Linked</span><span className={selectedSpecIds.length > 0 ? 'text-emerald-400 font-black' : 'text-slate-500'}>{selectedSpecIds.length > 0 ? `${selectedSpecIds.length} parameters (auto-conformance active)` : 'None — manual lab pass/fail'}</span></div>
                        {formData.regulatory_market && <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Regulatory Market</span><span className="text-blue-400">{formData.regulatory_market}</span></div>}
                    </div>
                    <div className="flex gap-4 mt-8">
                        <Link to="/dashboard" className="flex-1 py-4 bg-slate-800 text-white font-black text-[10px] uppercase rounded-xl text-center no-underline hover:bg-slate-700 transition-all">← Back to Dashboard</Link>
                        <Link to="/batch-release" className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase rounded-xl text-center no-underline transition-all">Batch Release Queue →</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Initiate <span className="text-blue-500">Test Request</span></h2>
                <p className="text-slate-400 text-sm mt-1">Create a formal testing order with your authorized laboratory partners.</p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-0">
                {[{ n: 1, label: 'Scope & Identity' }, { n: 2, label: 'Link Specifications' }].map((s, i) => (
                    <div key={s.n} className="flex items-center">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-all ${step >= s.n ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'}`} onClick={() => step > s.n && setStep(s.n)}>
                            <span>{s.n}</span><span>{s.label}</span>
                        </div>
                        {i < 1 && <div className="w-8 h-[2px] bg-white/10 mx-1" />}
                    </div>
                ))}
            </div>

            {/* STEP 1: Scope */}
            {step === 1 && (
                <form className="glass-panel p-8 space-y-6" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Laboratory Partner *</label>
                        <select required className="mt-2 w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm text-slate-200" value={formData.engagement_id} onChange={(e) => setFormData({ ...formData, engagement_id: e.target.value })}>
                            <option value="">-- Select a Partner --</option>
                            {engagements.map(eng => (
                                <option key={eng.id} value={eng.id}>{eng.lab_name} (SLA: {eng.sla_tat || 'Standard'})</option>
                            ))}
                        </select>
                        {engagements.length === 0 && <p className="text-xs text-red-400 mt-2">You must establish a collaboration engagement before creating requests.</p>}
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Regulatory Market / Standard</label>
                        <select className="mt-2 w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm text-slate-200" value={formData.regulatory_market} onChange={e => setFormData({ ...formData, regulatory_market: e.target.value })}>
                            {REGULATORY_MARKETS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">Specifies which standards the lab must apply when selecting methods and reporting format.</p>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detailed Test Description (Scope of Work) *</label>
                        <textarea required rows={5} className="mt-2 w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm text-slate-200 font-mono resize-none" placeholder="Describe the sample type, parameters to be tested, and any specific technical requirements..." value={formData.test_description} onChange={(e) => setFormData({ ...formData, test_description: e.target.value })} />
                        <p className="text-[10px] text-slate-500 mt-1">This defines the formal scope of work for the laboratory.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purchase Order (PO) Number</label>
                            <input type="text" className="mt-2 w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm text-slate-200" placeholder="e.g. PO-2026-001" value={formData.po_number} onChange={(e) => setFormData({ ...formData, po_number: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch / Lot Number</label>
                            <input type="text" className="mt-2 w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm text-slate-200" placeholder="e.g. BATCH-A99" value={formData.batch_number} onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-2">
                        <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 bg-slate-800 text-slate-300 font-black text-[10px] uppercase rounded-xl hover:bg-slate-700 transition-all">Cancel</button>
                        <button type="submit" disabled={!formData.engagement_id || !formData.test_description} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-[10px] uppercase rounded-xl transition-all">
                            Next: Link Specifications →
                        </button>
                    </div>
                </form>
            )}

            {/* STEP 2: Spec Linking */}
            {step === 2 && (
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="glass-panel p-6 border-l-4 border-blue-500">
                        <h3 className="text-sm font-black text-white mb-1">Link Product Specifications</h3>
                        <p className="text-[10px] text-slate-400">Linking specs enables automatic PASS/FAIL conformance checking when the lab reports results. Without linked specs, the lab manually enters pass/fail.</p>
                    </div>

                    {allSpecs.length === 0 ? (
                        <div className="glass-panel p-8 text-center border border-dashed border-white/10">
                            <div className="text-3xl mb-3">📋</div>
                            <p className="text-slate-400 text-sm">No specifications in your library yet.</p>
                            <p className="text-[10px] text-slate-500 mt-1">You can proceed without specs — the lab will enter pass/fail manually.</p>
                        </div>
                    ) : (
                        <div className="glass-panel p-6 space-y-4">
                            {products.map(product => {
                                const productSpecs = allSpecs.filter(s => s.product_name === product);
                                const allSelected = productSpecs.every(s => selectedSpecIds.includes(s.id));
                                return (
                                    <div key={product} className="border border-white/5 rounded-xl overflow-hidden">
                                        <div className="flex items-center justify-between p-3 bg-white/[0.02] cursor-pointer" onClick={() => {
                                            if (allSelected) setSelectedSpecIds(prev => prev.filter(id => !productSpecs.map(s => s.id).includes(id)));
                                            else setSelectedSpecIds(prev => [...new Set([...prev, ...productSpecs.map(s => s.id)])]);
                                        }}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[8px] font-black transition-all ${allSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-white/20'}`}>{allSelected ? '✓' : ''}</div>
                                                <span className="text-xs font-black text-white uppercase tracking-widest">{product}</span>
                                            </div>
                                            <span className="text-[9px] text-slate-500">{productSpecs.length} parameters</span>
                                        </div>
                                        <div className="divide-y divide-white/5">
                                            {productSpecs.map(spec => (
                                                <label key={spec.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.02] transition-all">
                                                    <input type="checkbox" className="w-4 h-4 accent-blue-500" checked={selectedSpecIds.includes(spec.id)} onChange={() => toggleSpec(spec.id)} />
                                                    <div className="flex-1">
                                                        <span className="text-xs font-bold text-slate-200">{spec.parameter_name}</span>
                                                        <span className="text-[10px] text-slate-500 ml-2">{spec.limit_type} {spec.limit_value} {spec.unit}</span>
                                                        {spec.method_reference && <span className="text-[9px] text-blue-400 ml-2">Method: {spec.method_reference}</span>}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {selectedSpecIds.length > 0 && (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-bold">
                            ✅ {selectedSpecIds.length} spec parameter(s) linked — Automatic conformance checking will be active for this batch.
                        </div>
                    )}

                    <div className="flex justify-between gap-4 pt-2">
                        <button type="button" onClick={() => setStep(1)} className="px-6 py-3 bg-slate-800 text-slate-300 font-black text-[10px] uppercase rounded-xl hover:bg-slate-700 transition-all">← Back</button>
                        <button type="submit" disabled={submitting} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-[10px] uppercase rounded-xl transition-all">
                            {submitting ? 'Submitting...' : 'Submit Formal Request ✓'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
