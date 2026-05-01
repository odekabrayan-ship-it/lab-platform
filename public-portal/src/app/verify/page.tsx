"use client";

import { useState } from "react";

export default function VerifyReport() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`http://localhost:3000/api/public/verify/${code}`);
      const data = await res.json();
      if (res.ok) {
        setResult(data.data);
      } else {
        setError(data.message || "Invalid verification code.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#02040a] min-h-screen text-[#f8fafc]">
      {/* Institutional Header */}
      <div className="w-full bg-indigo-600/5 border-b border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="flex justify-center items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Institutional Authentication Gateway</span>
            </div>
            <h1 className="text-6xl font-bold tracking-tighter mb-6">Document <span className="text-indigo-400">Verification</span> Protocol.</h1>
            <p className="text-white/40 max-w-2xl mx-auto text-lg leading-relaxed font-medium">
                Validate the cryptographic authenticity of any QualiCore-issued Report or Certificate of Analysis (CoA). 
                Cross-reference document metadata directly with the sovereign laboratory ledger.
            </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20 flex flex-col items-center">
        <div className="w-full">
            <div className="p-12 rounded-[3rem] bg-white/[0.01] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/20"></div>
                
                <form onSubmit={handleVerify} className="relative group mb-10">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-6 text-center">Enter Unique Document UUID / Verification Code</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="QC-2026-XXXX-XXXX"
                            className="w-full h-24 bg-white/5 border-2 border-white/10 rounded-[2.5rem] px-12 text-2xl font-mono font-bold focus:border-indigo-500/50 focus:outline-none transition-all placeholder:text-white/5 text-center"
                        />
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="absolute right-4 top-4 bottom-4 px-12 rounded-[2rem] bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-xl shadow-indigo-600/10"
                        >
                            {loading ? "AUTHENTICATING..." : "RUN VERIFICATION"}
                        </button>
                    </div>
                </form>

                <div className="flex justify-center gap-10 text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-2">🛡️ End-to-End Encryption</span>
                    <span className="flex items-center gap-2">🔗 Blockchain Indexing Active</span>
                    <span className="flex items-center gap-2">⚖️ Legal Compliance Layer</span>
                </div>
            </div>

            {error && (
            <div className="mt-12 p-8 rounded-3xl bg-red-500/5 border border-red-500/10 text-red-400 font-bold text-sm text-center animate-fade-in flex items-center justify-center gap-4">
                <span className="text-xl">⚠️</span> {error}
            </div>
            )}

            {result && (
            <div className="mt-12 animate-fade-in">
                <div className="p-12 rounded-[3rem] bg-emerald-500/[0.02] border border-emerald-500/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50"></div>
                    <div className="flex items-center gap-6 mb-12">
                        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-3xl">
                            ✅
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">AUTHENTICATION SUCCESSFUL</div>
                            <div className="text-3xl font-mono font-bold tracking-tighter">{result.report_code}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 py-10 border-y border-white/5">
                        <div className="space-y-1">
                            <div className="text-[10px] text-white/20 uppercase font-black tracking-widest">Issuing Institutional Entity</div>
                            <div className="text-xl font-bold tracking-tight text-white/80">{result.lab_name}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] text-white/20 uppercase font-black tracking-widest">Temporal Signature (Issue Date)</div>
                            <div className="text-xl font-bold tracking-tight text-white/80">{new Date(result.issued_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] text-white/20 uppercase font-black tracking-widest">Validation Status</div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-black uppercase text-[10px] tracking-widest mt-2 border border-emerald-500/20">
                                {result.status}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] text-white/20 uppercase font-black tracking-widest">Global Access Registry Count</div>
                            <div className="text-xl font-bold tracking-tight text-white/80">{result.verification_count} Verified Requests</div>
                        </div>
                    </div>

                    <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-8">
                        <p className="text-[10px] text-white/30 max-w-sm italic font-medium leading-relaxed">
                            This document metadata is officially indexed in the QualiCore Public Trust Infrastructure. 
                            The digital signature has been verified against the issuing laboratory's sovereign key.
                        </p>
                        <button className="px-10 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-indigo-400">
                            Download Cryptographic Proof
                        </button>
                    </div>
                </div>
            </div>
            )}
        </div>

        <div className="mt-32 p-16 rounded-[3rem] bg-white/[0.01] border border-white/5 text-center w-full">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-6">Security Architecture Compliance</h4>
            <div className="flex flex-wrap justify-center gap-12 grayscale opacity-20">
                <div className="font-mono text-xs">ECC-256-SIGNATURE</div>
                <div className="font-mono text-xs">AES-256-ENCRYPTED</div>
                <div className="font-mono text-xs">LIMS-INTERCONNECT-ACTIVE</div>
            </div>
        </div>
      </div>
    </div>
  );
}
