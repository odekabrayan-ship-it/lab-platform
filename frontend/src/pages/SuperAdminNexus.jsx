import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SuperAdminNexus = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        activeLabs: 42,
        pendingAccreditations: 8,
        activeVigilanceSignals: 3,
        networkThroughput: '128k Samples'
    });

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        // Fetch high-level sentinel data
        const fetchSentinelData = async () => {
            try {
                const res = await axios.get((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/ecosystem-stats`), { headers });
                // Mapping real data if available
            } catch (err) {
                console.error("Sentinel sync failed");
            }
        };
        fetchSentinelData();
    }, []);

    const systems = [
        {
            id: 'directory',
            title: 'QualiCore Directory',
            subtitle: 'Institutional Infrastructure Hub',
            description: 'Manage the global registry of laboratories and industrial partners. Authorize institutional activations and monitor technical network throughput.',
            icon: '🏢',
            color: 'blue',
            path: '/admin/directory',
            kpi: `${stats.activeLabs} Active Nodes`
        },
        {
            id: 'trust',
            title: 'Consumer Trust Registry',
            subtitle: 'Public Vigilance & Brand Integrity',
            description: 'Govern the transparency layer. Manage verified brand registries, monitor public safety signals, and issue QualiCore Trust Seals.',
            icon: '🛡️',
            color: 'emerald',
            path: '/admin/registry',
            kpi: `${stats.activeVigilanceSignals} Safety Alerts`
        },
        {
            id: 'accreditation',
            title: 'Accreditation Authority',
            subtitle: 'Professional Human Capital Hub',
            description: 'The definitive authority for expert certification. Audit specialist dossiers, manage competency pipelines, and badge professional excellence.',
            icon: '🎓',
            color: 'indigo',
            path: '/admin/accreditation',
            kpi: `${stats.pendingAccreditations} Dossiers Pending`
        },
        {
            id: 'treasury',
            title: 'Treasury & Enforcement',
            subtitle: 'Sovereign Billing & Protocol Revocation',
            description: 'Total command over ecosystem liquidity. Track subscriptions, manage payment arrears, and execute global Sovereign Freezes.',
            icon: '💎',
            color: 'red',
            path: '/admin/treasury',
            kpi: `Ecosystem Liquidity`
        }
    ];

    const launchSystem = (path) => {
        window.open(path, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-10 font-sans">
            {/* AMBIENT BACKGROUND */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="relative z-10 w-full max-w-7xl">
                {/* HERO SECTION */}
                <header className="text-center mb-20 animate-fade-in">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Sovereign Control Nexus</span>
                    </div>
                    <h1 className="text-7xl font-black tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
                        QualiCore <span className="text-blue-500">Authority</span>
                    </h1>
                    <p className="text-xl text-white/40 max-w-2xl mx-auto leading-relaxed">
                        The centralized gateway to the QualiCore Laboratory Ecosystem. 
                        Select a sovereign system to initiate specialized administrative oversight.
                    </p>
                </header>

                {/* THE QUAD GATES */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {systems.map((system, idx) => (
                        <div 
                            key={system.id}
                            onClick={() => launchSystem(system.path)}
                            className={`group relative p-[1px] rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent hover:from-white/20 transition-all duration-700 cursor-pointer ${system.glow} hover:scale-[1.02] active:scale-[0.98] animate-slide-up`}
                            style={{ animationDelay: `${idx * 150}ms` }}
                        >
                            <div className="relative h-full bg-[#020617] rounded-[2.5rem] p-10 overflow-hidden flex flex-col">
                                {/* SYSTEM ICON BACKGROUND */}
                                <div className="absolute top-[-10%] right-[-10%] text-9xl opacity-[0.03] grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000">
                                    {system.icon}
                                </div>

                                <div className="mb-10">
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${system.color} flex items-center justify-center text-3xl shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                                        {system.icon}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">{system.subtitle}</div>
                                    <h3 className="text-3xl font-black mb-4 group-hover:translate-x-2 transition-transform duration-500">{system.title}</h3>
                                    <p className="text-sm text-white/40 leading-relaxed mb-8">
                                        {system.description}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                                    <div className="flex-1 h-[2px] bg-white/5 overflow-hidden">
                                        <div className="h-full w-0 group-hover:w-full bg-blue-500 transition-all duration-1000"></div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white transition-colors">
                                        Initialize System →
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* FOOTER INTELLIGENCE */}
                <footer className="mt-24 flex flex-col md:flex-row items-center justify-between gap-10 opacity-30 hover:opacity-100 transition-opacity duration-1000">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Network Latency</span>
                            <span className="text-lg font-black text-emerald-400">14ms <span className="text-[10px] text-white/20 font-bold ml-1">OPTIMIZED</span></span>
                        </div>
                        <div className="w-[1px] h-8 bg-white/10"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Active Nodes</span>
                            <span className="text-lg font-black">2,841 <span className="text-[10px] text-white/20 font-bold ml-1">ENCRYPTED</span></span>
                        </div>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
                        Institutional Authority Level: SUPER ADMIN
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default SuperAdminNexus;
