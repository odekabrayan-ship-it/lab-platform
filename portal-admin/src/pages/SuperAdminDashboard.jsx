import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState({
        networkHealth: '99.9%',
        activeLabs: 0,
        activeClients: 0,
        totalRevenue: '$0',
        anomalies: 0
    });
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Mocking Super Admin Macro-Signals
                setStats({
                    networkHealth: '98.4%',
                    activeLabs: 142,
                    activeClients: 890,
                    totalRevenue: '$1.2M',
                    anomalies: 2
                });
                
                // Fetching PENDING Trust Applications
                const appRes = await API.get('/api/admin/verification-requests');
                setApplications(appRes.data.data || []);
            } catch (err) {
                console.error("Super Admin System Failure:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    return (
        <div className="min-h-screen bg-[#020617] text-white p-12">
            <div className="max-w-[1800px] mx-auto">
                
                {/* ── CEO HEADER ── */}
                <header className="flex justify-between items-end mb-20 animate-fade-in">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">
                            Super Admin • Sovereign Oversight Hub
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter">Network <span className="text-indigo-400">Command</span></h1>
                        <p className="text-slate-500 mt-2 font-medium max-w-xl leading-relaxed">
                            Global oversight of the QualiCore Trust Infrastructure. Monitor institutional health, authorize sovereign entities, and manage network revenue.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] text-right">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">System Uptime</div>
                            <div className="text-3xl font-black text-emerald-400 tracking-tighter">99.999%</div>
                        </div>
                    </div>
                </header>

                {/* ── MACRO SIGNALS ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
                    {[
                        { label: 'Network Vitality', val: stats.networkHealth, icon: '📡', color: 'indigo' },
                        { label: 'Authorized Labs', val: stats.activeLabs, icon: '🧪', color: 'blue' },
                        { label: 'Sovereign Revenue', val: stats.totalRevenue, icon: '💎', color: 'emerald' },
                        { label: 'Risk Anomalies', val: stats.anomalies, icon: '⚠️', color: 'red' }
                    ].map((s, i) => (
                        <div key={i} className="p-10 rounded-[3rem] glass-panel border-white/5 bg-white/[0.01] group hover:bg-white/[0.03] transition-all relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-${s.color}-500/5 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform`}></div>
                            <div className="text-4xl mb-6">{s.icon}</div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{s.label}</div>
                            <div className="text-5xl font-black tracking-tighter">{s.val}</div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    
                    {/* ── TRUST ACCELERATOR QUEUE ── */}
                    <div className="lg:col-span-2">
                        <div className="glass-panel rounded-[3rem] border-white/5 overflow-hidden">
                            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                                <h3 className="text-xl font-black tracking-tight">Sovereignty Authorization Queue</h3>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {applications.length} PENDING APPLICATIONS
                                </div>
                            </div>
                            <div className="p-10">
                                {applications.length === 0 ? (
                                    <div className="py-20 text-center opacity-30 italic">No pending institutional authorizations.</div>
                                ) : (
                                    <div className="space-y-6">
                                        {applications.map(app => (
                                            <div key={app.id} className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex justify-between items-center group">
                                                <div className="flex gap-8 items-center">
                                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl">🏛️</div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h4 className="text-xl font-bold">{app.company_name}</h4>
                                                            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase">
                                                                {app.tier}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-slate-500 font-medium">Applied {new Date(app.applied_at).toLocaleDateString()} • {app.industry_type}</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all">
                                                        Authorize
                                                    </button>
                                                    <button className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── REAL-TIME LEDGER FEED ── */}
                    <div className="space-y-8">
                        <div className="p-10 rounded-[3rem] bg-indigo-600/5 border border-indigo-600/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16"></div>
                            <h3 className="text-xl font-black mb-6">Network Intelligence</h3>
                            <div className="space-y-8">
                                {[
                                    { t: 'New Node Verified', d: 'Sovereign Diagnostics V2 joined the network.', time: '2m ago' },
                                    { t: 'High-Integrity Result', d: 'Pure Beverage Co. batch COA-9402 signed.', time: '14m ago' },
                                    { t: 'Anomaly Detected', d: 'TAT deviation in Global Labs #4 (Nairobi).', time: '1h ago', alert: true }
                                ].map((n, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className={`w-1.5 h-1.5 rounded-full mt-2 ${n.alert ? 'bg-red-500 animate-pulse' : 'bg-indigo-400'}`}></div>
                                        <div>
                                            <div className="text-sm font-bold tracking-tight">{n.t}</div>
                                            <div className="text-xs text-slate-500 mt-1 leading-relaxed">{n.d}</div>
                                            <div className="text-[9px] text-slate-600 font-black uppercase mt-2 tracking-widest">{n.time}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-8">Ecosystem Liquidity</h3>
                            <div className="space-y-6">
                                {[
                                    { l: 'Trust Accelerator', v: '$42,500', p: '+12%' },
                                    { l: 'Verification Fees', v: '$18,200', p: '+8%' },
                                    { l: 'Total MRR', v: '$60,700', p: '+10%' }
                                ].map((rev, i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <div>
                                            <div className="text-xs font-bold">{rev.l}</div>
                                            <div className="text-lg font-black mt-1">{rev.v}</div>
                                        </div>
                                        <div className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">{rev.p}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
