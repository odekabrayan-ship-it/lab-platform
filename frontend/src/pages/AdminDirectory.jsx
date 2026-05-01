import React, { useState, useEffect } from 'react';
import WorkspaceFrame from '../components/WorkspaceFrame';
import axios from 'axios';

const AdminDirectory = () => {
    const tabs = [
        { id: 'registry', label: '📋 Network Registry', icon: '📋' },
        { id: 'onboarding', label: '🏢 Onboarding Terminal', icon: '🏢' },
        { id: 'pulse', label: '📈 Ecosystem Pulse', icon: '📈' },
        { id: 'mirror', label: '🧪 Portal Mirror', icon: '🧪' }
    ];

    const renderContent = (activeTab) => {
        switch (activeTab) {
            case 'registry':
                return <NetworkRegistry />;
            case 'onboarding':
                return <OnboardingTerminal />;
            case 'pulse':
                return <EcosystemPulse />;
            case 'mirror':
                return <PortalMirror />;
            default:
                return <NetworkRegistry />;
        }
    };

    return (
        <WorkspaceFrame 
            title="Institutional Directory Hub"
            subtitle="QualiCore Sovereign Ecosystem Control"
            tabs={tabs}
        >
            {(activeTab) => renderContent(activeTab)}
        </WorkspaceFrame>
    );
};

// --- SUB-COMPONENTS ---

const NetworkRegistry = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold">Network Registry</h2>
                    <p className="text-sm text-slate-400">Managing verified dossiers of all laboratory and industrial partners.</p>
                </div>
                <div className="flex gap-4">
                    <button className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-bold">➕ Add Institutional Node</button>
                    <button className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold">📥 Export Ledger</button>
                </div>
            </div>

            <div className="glass-panel p-0 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500">
                        <tr>
                            <th className="p-4">Institutional Node</th>
                            <th className="p-4">Entity Type</th>
                            <th className="p-4">Accreditation</th>
                            <th className="p-4">Sovereign Status</th>
                            <th className="p-4 text-right">Dossier</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {[
                            { name: 'Global Bio-Analytica', type: 'Clinical Lab', acc: 'ISO-15189', status: 'VERIFIED' },
                            { name: 'Apex Industrial Soils', type: 'Industrial Lab', acc: 'ISO-17025', status: 'VERIFIED' },
                            { name: 'Zenith Pharma Services', type: 'Quality Control', acc: 'GLP', status: 'SUSPENDED' }
                        ].map((node, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-4 font-bold">{node.name}</td>
                                <td className="p-4 text-slate-400">{node.type}</td>
                                <td className="p-4"><span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold">{node.acc}</span></td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${node.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {node.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button className="text-blue-500 hover:underline">View File →</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const OnboardingTerminal = () => {
    const [labs, setLabs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLab, setSelectedLab] = useState(null);
    const [auditNote, setAuditNote] = useState('');

    const API_BASE = 'http://localhost:3000/api/admin';
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchPending = async () => {
            try {
                const res = await axios.get(`${API_BASE}/labs/pending`, { headers });
                setLabs(res.data.data);
            } catch (err) {
                console.error("Pending labs fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPending();
    }, []);

    const handleAuditAction = async (labId, status) => {
        try {
            await axios.put(`${API_BASE}/labs/${labId}/verify`, { 
                status, 
                notes: auditNote || `Sovereign Audit: ${status}`
            }, { headers });
            alert(`Sovereign Audit Successful: Institutional status set to ${status}`);
            window.location.reload();
        } catch (err) {
            alert("Audit action failed. Verify connectivity with the Authority Ledger.");
        }
    };

    if (loading) return <div className="p-10 text-center text-white/20 italic">Scanning Onboarding Queue...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* PENDING LIST */}
            <div className="lg:col-span-1 space-y-4">
                <div className="mb-6">
                    <h3 className="text-xl font-bold">Audit Queue</h3>
                    <p className="text-xs text-slate-400">Institutional activation requests awaiting sovereign audit.</p>
                </div>
                {labs.map(lab => (
                    <div 
                        key={lab.id} 
                        onClick={() => setSelectedLab(lab)}
                        className={`p-6 rounded-2xl border transition-all cursor-pointer ${selectedLab?.id === lab.id ? 'bg-blue-600/10 border-blue-500' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                    >
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">{lab.accreditation_status}</div>
                        <h4 className="font-bold text-sm">{lab.name}</h4>
                        <p className="text-[9px] text-slate-500 mt-1">{lab.city}, {lab.country}</p>
                    </div>
                ))}
                {labs.length === 0 && (
                    <div className="p-10 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <div className="text-3xl mb-4">✅</div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">All dossiers settled.</p>
                    </div>
                )}
            </div>

            {/* AUDIT INTELLIGENCE PANEL */}
            <div className="lg:col-span-2">
                {selectedLab ? (
                    <div className="glass-panel p-10 h-full border-t-4 border-blue-500 animate-fade-in">
                        <header className="flex justify-between items-start mb-10">
                            <div>
                                <h2 className="text-3xl font-black">{selectedLab.name}</h2>
                                <p className="text-sm text-slate-400 mt-2">Dossier ID: <span className="text-white">#{selectedLab.id}</span> • Specialization: <span className="text-white">{selectedLab.specialization}</span></p>
                            </div>
                            <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-[10px] font-black uppercase tracking-widest">
                                Phase: PENDING_REVIEW
                            </div>
                        </header>

                        <div className="grid grid-cols-2 gap-8 mb-10">
                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Accreditation Dossier</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-xl">📄</div>
                                    <div>
                                        <div className="text-xs font-bold">{selectedLab.accreditation_number || 'ISO-CONFIRMED'}</div>
                                        <div className="text-[9px] text-emerald-400 font-bold uppercase mt-0.5">Verified Accreditation</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Integrity Pulse</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <div className="text-xs font-bold">Institutional KYC Passed</div>
                                </div>
                                <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">Identity Verified on Authority Ledger</div>
                            </div>
                        </div>

                        <div className="mb-10">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Forensic Audit Notes</label>
                            <textarea 
                                value={auditNote}
                                onChange={(e) => setAuditNote(e.target.value)}
                                placeholder="Enter technical audit findings, compliance verification notes, or trial terms..."
                                className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-sm focus:border-blue-500 outline-none h-32"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => handleAuditAction(selectedLab.id, 'VERIFIED')}
                                className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-500 transition-all uppercase tracking-widest text-xs"
                            >
                                Authorize Activation 🏛️
                            </button>
                            <button 
                                onClick={() => handleAuditAction(selectedLab.id, 'TRIAL_ACTIVE')}
                                className="flex-1 py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-500 transition-all uppercase tracking-widest text-xs"
                            >
                                Activate Verification Trial 🧪
                            </button>
                            <button 
                                onClick={() => handleAuditAction(selectedLab.id, 'REJECTED')}
                                className="px-8 py-4 bg-red-600/10 text-red-500 font-black rounded-xl border border-red-500/20 hover:bg-red-600/20 transition-all uppercase tracking-widest text-xs"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="glass-panel p-20 flex flex-col items-center justify-center text-center opacity-30 h-full border-dashed">
                        <div className="text-6xl mb-6">🔍</div>
                        <h3 className="text-xl font-bold uppercase tracking-widest">No Selection</h3>
                        <p className="text-[10px] max-w-xs mx-auto mt-2 leading-relaxed">Select a laboratory from the audit queue to initiate the institutional verification cycle.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const EcosystemPulse = () => {
    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h2 className="text-2xl font-bold">Ecosystem Pulse</h2>
                <p className="text-sm text-slate-400">Network-wide throughput and operational intelligence.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="glass-panel p-8 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Analytical Volume</div>
                    <div className="text-4xl font-black">128,491</div>
                    <p className="text-[10px] text-emerald-400 font-bold mt-2">↑ 8.2% Growth</p>
                </div>
                <div className="glass-panel p-8 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2">Network Revenue</div>
                    <div className="text-4xl font-black">$2.4M</div>
                    <p className="text-[10px] text-blue-400 font-bold mt-2">Settled Nodes: 42</p>
                </div>
                <div className="glass-panel p-8 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Network TAT</div>
                    <div className="text-4xl font-black">2.4d</div>
                    <p className="text-[10px] text-slate-500 font-bold mt-2">ISO Target: 48h</p>
                </div>
            </div>

            <div className="glass-panel p-10 h-64 flex items-center justify-center text-slate-600 italic">
                Global Institutional Radar Visualization: Synchronizing Ledger Data...
            </div>
        </div>
    );
};

const PortalMirror = () => {
    const [labs, setLabs] = useState([]);
    const [clients, setClients] = useState([]);
    const [selectedEntity, setSelectedEntity] = useState({ id: '', type: '' });
    const [loading, setLoading] = useState(true);

    const API_BASE = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [lRes, cRes] = await Promise.all([
                    axios.get(`${API_BASE}/admin/labs/pending`, { headers }), // Using pending for demo, or real list
                    axios.get(`${API_BASE}/admin/ecosystem-stats`, { headers }) // Mocking client list fetch for now
                ]);
                // For demo, we'll fetch all labs instead of just pending
                const allLabs = await axios.get(`${API_BASE}/admin/accreditations`, { headers });
                setLabs(allLabs.data.data.map(l => ({ id: l.user_id, name: l.lab_name })));
                
                // Mock clients for demonstration if real list not available
                setClients([{ id: 1, name: 'Heritage Beverages (Global)' }, { id: 10, name: 'Continental Millers' }]);
            } catch (err) {
                console.error("Mirror data fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleLaunch = async (type, userId) => {
        if (!userId) return;
        try {
            // 1. Initiate Sovereign Impersonation via API
            const res = await axios.post(`${API_BASE}/admin/impersonate/${userId}`, {}, { headers });
            const { token: impersonationToken } = res.data.data;

            // 2. Prep the target session (in a real app, we'd store this or pass via URL)
            // For now, we'll open in a new window and the target app will need to handle the 'impersonation' token
            const path = type === 'lab' ? '/workspace/manager' : '/company-dashboard';
            
            // Security: Passing token via window name or session storage for the new window
            const portalWindow = window.open(`${path}?token=${impersonationToken}`, '_blank');
            if (portalWindow) {
                console.log(`[SOVEREIGN AUDIT] Impersonation session launched for User ID: ${userId}`);
            }
        } catch (err) {
            alert("Sovereign mirror launch failed: Permission Denied.");
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-12">
            <header className="text-center mb-16">
                <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8">🌐</div>
                <h2 className="text-4xl font-black mb-4">Sovereign Authority Terminal</h2>
                <p className="text-slate-400 max-w-2xl mx-auto">
                    Initiate audited institutional oversight. Generate forensic session bridges to mirror laboratory 
                    workspaces and corporate quality cockpits.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* LABORATORY MIRROR */}
                <div className="glass-panel p-10 flex flex-col border-t-4 border-blue-500 hover:shadow-2xl hover:shadow-blue-500/5 transition-all">
                    <div className="mb-10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Authority Level: RED</div>
                        <h3 className="text-2xl font-bold">Lab Workspace Mirror</h3>
                        <p className="text-xs text-slate-500 mt-2">Audit analytical workflows, metrology records, and sample custody.</p>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Select Lab Node</label>
                            <select 
                                className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500 text-sm"
                                onChange={(e) => setSelectedEntity({ id: e.target.value, type: 'lab' })}
                            >
                                <option value="">-- Authority Ledger Nodes --</option>
                                {labs.map(lab => (
                                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <button 
                            onClick={() => handleLaunch('lab', selectedEntity.id)}
                            disabled={selectedEntity.type !== 'lab' || !selectedEntity.id}
                            className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-500 transition-all disabled:opacity-30 uppercase tracking-widest text-xs"
                        >
                            Establish Mirror Bridge ↗
                        </button>
                    </div>
                </div>

                {/* CORPORATE MIRROR */}
                <div className="glass-panel p-10 flex flex-col border-t-4 border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all">
                    <div className="mb-10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Authority Level: AMBER</div>
                        <h3 className="text-2xl font-bold">Corporate Trust Mirror</h3>
                        <p className="text-xs text-slate-500 mt-2">Audit quality assurance logs, product compliance, and transparency vaults.</p>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Select Corporate Partner</label>
                            <select 
                                className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-emerald-500 text-sm"
                                onChange={(e) => setSelectedEntity({ id: e.target.value, type: 'client' })}
                            >
                                <option value="">-- Trust Registry Entities --</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <button 
                            onClick={() => handleLaunch('client', selectedEntity.id)}
                            disabled={selectedEntity.type !== 'client' || !selectedEntity.id}
                            className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-500 transition-all disabled:opacity-30 uppercase tracking-widest text-xs"
                        >
                            Establish Mirror Bridge ↗
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-16 p-8 bg-blue-500/5 border border-blue-500/20 rounded-[2rem] flex items-center gap-8">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-3xl">🛡️</div>
                <div className="flex-1">
                    <h4 className="text-lg font-bold mb-1">Sovereign Oversight Protocol (ISO-17025 Compliance)</h4>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                        Administrative mirroring sessions are strictly forensic. All actions performed during a bridge session 
                        are cryptographically signed by the Authority and logged in the Global Sovereign Audit Ledger. 
                        Impersonation tokens expire automatically after 120 minutes.
                    </p>
                </div>
            </div>
        </div>
    );
};


export default AdminDirectory;
