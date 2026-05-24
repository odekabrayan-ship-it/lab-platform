import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const StepIndicator = ({ current, total }) => (
    <div className="flex items-center justify-center gap-3 mb-10">
        {[...Array(total)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 ${
                    current > i + 1 ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' :
                    current === i + 1 ? 'bg-indigo-600 text-white shadow-[0_0_30px_rgba(79,70,229,0.5)] scale-110' :
                    'bg-white/5 text-slate-500 border border-white/10'
                }`}>
                    {current > i + 1 ? '✓' : i + 1}
                </div>
                {i < total - 1 && (
                    <div className={`w-12 h-1 rounded-full transition-all duration-500 ${
                        current > i + 1 ? 'bg-indigo-500/50' : 'bg-white/5'
                    }`} />
                )}
            </div>
        ))}
    </div>
);

export default function CompleteProfile() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    company_name: "",
    industry_type: "",
    country: "",
    city: "",
    full_address: "",
    tax_id: "",
    website: "",
    company_bio: "",
    contact_person: "",
    contact_phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const industries = ["food", "construction", "pharma", "medical", "material", "other"];

  // Life-Cycle Persistence Check
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.verification_status && user.verification_status !== 'NEW') {
        navigate("/company-dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      await API.post("/api/clients", form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create profile. Please check the network.");
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const isStepValid = () => {
    if (step === 1) return form.company_name && form.industry_type;
    if (step === 2) return form.tax_id && form.country && form.city && form.full_address;
    if (step === 3) return form.contact_person && form.contact_phone;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#020617] relative flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* Cinematic Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(99,102,241,0.05)_0%,_transparent_50%)] pointer-events-none"></div>
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-2xl relative z-10 animate-fade-in">
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Industrial Entity Setup
                </div>
                <h1 className="text-4xl font-bold tracking-tighter mb-2 text-white">Business <span className="text-indigo-400">Identity</span></h1>
                <p className="text-slate-500 text-sm">Finalize your organization's profile to access the ecosystem.</p>
            </div>

            <StepIndicator current={step} total={3} />

            <div className="glass-panel p-10 border-white/5 bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-indigo-400"></div>
                
                {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold mb-6">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold text-white mb-6">1. Core Information</h3>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Legal Company Name *</label>
                                <input required value={form.company_name} onChange={update("company_name")} placeholder="e.g. Acme Pharmaceuticals Ltd." className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-indigo-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Primary Industry *</label>
                                <select required value={form.industry_type} onChange={update("industry_type")} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all appearance-none">
                                    <option value="" className="bg-[#0f172a] text-slate-500">Select Industry</option>
                                    {industries.map(ind => <option key={ind} value={ind} className="bg-[#0f172a]">{ind.charAt(0).toUpperCase() + ind.slice(1)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Corporate Website</label>
                                <input type="url" value={form.website} onChange={update("website")} placeholder="https://www.company.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Company Bio</label>
                                <textarea rows="3" value={form.company_bio} onChange={update("company_bio")} placeholder="Briefly describe your operations..." className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-slate-700"></textarea>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold text-white mb-6">2. Legal & Logistics</h3>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Tax ID / Registration *</label>
                                <input required value={form.tax_id} onChange={update("tax_id")} placeholder="e.g. TR-123456789" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Country *</label>
                                    <input required value={form.country} onChange={update("country")} placeholder="Turkey" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">City *</label>
                                    <input required value={form.city} onChange={update("city")} placeholder="Adana" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Full Physical Address *</label>
                                <input required value={form.full_address} onChange={update("full_address")} placeholder="Street, Building, ZIP" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700" />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-bold text-white mb-6">3. Authorized Contact</h3>
                            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed mb-6">
                                This person will act as the primary liaison for operational requests and quality management within the portal.
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Contact Person Name *</label>
                                <input required value={form.contact_person} onChange={update("contact_person")} placeholder="Full Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Direct Phone *</label>
                                <input required value={form.contact_phone} onChange={update("contact_phone")} placeholder="+90 555 123 4567" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700" />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 mt-10">
                        {step > 1 && (
                            <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-4 rounded-xl bg-white/5 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                                Back
                            </button>
                        )}
                        <button 
                            type="submit" 
                            disabled={!isStepValid() || loading}
                            className="flex-1 py-4 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                        >
                            {loading ? "Processing..." : step < 3 ? "Continue" : "Finalize Profile"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
}
