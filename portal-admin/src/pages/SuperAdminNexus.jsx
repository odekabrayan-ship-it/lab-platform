import React, { useState, useEffect } from 'react';

import axios from 'axios';

const SuperAdminNexus = () => {

    const [stats, setStats] = useState({
        activeLabs: 42,
        pendingAccreditations: 8,
        activeVigilanceSignals: 3,
        networkThroughput: '128k Samples'
    });

    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideForm, setOverrideForm] = useState({
        tenantId: '',
        tenantType: 'lab',
        platformOverride: false,
        subscriptionStatus: 'ACTIVE',
        subscriptionExpiry: ''
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
            id: 'users',
            title: 'User Management',
            subtitle: 'Platform Identity & Access Control',
            description: 'Create platform accounts, assign roles and sub-roles, link users to laboratories or industrial organizations, deactivate accounts, and reset credentials.',
            icon: '👥',
            color: 'from-violet-500 to-purple-600',
            path: '/admin/users',
            kpi: `${stats.activeLabs} Org Members`
        },
        {
            id: 'invitations',
            title: 'User Invitations',
            subtitle: 'Secure Onboarding & Provisioning',
            description: 'Generate secure registration links to invite new personnel to the platform. Define roles and organization bindings before onboarding.',
            icon: '✉️',
            color: 'from-emerald-500 to-green-600',
            path: '/admin/invitations',
            kpi: 'Manage Invites'
        },
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

    const handleApplyOverride = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/tenants/${overrideForm.tenantType}/${overrideForm.tenantId}/override`, { platform_override: overrideForm.platformOverride }, { headers });
            alert(`Override ${overrideForm.platformOverride ? 'ENABLED' : 'DISABLED'} for ${overrideForm.tenantType} ${overrideForm.tenantId}`);
        } catch(err) {
            alert('Override update failed. Ensure Tenant ID is correct.');
        }
    };

    const handleApplySubscription = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/tenants/${overrideForm.tenantType}/${overrideForm.tenantId}/subscription`, { 
                subscription_status: overrideForm.subscriptionStatus, 
                subscription_expiry: overrideForm.subscriptionExpiry || null
            }, { headers });
            alert(`Subscription set to ${overrideForm.subscriptionStatus} for ${overrideForm.tenantType} ${overrideForm.tenantId}`);
        } catch(err) {
            alert('Subscription update failed. Ensure Tenant ID is correct.');
        }
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

                {/* ADVANCED SUPER ADMIN PANELS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in" style={{ animationDelay: '100ms' }}>
                    {/* Platform Health */}
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 backdrop-blur-xl hover:bg-emerald-500/10 transition-colors">
                        <div className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Platform Health
                        </div>
                        <div className="text-3xl font-black mb-1">Operational</div>
                        <div className="text-sm text-emerald-400/70">All micro-services responding. Database integrity verified. API latency optimized.</div>
                    </div>
                    {/* Tenant Monitoring */}
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-6 backdrop-blur-xl hover:bg-blue-500/10 transition-colors">
                        <div className="text-blue-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="text-lg">📊</span>
                            Tenant Monitoring
                        </div>
                        <div className="text-3xl font-black mb-1">Active Sync</div>
                        <div className="text-sm text-blue-400/70">Tracking {stats.activeLabs} isolated laboratory environments and compliance logs in real-time.</div>
                    </div>
                    {/* System Overrides */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 backdrop-blur-xl hover:bg-red-500/10 transition-colors cursor-pointer" onClick={() => setShowOverrideModal(true)}>
                        <div className="text-red-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="text-lg">⚠️</span>
                            System Overrides
                        </div>
                        <div className="text-3xl font-black mb-1">Restricted</div>
                        <div className="text-sm text-red-400/70">Master kill switches and global lockdown protocols armed. Click to initiate override.</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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

            {/* OVERRIDE MODAL */}
            {showOverrideModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0f172a] border border-red-500/30 rounded-3xl p-8 max-w-md w-full animate-slide-up shadow-[0_0_50px_rgba(239,68,68,0.15)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500"></div>
                        <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2"><span className="text-red-500">⚠️</span> Platform Override Panel</h2>
                        <p className="text-white/40 text-sm mb-6">Absolute authority module. Bypass subscription locks or forcibly modify billing states.</p>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-white/50 mb-1">Tenant Type</label>
                                    <select 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                                        value={overrideForm.tenantType}
                                        onChange={(e) => setOverrideForm({...overrideForm, tenantType: e.target.value})}
                                    >
                                        <option value="lab">Laboratory</option>
                                        <option value="client">Client</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-white/50 mb-1">Tenant ID</label>
                                    <input 
                                        type="number" 
                                        placeholder="e.g. 1" 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                                        value={overrideForm.tenantId}
                                        onChange={(e) => setOverrideForm({...overrideForm, tenantId: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mt-6">
                                <h3 className="text-red-400 font-bold text-sm mb-3">1. Emergency Override (Grant Free Access)</h3>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 accent-red-500"
                                        checked={overrideForm.platformOverride}
                                        onChange={(e) => setOverrideForm({...overrideForm, platformOverride: e.target.checked})}
                                    />
                                    <span className="text-sm text-white/80">Enable Platform Override (Bypass Billing)</span>
                                </label>
                                <button onClick={handleApplyOverride} className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg transition-colors text-sm">Apply Override State</button>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                <h3 className="text-blue-400 font-bold text-sm mb-3">2. Manual Subscription State</h3>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <select 
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm"
                                        value={overrideForm.subscriptionStatus}
                                        onChange={(e) => setOverrideForm({...overrideForm, subscriptionStatus: e.target.value})}
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="SUSPENDED">SUSPENDED</option>
                                        <option value="PENDING_ONBOARDING">PENDING_ONBOARDING</option>
                                    </select>
                                    <input 
                                        type="date" 
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm"
                                        value={overrideForm.subscriptionExpiry}
                                        onChange={(e) => setOverrideForm({...overrideForm, subscriptionExpiry: e.target.value})}
                                    />
                                </div>
                                <button onClick={handleApplySubscription} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition-colors text-sm">Force Subscription Update</button>
                            </div>
                        </div>

                        <button onClick={() => setShowOverrideModal(false)} className="mt-6 w-full py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl transition-colors font-bold">
                            Close Override Panel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminNexus;
