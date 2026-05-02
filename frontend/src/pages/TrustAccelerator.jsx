import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

const TierCard = ({ tier, title, price, features, selected, onClick, icon, color }) => (
    <div 
        onClick={onClick}
        className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 cursor-pointer relative overflow-hidden group ${
            selected 
            ? `border-${color}-500 bg-${color}-500/10 shadow-[0_0_40px_rgba(var(--${color}-rgb),0.2)] scale-[1.02]` 
            : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
        }`}
    >
        <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-500">{icon}</div>
        <div className="flex justify-between items-start mb-4">
            <h3 className={`text-2xl font-black tracking-tight ${selected ? `text-${color}-400` : 'text-white'}`}>{title}</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{tier}</span>
        </div>
        <div className="text-3xl font-black mb-6">{price}<span className="text-sm text-slate-500 font-medium ml-1">/ year</span></div>
        
        <ul className="space-y-4 mb-8">
            {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-xs font-medium text-slate-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${selected ? `bg-${color}-500` : 'bg-slate-700'}`}></span>
                    {f}
                </li>
            ))}
        </ul>

        <button className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
            selected 
            ? `bg-${color}-500 text-white shadow-lg shadow-${color}-500/20` 
            : 'bg-white/5 text-slate-400 group-hover:bg-white/10'
        }`}>
            {selected ? 'Tier Selected' : 'Select Acceleration Path'}
        </button>
    </div>
);

export default function TrustAccelerator() {
    const [step, setStep] = useState(1);
    const [selectedTier, setSelectedTier] = useState('BRONZE');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const tiers = [
        { 
            tier: 'LEVEL 1', 
            title: 'Verified Entity', 
            price: '$499', 
            icon: '🛡️', 
            color: 'indigo',
            features: ['Basic KYC Verification', 'Industrial Identity Audit', 'Public Registry Listing', 'Verified Safety Badge'] 
        },
        { 
            tier: 'LEVEL 2', 
            title: 'Certified Portfolio', 
            price: '$1,299', 
            icon: '🥈', 
            color: 'blue',
            features: ['Brand-to-Lab Mapping', 'Specific Method Validation', 'Consumer Health Grouping', 'Bi-Monthly Portfolio Audits'] 
        },
        { 
            tier: 'LEVEL 3', 
            title: 'Sovereign Trust', 
            price: '$2,999', 
            icon: '👑', 
            color: 'amber',
            features: ['Real-time LIMS Integration', 'Active Supply Chain Vigilance', 'Priority Registry Ranking', 'Unlimited Sovereign QR Seals'] 
        }
    ];

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await API.post("/api/verification/apply", { tier: selectedTier });
            setSuccess(true);
            setTimeout(() => setStep(3), 500);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-end mb-16 animate-fade-in">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">
                            Institutional Growth Engine
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter mb-4">The Path to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Sovereignty</span></h1>
                        <p className="text-slate-500 max-w-xl font-medium leading-relaxed">
                            Elevate your industrial integrity through our Level 1-3 Tiered Trust Model. Convert laboratory verification into a powerful market signal that builds absolute consumer loyalty.
                        </p>
                    </div>
                    <Link to="/company-dashboard" className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all mb-2">
                        ← Back to Command Center
                    </Link>
                </header>

                <div className="relative mb-20">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -translate-y-1/2"></div>
                    <div className="relative flex justify-between">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm transition-all duration-700 z-10 ${
                                step >= s ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)]' : 'bg-[#020617] text-slate-700 border border-white/5'
                            }`}>
                                {s}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <span>Select Path</span>
                        <span>Confirm Portfolio</span>
                        <span>Awaiting Verification</span>
                    </div>
                </div>

                {step === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-scale-up">
                        {tiers.map(t => (
                            <TierCard 
                                key={t.tier}
                                {...t}
                                selected={selectedTier === t.tier}
                                onClick={() => setSelectedTier(t.tier)}
                            />
                        ))}
                        <div className="md:col-span-3 flex justify-center mt-12">
                            <button 
                                onClick={() => setStep(2)}
                                className="px-12 py-5 rounded-2xl bg-white text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl"
                            >
                                Continue to Verification Details →
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-scale-up">
                        <div className="glass-panel p-10 border-white/5 bg-white/[0.02]">
                            <h2 className="text-3xl font-black mb-8">Verification Data</h2>
                            <div className="space-y-8">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Selected Acceleration Pathway</div>
                                    <div className="text-2xl font-black text-indigo-400">{selectedTier} STATUS</div>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Missing Requirements?</label>
                                        <Link to="/lab-marketplace" className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:underline">
                                            Hire Certified Lab →
                                        </Link>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between group cursor-pointer hover:bg-blue-500/10 transition-all">
                                        <div>
                                            <h4 className="text-sm font-bold text-blue-400">Staple Food Integrity Test</h4>
                                            <p className="text-[10px] text-slate-500 uppercase font-black mt-1">Required for Level 2 Sovereignty</p>
                                        </div>
                                        <span className="text-xs font-black text-blue-400">Browse Labs</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Upload Industrial Credentials</label>
                                    <div className="border-2 border-dashed border-white/5 rounded-3xl p-12 text-center hover:border-indigo-500/30 transition-colors cursor-pointer group">
                                        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📄</div>
                                        <p className="text-slate-400 text-sm font-medium">ISO/HACCP Certification PDF</p>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sovereign Investment</div>
                                        <div className="text-xl font-black text-white">{tiers.find(t => t.tier === selectedTier)?.price}/Year</div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">
                                        Your subscription includes automated institutional audits and real-time registry synchronization. Billed annually via the Sovereign Billing Engine.
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 group cursor-pointer hover:bg-white/10 transition-all">
                                    <input type="checkbox" id="billing_auth" className="w-5 h-5 rounded bg-slate-800 border-white/10 text-indigo-600 focus:ring-indigo-500" />
                                    <label htmlFor="billing_auth" className="text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer group-hover:text-white">
                                        Authorize Automated Institutional Billing
                                    </label>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => setStep(1)} className="flex-1 py-5 rounded-2xl bg-white/5 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                                        Back
                                    </button>
                                    <button 
                                        onClick={handleSubmit} 
                                        disabled={loading}
                                        className="flex-[2] py-5 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                                    >
                                        {loading ? 'Initializing Protocol...' : 'Authorize & Finalize'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── VERIFIED SHOWCASE SIMULATOR ── */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Live Showcase Simulator</h3>
                            </div>
                            
                            <div className="glass-panel p-12 border-white/5 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 rounded-[3rem] relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-20 text-xs font-black uppercase tracking-widest">Preview Mode</div>
                                
                                <div className="space-y-8">
                                    <div className="flex justify-between items-start">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-4xl">🥛</div>
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedTier === 'LEVEL 3' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
                                            {selectedTier === 'LEVEL 3' ? 'Sovereign Trust' : selectedTier === 'LEVEL 2' ? 'Certified' : 'Verified'}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-4xl font-black tracking-tighter mb-2">GlobalFresh Premium</h4>
                                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                            {selectedTier === 'LEVEL 3' 
                                                ? "LIMS-Synchronized Batch Integrity. Verified via the QualiCore Sovereign Network with real-time supply chain vigilance."
                                                : "Certified product lineage under continuous scientific oversight. Laboratory verification pending."}
                                        </p>
                                    </div>

                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center">
                                        <div>
                                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Health Trust Index</div>
                                            <div className="text-3xl font-black tracking-tighter">
                                                {selectedTier === 'LEVEL 3' ? '98.9' : selectedTier === 'LEVEL 2' ? '94.2' : '88.5'}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Network Status</div>
                                            <div className="text-[10px] font-black text-emerald-400 uppercase">ACTIVE MONITORING</div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-indigo-400">
                                        <span>Full Forensic Dossier</span>
                                        <span>Explore →</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 rounded-[2rem] bg-indigo-600/5 border border-indigo-600/10">
                                <h4 className="text-xs font-black text-indigo-400 mb-4 uppercase tracking-widest">Why Sovereignty Matters?</h4>
                                <ul className="space-y-4">
                                    {[
                                        'Increase consumer trust by up to 400%',
                                        'Access to premium shelf-space via retail partners',
                                        'Direct-to-consumer adverse signal reporting',
                                        'Real-time protection against supply chain fraud'
                                    ].map((t, i) => (
                                        <li key={i} className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                                            <span className="text-indigo-400">✦</span> {t}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="max-w-2xl mx-auto text-center animate-scale-up py-20">
                        <div className="w-24 h-24 bg-emerald-500 rounded-full mx-auto mb-10 flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                            ✓
                        </div>
                        <h2 className="text-5xl font-black tracking-tighter mb-6">Sovereignty Protocol Initiated.</h2>
                        <p className="text-slate-400 text-lg font-medium leading-relaxed mb-12">
                            Your application for <span className="text-indigo-400">{selectedTier} status</span> has been officially recorded in our institutional ledger. 
                            Our sovereign auditors will begin the forensic review immediately. You will receive an encrypted notification upon verification.
                        </p>
                        <div className="flex flex-col items-center gap-6">
                            <Link to="/brand-portfolio" state={{ fromAccelerator: true, tier: selectedTier }} className="px-12 py-5 rounded-2xl bg-white text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl">
                                Step 2: Build Brand Portfolio →
                            </Link>
                            <p className="text-[10px] text-slate-700 font-bold uppercase tracking-[0.4em]">
                                Estimated Review Time: 24 - 48 Hours
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
