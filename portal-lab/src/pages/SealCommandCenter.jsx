import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function SealCommandCenter() {
    const [seals, setSeals] = useState([]);
    const [activeTab, setActiveTab] = useState('inventory');

    useEffect(() => {
        // Mocking verified seal inventory
        setSeals([
            { id: 'QS-4902', brand: 'GlobalFresh Premium', type: 'LEVEL 3 - SOVEREIGN', status: 'ACTIVE', batches: 142, scans: '12.4k' },
            { id: 'QS-8812', brand: 'AquaPure Elite', type: 'LEVEL 2 - CERTIFIED', status: 'ACTIVE', batches: 89, scans: '4.2k' },
            { id: 'QS-1023', brand: 'BioMed Daily', type: 'LEVEL 1 - VERIFIED', status: 'UNDER_REVIEW', batches: 0, scans: '0' }
        ]);
    }, []);

    return (
        <div className="min-h-screen bg-[#020617] text-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-16 animate-fade-in">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-6">
                            Verified Institutional Control
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter">Vigilance <span className="text-emerald-400">Seal</span> Command</h1>
                        <p className="text-slate-500 mt-2 font-medium">Generate, manage, and monitor your dynamic sovereignty seals.</p>
                    </div>
                    <div className="flex gap-4">
                        <button className="px-8 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20">
                            Generate New Seal 🧬
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-16">
                    {[
                        { label: 'Active Seals', val: '12', icon: '🛡️' },
                        { label: 'Total Scans', val: '186.2k', icon: '📡' },
                        { label: 'Batch Integrity', val: '99.4%', icon: '⚖️' },
                        { label: 'Trust Alerts', val: '0', icon: '✅' }
                    ].map((s, i) => (
                        <div key={i} className="glass-panel p-8 border-white/5 bg-white/[0.02]">
                            <div className="text-2xl mb-4">{s.icon}</div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.label}</div>
                            <div className="text-3xl font-black">{s.val}</div>
                        </div>
                    ))}
                </div>

                <div className="glass-panel overflow-hidden border-white/5">
                    <div className="flex border-b border-white/5 bg-white/[0.02]">
                        {['inventory', 'analytics', 'security'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === tab ? 'text-emerald-400 border-b-2 border-emerald-400 bg-white/[0.03]' : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="p-8">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                    <th className="pb-6 px-4">Seal Identity</th>
                                    <th className="pb-6 px-4">Brand Asset</th>
                                    <th className="pb-6 px-4">Trust Tier</th>
                                    <th className="pb-6 px-4">Status</th>
                                    <th className="pb-6 px-4">Performance</th>
                                    <th className="pb-6 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {seals.map(seal => (
                                    <tr key={seal.id} className="group hover:bg-white/[0.01] transition-colors">
                                        <td className="py-6 px-4">
                                            <div className="font-mono text-xs text-emerald-400">{seal.id}</div>
                                            <div className="text-[9px] text-slate-600 font-bold uppercase mt-1">UUID-V4 ENCRYPTED</div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="font-bold text-sm">{seal.brand}</div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className={`text-[9px] font-black uppercase px-2 py-1 rounded inline-block ${
                                                seal.type.includes('LEVEL 3') ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-400'
                                            }`}>
                                                {seal.type}
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${seal.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                                                <span className="text-[10px] font-bold uppercase">{seal.status}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="text-xs font-bold">{seal.scans} Scans</div>
                                            <div className="text-[9px] text-slate-600 uppercase font-black">{seal.batches} Batches Verified</div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                                                Download Assets
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-10 rounded-[3rem] bg-gradient-to-br from-emerald-600 to-teal-800 relative overflow-hidden group cursor-pointer">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                        <h3 className="text-2xl font-black mb-2">QR Synthesis</h3>
                        <p className="text-sm text-white/70 leading-relaxed mb-8">Generate high-fidelity vector assets for your physical packaging. Guaranteed batch-traceability.</p>
                        <button className="px-8 py-4 bg-white text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
                            Launch Generator
                        </button>
                    </div>
                    <div className="p-10 rounded-[3rem] bg-slate-900 border border-white/5 relative overflow-hidden group cursor-pointer">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                        <h3 className="text-2xl font-black mb-2">Vigilance Analytics</h3>
                        <p className="text-sm text-slate-500 leading-relaxed mb-8">Track consumer interactions and scan locations in real-time across the global market.</p>
                        <button className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                            Open Analytics Hub
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
