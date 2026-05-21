import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function CompleteLabProfile() {
  const [currentStep, setCurrentStep] = useState(1);
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

  const orgTypes = [
    { value: "private", label: "Private Commercial Laboratory" },
    { value: "university", label: "Academic / University Research Lab" },
    { value: "government", label: "Government / Regulatory Institution" },
    { value: "non-profit", label: "Non-Profit / NGO Research Agency" }
  ];
  
  const accreditations = ["ISO/IEC 17025", "ISO 15189", "GLP", "Local License", "None"];

  // Compute profile strength dynamically
  const formKeys = Object.keys(form);
  const filledFieldsCount = formKeys.filter(key => {
    const val = form[key];
    if (typeof val === 'boolean') return val === true; // Treat positive offerings as complete
    return val !== "" && val !== null && val !== undefined;
  }).length;
  const strengthPercentage = Math.round((filledFieldsCount / formKeys.length) * 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post("/api/labs", form);
      // Update local storage user status so routing updates dynamically
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.verification_status = "PENDING_REVIEW";
      localStorage.setItem("user", JSON.stringify(user));
      
      navigate("/lab-capabilities");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit laboratory dossier");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: value });
  };

  const nextStep = () => {
    // Validate current step fields before proceeding
    if (currentStep === 1) {
      if (!form.name || !form.organization_type || !form.country || !form.city || !form.contact_person || !form.contact_email || !form.contact_phone) {
        setError("Please complete all mandatory Identity & Contact fields marked with *");
        return;
      }
    } else if (currentStep === 2) {
      if (!form.authorized_signatory || !form.accreditation_status) {
        setError("Please complete the required Quality Assurance & Accreditations fields marked with *");
        return;
      }
    }
    setError("");
    setCurrentStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setError("");
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen bg-soft text-slate-100 font-sans">
      {/* Sidebar - Value Proposition & Onboarding Milestones */}
      <div className="w-[420px] bg-slate-950/80 border-r border-slate-800/80 p-12 hidden lg:flex flex-col justify-between relative overflow-hidden">
        {/* Glow effect in sidebar background */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-fuchsia-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-xs font-bold tracking-widest uppercase">LIMS INFRASTRUCTURE</span>
            <span className="text-slate-500 text-xs">v4.2</span>
          </div>

          <h1 className="text-4xl font-extrabold mb-4 leading-tight tracking-tight text-white">
            Register Your <br />
            <span className="text-gradient bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">ISO-17025</span> Laboratory
          </h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Configure your technical scope, log accreditation credentials, and unlock enterprise testing work orders on the global QualiCore exchange.
          </p>

          {/* Interactive Steps Progress indicator */}
          <div className="space-y-8 mt-12 relative before:content-[''] before:absolute before:left-5 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
            <div className={`flex gap-4 relative z-10 transition-all ${currentStep === 1 ? 'opacity-100 scale-102' : 'opacity-50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border transition-all ${currentStep === 1 ? 'bg-indigo-600 border-indigo-400 text-white shadow-glow' : currentStep > 1 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                {currentStep > 1 ? "✓" : "01"}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-200">Institutional Registry</h4>
                <p className="text-xs text-slate-400 mt-0.5">Laboratory Profile & Identity</p>
              </div>
            </div>

            <div className={`flex gap-4 relative z-10 transition-all ${currentStep === 2 ? 'opacity-100 scale-102' : 'opacity-50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border transition-all ${currentStep === 2 ? 'bg-indigo-600 border-indigo-400 text-white shadow-glow' : currentStep > 2 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                {currentStep > 2 ? "✓" : "02"}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-200">ISO Standards & Quality</h4>
                <p className="text-xs text-slate-400 mt-0.5">Accreditation & Signatories</p>
              </div>
            </div>

            <div className={`flex gap-4 relative z-10 transition-all ${currentStep === 3 ? 'opacity-100 scale-102' : 'opacity-50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border transition-all ${currentStep === 3 ? 'bg-indigo-600 border-indigo-400 text-white shadow-glow' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                03
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-200">Operations & Scope</h4>
                <p className="text-xs text-slate-400 mt-0.5">Logistics, TAT & Capacity</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 mt-12 relative z-10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profile Dossier Strength</span>
            <span className={`text-xs font-black ${strengthPercentage > 80 ? 'text-emerald-400' : strengthPercentage > 40 ? 'text-indigo-400' : 'text-slate-400'}`}>{strengthPercentage}%</span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${strengthPercentage > 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : strengthPercentage > 40 ? 'bg-gradient-to-r from-indigo-500 to-purple-400' : 'bg-slate-600'}`}
              style={{ width: `${strengthPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Maximize your strength score to expedite verification review.</p>
        </div>
      </div>

      {/* Main Form Dashboard */}
      <div className="flex-1 p-8 md:p-12 lg:p-16 flex justify-center overflow-y-auto">
        <div className="w-full max-w-3xl">
          {/* Form Header */}
          <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/50 pb-6">
            <div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                Laboratory Accreditation Form
              </h2>
              <p className="text-slate-400 text-sm mt-1">Submit your technical and administrative credentials for sovereign trust clearance.</p>
            </div>
            <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold rounded-lg uppercase tracking-wider whitespace-nowrap">
              Step {currentStep} of 3
            </div>
          </div>

          {error && (
            <div className="p-4 mb-8 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-semibold flex items-center gap-3 animate-shake">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* STEP 1: INSTITUTIONAL REGISTRY */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-scale-up">
                <div className="p-6 bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                  <h3 className="text-sm font-extrabold text-indigo-400 uppercase tracking-widest mb-1">Step 1: Institutional Profile</h3>
                  <p className="text-xs text-slate-400 mb-6">Enter the primary business identity and core location parameters of the facility.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Official Registered Lab Name <span className="text-indigo-400">*</span></label>
                      <input 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20" 
                        required 
                        value={form.name} 
                        onChange={update("name")} 
                        placeholder="e.g. Apex Industrial Food Safety Lab" 
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Organization Category <span className="text-indigo-400">*</span></label>
                      <select 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500/80 text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500/20" 
                        required 
                        value={form.organization_type} 
                        onChange={update("organization_type")}
                      >
                        <option value="" className="text-slate-600">Select Category...</option>
                        {orgTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Country <span className="text-indigo-400">*</span></label>
                      <input 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20" 
                        required 
                        value={form.country} 
                        onChange={update("country")} 
                        placeholder="e.g. Kenya" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">City <span className="text-indigo-400">*</span></label>
                      <input 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20" 
                        required 
                        value={form.city} 
                        onChange={update("city")} 
                        placeholder="e.g. Nairobi" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Physical/Street Address</label>
                      <input 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20" 
                        value={form.address} 
                        onChange={update("address")} 
                        placeholder="Building, Suite, Industrial Area..." 
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-fuchsia-500" />
                  <h3 className="text-sm font-extrabold text-fuchsia-400 uppercase tracking-widest mb-1">Administrative Contact Registry</h3>
                  <p className="text-xs text-slate-400 mb-6 font-medium">Verify direct pathways for logistics, sample receipts, and formal client communication.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Primary Contact Person <span className="text-fuchsia-400">*</span></label>
                      <input 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-fuchsia-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-fuchsia-500/20" 
                        required 
                        value={form.contact_person} 
                        onChange={update("contact_person")} 
                        placeholder="e.g. Sarah Jenkins (Lab Coordinator)" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Accredited Intake Email <span className="text-fuchsia-400">*</span></label>
                      <input 
                        type="email" 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-fuchsia-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-fuchsia-500/20" 
                        required 
                        value={form.contact_email} 
                        onChange={update("contact_email")} 
                        placeholder="e.g. intake@apexlab.com" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Accredited Intake Phone <span className="text-fuchsia-400">*</span></label>
                      <input 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-fuchsia-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-fuchsia-500/20" 
                        required 
                        value={form.contact_phone} 
                        onChange={update("contact_phone")} 
                        placeholder="e.g. +254 700 000000" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: QUALITY & ISO ACCREDITATION */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-scale-up">
                <div className="p-6 bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
                  <h3 className="text-sm font-extrabold text-purple-400 uppercase tracking-widest mb-1">Step 2: ISO Standard & Quality Assurance</h3>
                  <p className="text-xs text-slate-400 mb-6">Demonstrate regulatory legitimacy and accreditation compliance metrics.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Authorized Technical Signatory <span className="text-purple-400">*</span></label>
                        <span className="text-[10px] text-slate-500 italic hover:text-purple-400 cursor-pointer flex items-center gap-1 group relative">
                          💡 What is this?
                          <span className="absolute bottom-full right-0 w-64 p-3 bg-slate-900 border border-slate-850 rounded-xl shadow-2xl text-[10px] font-medium text-slate-300 invisible group-hover:visible transition-all leading-normal z-55">
                            Under ISO/IEC 17025, this is the designated technical leader who holds legal and analytical responsibility for validating test results and signing Certificates of Analysis (CoA).
                          </span>
                        </span>
                      </div>
                      <input 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-purple-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-purple-500/20" 
                        required 
                        value={form.authorized_signatory} 
                        onChange={update("authorized_signatory")} 
                        placeholder="e.g. Dr. Arthur Pendelton, Head of Microbiology" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Primary Accreditation Level <span className="text-purple-400">*</span></label>
                      <select 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-purple-500/80 text-white outline-none transition-all focus:ring-2 focus:ring-purple-500/20" 
                        required 
                        value={form.accreditation_status} 
                        onChange={update("accreditation_status")}
                      >
                        <option value="">Select Level...</option>
                        {accreditations.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Accreditation Body / Authority</label>
                      <input 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-purple-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-purple-500/20" 
                        value={form.accreditation_body} 
                        onChange={update("accreditation_body")} 
                        placeholder="e.g. KENAS, SANAS, UKAS" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Accreditation/License Number</label>
                      <input 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-purple-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-purple-500/20" 
                        value={form.accreditation_number} 
                        onChange={update("accreditation_number")} 
                        placeholder="e.g. ISO-17025-KEN-84930" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Accreditation Expiry Date</label>
                      <input 
                        type="date"
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-purple-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-purple-500/20" 
                        value={form.accreditation_expiry} 
                        onChange={update("accreditation_expiry")} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: LOGISTICS & TECHNICAL CAPACITY */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-scale-up">
                <div className="p-6 bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                  <h3 className="text-sm font-extrabold text-emerald-400 uppercase tracking-widest mb-1">Step 3: Operational Logistics & Scope</h3>
                  <p className="text-xs text-slate-400 mb-6 font-medium">Configure turnaround metrics, intake schedules, and logistical services offered to the marketplace.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Standard Turnaround Time (TAT) <span className="text-emerald-400">*</span></label>
                      <input 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20" 
                        required 
                        value={form.turnaround_time} 
                        onChange={update("turnaround_time")} 
                        placeholder="e.g. 3-5 Business Days" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Sample Reception Hours</label>
                      <input 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20" 
                        value={form.operating_hours} 
                        onChange={update("operating_hours")} 
                        placeholder="e.g. Mon-Fri, 08:00 - 17:00" 
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Technical Scope of Accreditation Summary</label>
                      <textarea 
                        rows="3" 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 font-sans" 
                        value={form.scope_description} 
                        onChange={update("scope_description")} 
                        placeholder="State technical categories you are authorized to analyze, e.g. microbiological screening of dairy, trace metal spectrometry in clean water, physical food matrix screening..." 
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Key Analytical Instrumentation Summary</label>
                      <textarea 
                        rows="2" 
                        className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500/80 text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 font-sans" 
                        value={form.equipment_summary} 
                        onChange={update("equipment_summary")} 
                        placeholder="Summary of critical infrastructure, e.g. GC-MS spectrometry, HPLC analyzers, biosafety cabinets class II..." 
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500" />
                  <h3 className="text-sm font-extrabold text-cyan-400 uppercase tracking-widest mb-1">Exchange Logistical Enhancements</h3>
                  <p className="text-xs text-slate-400 mb-6">Select additional operational capabilities to display on the public search index.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* SAMPLE PICKUP SWITCH */}
                    <div 
                      onClick={() => setForm(prev => ({ ...prev, sample_pickup: !prev.sample_pickup }))}
                      className={`cursor-pointer p-5 rounded-2xl border transition-all flex items-center justify-between group ${form.sample_pickup ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'}`}
                    >
                      <div className="flex gap-4 items-center pr-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${form.sample_pickup ? 'bg-cyan-500/20 text-cyan-400 shadow-glow' : 'bg-slate-900 text-slate-600'}`}>
                          🚚
                        </div>
                        <div>
                          <div className={`font-bold text-sm transition-all ${form.sample_pickup ? 'text-white' : 'text-slate-300'}`}>Courier Sample Pickup</div>
                          <div className="text-[10px] opacity-75 mt-0.5 leading-normal">Our team provides physical intake collections from corporate client sites.</div>
                        </div>
                      </div>
                      <div className={`w-10 h-6 rounded-full p-1 transition-all flex items-center ${form.sample_pickup ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'}`}>
                        <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                      </div>
                    </div>

                    {/* EMERGENCY RAPID SERVICE SWITCH */}
                    <div 
                      onClick={() => setForm(prev => ({ ...prev, emergency_service: !prev.emergency_service }))}
                      className={`cursor-pointer p-5 rounded-2xl border transition-all flex items-center justify-between group ${form.emergency_service ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'}`}
                    >
                      <div className="flex gap-4 items-center pr-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${form.emergency_service ? 'bg-amber-500/20 text-amber-400 shadow-glow' : 'bg-slate-900 text-slate-600'}`}>
                          ⚡
                        </div>
                        <div>
                          <div className={`font-bold text-sm transition-all ${form.emergency_service ? 'text-white' : 'text-slate-300'}`}>Emergency Rapid Protocol</div>
                          <div className="text-[10px] opacity-75 mt-0.5 leading-normal">We expedite priority batches with rapid 24-48 hour emergency timelines.</div>
                        </div>
                      </div>
                      <div className={`w-10 h-6 rounded-full p-1 transition-all flex items-center ${form.emergency_service ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'}`}>
                        <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 items-center p-6 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 backdrop-blur">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-600/20">🛡️</div>
                  <div>
                    <h5 className="font-extrabold text-sm text-slate-200">ISO-17025 Regulatory Attestation</h5>
                    <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                      By submitting this onboarding dossier, you attest that the laboratory equipment, staff qualifications, and quality management manuals conform standardly to international sovereign regulatory guidelines.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step Navigation Controls */}
            <div className="flex justify-between items-center pt-8 border-t border-slate-800/50 mt-10">
              <div>
                {currentStep > 1 && (
                  <button 
                    type="button" 
                    onClick={prevStep} 
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-300 font-bold uppercase rounded-xl transition-all text-xs tracking-wider"
                  >
                    ← Previous Step
                  </button>
                )}
              </div>
              <div>
                {currentStep < 3 ? (
                  <button 
                    type="button" 
                    onClick={nextStep} 
                    className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase rounded-xl transition-all shadow-lg shadow-indigo-600/20 text-xs tracking-wider"
                  >
                    Next Component →
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black uppercase rounded-xl transition-all shadow-xl shadow-emerald-600/10 text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Transmitting Dossier..." : "Submit Technical Dossier & Join Network ✓"}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
