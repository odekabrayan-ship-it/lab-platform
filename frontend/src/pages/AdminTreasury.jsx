import React, { useState, useEffect } from 'react';
import WorkspaceFrame from '../components/WorkspaceFrame';
import axios from 'axios';

const AdminTreasury = () => {
    const tabs = [
        { id: 'ledger', label: '💳 Subscription Ledger', icon: '💳' },
        { id: 'enforcement', label: '🛑 Sovereign Freeze Protocol', icon: '🛑' },
        { id: 'revenue', label: '📈 Macro Revenue', icon: '📈' }
    ];

    const renderContent = (activeTab) => {
        switch (activeTab) {
            case 'ledger':
                return <SubscriptionLedger />;
            case 'enforcement':
                return <EnforcementProtocol />;
            case 'revenue':
                return <MacroRevenue />;
            default:
                return <SubscriptionLedger />;
        }
    };

    return (
        <WorkspaceFrame 
            title="Treasury & Enforcement Command"
            subtitle="Sovereign Billing Oversight & Global Network Freezes"
            tabs={tabs}
        >
            {(activeTab) => renderContent(activeTab)}
        </WorkspaceFrame>
    );
};

// --- SUB-COMPONENTS ---

const SubscriptionLedger = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchSubscriptions = async () => {
            try {
                const res = await axios.get((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/subscriptions`), { headers });
                setSubscriptions(res.data.data || []);
            } catch (err) {
                console.error("Ledger sync failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSubscriptions();
    }, []);

    const handleUpdateStatus = async (type, id, newStatus) => {
        try {
            await axios.patch((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/subscriptions/${type}/${id}`), { 
                status: newStatus,
                tier: 'TRIAL', // Just to pass a valid field
                expiry: new Date(Date.now() + 30*24*60*60*1000).toISOString()
            }, { headers });
            
            // Optimistic UI update
            setSubscriptions(prev => prev.map(s => 
                (s.id === id && s.type === type) ? { ...s, subscription_status: newStatus } : s
            ));
            
        } catch (err) {
            alert("Failed to update subscription status.");
        }
    };

    if (loading) return <div className="p-10 text-center text-white/20 italic">Synchronizing Treasury Ledger...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold">Subscription Ledger</h2>
                    <p className="text-sm text-slate-400">Track billing health for all industrial partners and laboratories.</p>
                </div>
                <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-black uppercase tracking-widest">
                    {subscriptions.filter(s => s.subscription_status === 'ACTIVE').length} Active Subscriptions
                </div>
            </div>

            <div className="glass-panel p-0 overflow-hidden border-t-4 border-emerald-500">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500">
                        <tr>
                            <th className="p-4">Entity Identity</th>
                            <th className="p-4">Sovereign Role</th>
                            <th className="p-4">Current Tier</th>
                            <th className="p-4">Billing Status</th>
                            <th className="p-4 text-right">Ledger Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {subscriptions.map((sub, i) => (
                            <tr key={`${sub.type}-${sub.id}`} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-4 font-bold">{sub.company_name || `Entity #${sub.id}`}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${sub.type === 'lab' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                        {sub.type === 'lab' ? 'Laboratory' : 'Industrial Client'}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-400 font-bold">{sub.subscription_tier || 'UNASSIGNED'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest 
                                        ${sub.subscription_status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 
                                          sub.subscription_status === 'ARREARS' ? 'bg-amber-500/10 text-amber-400' : 
                                          sub.subscription_status === 'REVOKED' ? 'bg-red-500/10 text-red-400' : 'bg-slate-500/10 text-slate-400'}`}>
                                        {sub.subscription_status || 'PENDING'}
                                    </span>
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    {sub.subscription_status !== 'ACTIVE' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(sub.type, sub.id, 'ACTIVE')}
                                            className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded text-[9px] font-black uppercase transition-all"
                                        >
                                            Mark Paid
                                        </button>
                                    )}
                                    {sub.subscription_status === 'ACTIVE' && (
                                        <button 
                                            onClick={() => handleUpdateStatus(sub.type, sub.id, 'ARREARS')}
                                            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-white rounded text-[9px] font-black uppercase transition-all"
                                        >
                                            Flag Arrears
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {subscriptions.length === 0 && (
                            <tr><td colSpan="5" className="p-10 text-center opacity-30 italic">No ecosystem subscriptions found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const EnforcementProtocol = () => {
    const [entities, setEntities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reason, setReason] = useState('');
    const [targetEntity, setTargetEntity] = useState(null);

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchLedger = async () => {
        try {
            const res = await axios.get((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/subscriptions`), { headers });
            setEntities(res.data.data || []);
        } catch (err) {
            console.error("Entity fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLedger();
    }, []);

    const executeFreeze = async (e) => {
        e.preventDefault();
        if (!targetEntity) return;

        if (!window.confirm(`CRITICAL: Are you sure you want to FREEZE ${targetEntity.company_name}? This will instantly revoke their access across the entire QualiCore platform.`)) return;

        try {
            await axios.post((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/treasury/freeze/${targetEntity.type}/${targetEntity.id}`), { reason }, { headers });
            alert(`Sovereign Freeze Executed for ${targetEntity.company_name}.`);
            setTargetEntity(null);
            setReason('');
            fetchLedger();
        } catch (err) {
            alert("Freeze protocol failed.");
        }
    };

    const executeReinstate = async (type, id, name) => {
        if (!window.confirm(`Reinstate ${name} to the network?`)) return;
        try {
            await axios.post((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/treasury/reinstate/${type}/${id}`), {}, { headers });
            alert(`${name} has been reinstated.`);
            fetchLedger();
        } catch (err) {
            alert("Reinstatement failed.");
        }
    };

    if (loading) return <div className="p-10 text-center text-white/20 italic">Loading enforcement targets...</div>;

    const frozenEntities = entities.filter(e => e.subscription_status === 'REVOKED' || e.verification_status === 'SUSPENDED');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* KILL SWITCH CONSOLE */}
            <div className="glass-panel p-10 border-t-4 border-red-500 bg-red-500/5">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-3xl animate-pulse">🛑</div>
                    <div>
                        <h3 className="text-2xl font-black text-red-500">Sovereign Freeze Console</h3>
                        <p className="text-xs text-red-400/80 mt-1 uppercase tracking-widest font-black">Global Kill Switch Protocol</p>
                    </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed font-medium mb-8">
                    Select an entity from the ledger to instantly revoke all network access, invalidate public seals, and freeze their operational cockpits.
                </p>

                <form onSubmit={executeFreeze} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Target Entity</label>
                        <select 
                            required
                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-red-500 text-sm"
                            onChange={(e) => {
                                const [type, id] = e.target.value.split(':');
                                setTargetEntity(entities.find(en => en.type === type && en.id.toString() === id));
                            }}
                            value={targetEntity ? `${targetEntity.type}:${targetEntity.id}` : ''}
                        >
                            <option value="" disabled>-- Select Entity to Freeze --</option>
                            {entities.filter(e => e.subscription_status !== 'REVOKED').map(en => (
                                <option key={`${en.type}-${en.id}`} value={`${en.type}:${en.id}`}>
                                    {en.type.toUpperCase()} | {en.company_name} (Tier: {en.subscription_tier || 'None'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Reason for Revocation</label>
                        <textarea 
                            required
                            placeholder="e.g. Non-payment, ISO-17025 Compliance Failure, Fraud..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-red-500 text-sm h-32 resize-none"
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={!targetEntity}
                        className="w-full py-5 bg-red-600 text-white font-black rounded-xl hover:bg-red-500 transition-all disabled:opacity-30 uppercase tracking-[0.3em] text-xs shadow-[0_0_30px_rgba(220,38,38,0.3)]"
                    >
                        Execute Global Freeze ⚡
                    </button>
                </form>
            </div>

            {/* FROZEN ENTITIES LIST */}
            <div className="space-y-6">
                <h3 className="text-xl font-bold mb-6">Frozen Entities</h3>
                {frozenEntities.length === 0 ? (
                    <div className="glass-panel p-12 text-center opacity-30 italic border-dashed border-white/10">
                        No entities currently frozen.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {frozenEntities.map(en => (
                            <div key={`${en.type}-${en.id}`} className="p-6 rounded-2xl bg-black border border-red-500/30 flex justify-between items-center group">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                        <h4 className="font-bold text-white">{en.company_name}</h4>
                                    </div>
                                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Status: {en.subscription_status}</p>
                                </div>
                                <button 
                                    onClick={() => executeReinstate(en.type, en.id, en.company_name)}
                                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-300 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                                >
                                    Reinstate ↺
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const MacroRevenue = () => {
    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h2 className="text-2xl font-bold">Macro Revenue</h2>
                <p className="text-sm text-slate-400">Total sovereign liquidity and financial pulse.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="glass-panel p-8 text-center bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Total Monthly Recurring</div>
                    <div className="text-5xl font-black text-white">$142k</div>
                </div>
                <div className="glass-panel p-8 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Active Institutions</div>
                    <div className="text-5xl font-black text-white">412</div>
                </div>
                <div className="glass-panel p-8 text-center bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
                    <div className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2">Capital in Arrears</div>
                    <div className="text-5xl font-black text-white">$12k</div>
                </div>
            </div>

            <div className="glass-panel p-20 flex items-center justify-center border-dashed border-white/10">
                <p className="text-slate-500 italic text-sm">Revenue forecasting and chart visualizations synchronizing...</p>
            </div>
        </div>
    );
};

export default AdminTreasury;
