import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TrustHome() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleVerify = (e) => {
    e.preventDefault();
    if (code.trim()) navigate(`/verify/${code.trim()}`);
  };

  return (
    <div className="min-h-screen bg-[#020617] relative flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_30%,_rgba(16,185,129,0.06)_0%,_transparent_50%)] pointer-events-none"></div>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-emerald-500/5 blur-[200px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-2xl relative z-10 text-center">
        <div className="w-24 h-24 bg-emerald-600 rounded-3xl mx-auto mb-10 flex items-center justify-center text-5xl shadow-[0_20px_60px_rgba(16,185,129,0.3)] rotate-3 hover:rotate-0 transition-transform duration-500">
          <span className="font-black text-white">✓</span>
        </div>

        <h1 className="text-5xl font-black tracking-tighter mb-4 text-white">
          QualiCore <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Trust Portal</span>
        </h1>
        <p className="text-slate-400 text-lg mb-16 max-w-lg mx-auto leading-relaxed">
          Independent verification of laboratory certifications, test reports, and quality seals
        </p>

        <form onSubmit={handleVerify} className="mb-12">
          <div className="flex gap-4 max-w-lg mx-auto">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter verification code..."
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white text-sm focus:border-emerald-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-600"
            />
            <button type="submit" className="px-8 py-5 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-500 transition-all shadow-[0_10px_30px_-5px_rgba(16,185,129,0.4)]">
              Verify
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
          <a href="/report" className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-emerald-500/30 transition-all group text-left">
            <div className="text-2xl mb-3">📄</div>
            <div className="text-sm font-black text-white mb-1">Report Verification</div>
            <div className="text-xs text-slate-500">Validate test report authenticity</div>
          </a>
          <a href="/verify/demo" className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-emerald-500/30 transition-all group text-left">
            <div className="text-2xl mb-3">🛡️</div>
            <div className="text-sm font-black text-white mb-1">Seal Verification</div>
            <div className="text-xs text-slate-500">Confirm quality seal integrity</div>
          </a>
        </div>

        <div className="mt-20 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          Powered by QualiCore Sovereign Network
        </div>
      </div>
    </div>
  );
}
