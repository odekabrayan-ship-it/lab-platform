'use client';
import { useState, useEffect } from 'react';

export default function ReportIssue() {
  const [brands, setBrands] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || (`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`)}/api/public/brands`)
      .then(res => res.json())
      .then(data => setBrands(data.data || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || (`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`)}/api/public/vigilance/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) setSubmitted(true);
    } catch (err) {
      alert("Submission failed. Please try again.");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-6 text-white selection:bg-indigo-500/30">
        <div className="max-w-2xl w-full text-center p-16 rounded-[3rem] bg-white/[0.01] border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30"></div>
          <div className="w-24 h-24 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-10 text-5xl">✓</div>
          <h2 className="text-4xl font-bold tracking-tighter mb-6">Submission Authenticated</h2>
          <p className="text-white/40 leading-relaxed mb-12 font-medium">
            Your adverse signal has been successfully injected into the QualiCore Vigilance Engine. 
            A unique investigation UUID has been generated. The target entity's quality department has been notified for formal remediation.
          </p>
          <a href="/" className="inline-block px-12 py-5 bg-white text-black font-black rounded-2xl hover:bg-slate-200 transition-all shadow-2xl shadow-white/5">
            Exit Protocol
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02040a] text-[#f8fafc] selection:bg-red-500/20">
      <div className="max-w-5xl mx-auto py-32 px-6">
        <header className="mb-20">
          <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Secure Vigilance Intake Protocol</span>
          </div>
          <h1 className="text-6xl font-bold tracking-tighter mb-6 leading-none">Submit <span className="text-red-500">Adverse</span> Signal.</h1>
          <p className="text-white/40 max-w-2xl text-lg font-medium leading-relaxed">
            Report safety concerns, physical defects, or adverse health outcomes through our structured oversight framework. 
            This information directly impacts the target entity's Trust Confidence Score.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="p-12 lg:p-16 rounded-[3rem] bg-white/[0.01] border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">I. Primary Analytical Target</label>
              <select name="brand_id" required className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-red-500/50 outline-none appearance-none font-bold text-white/80">
                <option value="" className="bg-[#02040a]">Select Verified Brand...</option>
                {brands.map(b => <option key={b.id} value={b.id} className="bg-[#02040a]">{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">II. Adverse Event Classification</label>
              <select name="symptom_type" required className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-red-500/50 outline-none appearance-none font-bold text-white/80">
                <option value="allergic" className="bg-[#02040a]">Allergic Reaction (Acute/Delayed)</option>
                <option value="digestive" className="bg-[#02040a]">Gastrointestinal Distress</option>
                <option value="skin" className="bg-[#02040a]">Dermatological Irritation</option>
                <option value="physical" className="bg-[#02040a]">Material/Physical Product Defect</option>
                <option value="contamination" className="bg-[#02040a]">Suspected Impurity/Contamination</option>
                <option value="other" className="bg-[#02040a]">Other Health/Safety Concern</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">III. Severity Index (Preliminary)</label>
              <select name="severity" required className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-red-500/50 outline-none appearance-none font-bold text-white/80">
                <option value="mild" className="bg-[#02040a]">MILD — Subjective discomfort, no medical intervention.</option>
                <option value="moderate" className="bg-[#02040a]">MODERATE — Impairs daily activity, OTC treatment.</option>
                <option value="severe" className="bg-[#02040a]">SEVERE — Requires clinical intervention or hospitalization.</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">IV. Batch/Lot Authentication</label>
              <input name="batch_number" placeholder="e.g. Lot: 2024-X9-A" className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-red-500/50 outline-none font-mono text-white/80" />
            </div>
          </div>

          <div className="mb-12">
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">V. Detailed Technical Description</label>
            <textarea name="description" required className="w-full bg-white/5 border border-white/10 rounded-3xl px-8 py-8 text-sm focus:border-red-500/50 outline-none h-48 font-medium leading-relaxed text-white/80" placeholder="Provide a granular description of the incident, timelines, and outcomes..."></textarea>
          </div>

          <div className="mb-16">
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">VI. Reporter Authentication</label>
            <input type="email" name="reporter_email" required placeholder="Official/Personal Email for Follow-up" className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-red-500/50 outline-none font-bold text-white/80" />
          </div>

          <div className="p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 mb-16">
            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Protocol Disclaimer</h5>
            <p className="text-[10px] text-white/30 leading-relaxed font-medium italic">
                This intake is for institutional vigilance oversight and does not constitute a legal filing or clinical diagnosis. QualiCore acts as a transparency infrastructure provider. Data submitted will be shared with the target entity for remediation purposes as part of the trust framework.
            </p>
          </div>

          <button type="submit" disabled={loading} className="w-full py-6 bg-red-600 text-white font-black text-xl rounded-[2rem] hover:bg-red-500 transition-all shadow-2xl shadow-red-600/10 uppercase tracking-widest">
            {loading ? "TRANSMITTING SIGNAL..." : "AUTHORIZE VIGILANCE SUBMISSION"}
          </button>
        </form>

        <div className="mt-20 text-center">
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">QualiCore Vigilance Engine v2.1 — Sovereign Security Layer</p>
        </div>
      </div>
    </div>
  );
}
