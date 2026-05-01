import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function CompleteLabProfile() {
  const [form, setForm] = useState({
    name: "",
    organization_type: "",
    country: "",
    city: "",
    address: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    accreditation_status: "",
    accreditation_body: "",
    accreditation_number: "",
    accreditation_expiry: "",
    authorized_signatory: "",
    scope_description: "",
    equipment_summary: "",
    turnaround_time: "",
    operating_hours: "",
    sample_pickup: false,
    emergency_service: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Life-Cycle Persistence Check
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.verification_status && user.verification_status !== 'NEW') {
        navigate("/dashboard");
    }
  }, [navigate]);

  const orgTypes = ["private", "university", "government", "non-profit"];
  const accreditations = ["ISO/IEC 17025", "ISO 15189", "GLP", "Local License", "None"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post("/api/labs", form);
      navigate("/lab-capabilities");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit lab application");
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: value });
  };

  return (
    <div className="flex min-h-screen bg-soft">
      {/* Sidebar with Value Props */}
      <div className="w-96 bg-blue-600 p-12 text-white hidden lg:flex flex-col justify-between">
        <div>
          <h1 className="text-4xl font-black mb-8 leading-tight">Join the QualiCore Verified Lab Network</h1>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex-center text-xl">📢</div>
              <div>
                <h4 className="font-bold">Gain Global Visibility</h4>
                <p className="text-sm text-white/70">Connect with thousands of companies seeking verified testing capacity.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex-center text-xl">📩</div>
              <div>
                <h4 className="font-bold">Direct Request Pipeline</h4>
                <p className="text-sm text-white/70">Receive RFQs and test requests directly through your digital dashboard.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex-center text-xl">🛡️</div>
              <div>
                <h4 className="font-bold">Build Digital Trust</h4>
                <p className="text-sm text-white/70">Display your certified status and audit-backed reputation to the network.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex-center text-xl">🏢</div>
              <div>
                <h4 className="font-bold">Enterprise Infrastructure</h4>
                <p className="text-sm text-white/70">Standardize your operations with ISO-aligned quality management tools.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs text-white/40 border-t border-white/10 pt-6">
          QualiCore Lab Onboarding Protocol v4.2 • Regulatory Compliance Mandatory
        </div>
      </div>

      {/* Main Application Form */}
      <div className="flex-1 p-12 flex justify-center overflow-y-auto">
        <div className="w-full max-w-4xl">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-800">Network Accreditation Application</h2>
            <p className="text-slate-500 mt-2">Submit your laboratory's operational and technical dossier for network verification.</p>
          </div>

          {error && <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg font-bold text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-8 pb-20">
            
            {/* Section 1: Laboratory Identity */}
            <div className="glass-panel border-l-4 border-blue-500">
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-6">Laboratory Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Official Registered Lab Name <span className="text-red-500">*</span></label>
                  <input className="w-full p-3 bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" required value={form.name} onChange={update("name")} placeholder="e.g. Central Quality Laboratory Ltd" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Organization Type <span className="text-red-500">*</span></label>
                  <select className="w-full p-3 bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" required value={form.organization_type} onChange={update("organization_type")}>
                    <option value="">Select Category</option>
                    {orgTypes.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Country <span className="text-red-500">*</span></label>
                  <input className="w-full p-3 bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" required value={form.country} onChange={update("country")} placeholder="e.g. Kenya" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">City <span className="text-red-500">*</span></label>
                  <input className="w-full p-3 bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" required value={form.city} onChange={update("city")} placeholder="e.g. Nairobi" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Physical Address</label>
                  <input className="w-full p-3 bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" value={form.address} onChange={update("address")} placeholder="Building, Street..." />
                </div>
              </div>
            </div>

            {/* Section 2: Quality & Accreditation */}
            <div className="glass-panel border-l-4 border-purple-500">
              <h3 className="text-xs font-black text-purple-500 uppercase tracking-widest mb-6">Quality & Accreditation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Authorized Technical Signatory <span className="text-red-500">*</span></label>
                  <input className="w-full p-3 bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" required value={form.authorized_signatory} onChange={update("authorized_signatory")} placeholder="Full name of signatory officer" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Primary Accreditation <span className="text-red-500">*</span></label>
                  <select className="w-full p-3 bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" required value={form.accreditation_status} onChange={update("accreditation_status")}>
                    <option value="">Select Level</option>
                    {accreditations.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Accreditation Number</label>
                  <input className="w-full p-3 bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" value={form.accreditation_number} onChange={update("accreditation_number")} placeholder="e.g. ISO/KEN/001" />
                </div>
              </div>
            </div>

            {/* Section 3: Operational Capacity */}
            <div className="glass-panel border-l-4 border-green-500">
              <h3 className="text-xs font-black text-green-500 uppercase tracking-widest mb-6">Operational Capacity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Standard Turnaround Time <span className="text-red-500">*</span></label>
                  <input className="w-full p-3 bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" required value={form.turnaround_time} onChange={update("turnaround_time")} placeholder="e.g. 5 Business Days" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Intake Operating Hours</label>
                  <input className="w-full p-3 bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" value={form.operating_hours} onChange={update("operating_hours")} placeholder="e.g. Mon-Fri, 08:00 - 17:00" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Technical Scope Summary</label>
                  <textarea rows="3" className="w-full p-3 bg-white border border-slate-200 rounded focus:border-blue-500 outline-none" value={form.scope_description} onChange={update("scope_description")} placeholder="Describe the main analytical categories you serve..." />
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-center p-6 bg-blue-50 rounded-xl border border-blue-100">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex-center text-white text-xl shadow-lg shadow-blue-600/20">ℹ️</div>
              <p className="text-xs text-blue-800 leading-relaxed">
                By submitting this application, you acknowledge that QualiCore administrators will review your credentials. 
                Full activation requires **document verification** and a **network integration fee**.
              </p>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-5 rounded-xl hover:bg-black transition-all shadow-xl shadow-black/10 disabled:opacity-50">
                {loading ? "Transmitting Application..." : "Submit Network Accreditation Application →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
