import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function ConsumerHub() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const [signals, setSignals] = useState([]);
    const [stats, setStats] = useState({ verified: 0, brands: 0, alerts: 0 });

    useEffect(() => {
        // Mocking consumer-specific health intelligence
        setStats({ verified: 152, brands: 420, alerts: 3 });
        setSignals([
            { id: 1, brand: 'DailyFresh Milk', status: 'VERIFIED', date: '2026-04-30', score: 98 },
            { id: 2, brand: 'PureAqua', status: 'INVESTIGATING', date: '2026-04-29', score: 45 },
            { id: 3, brand: 'BioMed Aspirin', status: 'VERIFIED', date: '2026-04-28', score: 99 }
        ]);
    }, []);

    return (
        <div className="min-h-screen bg-[#020617] text-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-16 animate-fade-in">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
                            Health Guardian Profile
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter">Welcome, <span className="text-indigo-400">{user.email.split('@')[0]}</span>.</h1>
                        <p className="text-slate-500 mt-2 font-medium">Your personal health oversight dashboard.</p>
                    </div>
                    <div className="flex gap-4">
                        <a href="http://localhost:3001" target="_blank" rel="noreferrer" className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                            Open Trust Registry →
                        </a>
                        <button className="px-6 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20">
                            Report Adverse Signal 🚨
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 animate-scale-up">
                    <div className="glass-panel p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                        <div className="text-4xl mb-4">🛡️</div>
                        <div className="text-3xl font-black tracking-tighter mb-1">{stats.verified}</div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Verified Entities</div>
                    </div>
                    <div className="glass-panel p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                        <div className="text-4xl mb-4">✅</div>
                        <div className="text-3xl font-black tracking-tighter mb-1">{stats.brands}</div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trusted Brands</div>
                    </div>
                    <div className="glass-panel p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                        <div className="text-4xl mb-4">🚨</div>
                        <div className="text-3xl font-black tracking-tighter mb-1 text-red-500">{stats.alerts}</div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Critical Alerts</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="glass-panel p-8">
                            <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                                <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                                Your Monitored Brands
                            </h3>
                            <div className="space-y-4">
                                {signals.map(s => (
                                    <div key={s.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:bg-white/[0.04] transition-all group">
                                        <div className="flex items-center gap-6">
                                            <div className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">
                                                {s.brand.includes('Milk') ? '🥛' : s.brand.includes('Aqua') ? '💧' : '💊'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg">{s.brand}</div>
                                                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Verified: {s.date}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-sm font-black uppercase tracking-tighter mb-1 ${s.status === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                                                {s.status}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-600">Integrity Score: {s.score}%</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="glass-panel p-8 border-t-4 border-indigo-500">
                            <h3 className="text-sm font-black uppercase tracking-widest mb-6">Expert Health Tips</h3>
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                    <h4 className="text-xs font-bold text-indigo-400 mb-2">Check the Trust Seal 🛡️</h4>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">Always look for the QualiCore QR code on packaging to verify batch integrity in real-time.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                    <h4 className="text-xs font-bold text-indigo-400 mb-2">Report Anomalies 🚨</h4>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">Your signals help us identify supply chain risks before they become widespread health issues.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-fuchsia-700 relative overflow-hidden group cursor-pointer">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                            <h3 className="text-xl font-black mb-2">Elite Registry</h3>
                            <p className="text-xs text-white/70 leading-relaxed mb-6">Access the full industrial matrix of certified manufacturers and labs.</p>
                            <button className="px-6 py-3 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                                Browse Matrix
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
