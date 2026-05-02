import React, { useState, useEffect } from 'react';
import WorkspaceFrame from '../components/WorkspaceFrame';
import axios from 'axios';

const AdminAccreditation = () => {
    const tabs = [
        { id: 'dossiers', label: '🎓 Specialist Dossiers', icon: '🎓' },
        { id: 'roster', label: '🛡️ Active Roster & Enforcement', icon: '🛡️' },
        { id: 'engagement', label: '💼 Engagement Pipeline', icon: '💼' }
    ];

    const renderContent = (activeTab) => {
        switch (activeTab) {
            case 'dossiers':
                return <SpecialistDossiers />;
            case 'roster':
                return <ActiveRoster />;
            case 'engagement':
                return <EngagementPipeline />;
            default:
                return <SpecialistDossiers />;
        }
    };

    return (
        <WorkspaceFrame 
            title="Professional Accreditation Authority"
            subtitle="Sovereign Expert Certification & Human Capital Oversight"
            tabs={tabs}
        >
            {(activeTab) => renderContent(activeTab)}
        </WorkspaceFrame>
    );
};

// --- SUB-COMPONENTS ---

const SpecialistDossiers = () => {
    const [experts, setExperts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [dossier, setDossier] = useState(null);
    const [dossierLoading, setDossierLoading] = useState(false);
    const [auditNotes, setAuditNotes] = useState('');
    const [selectedTier, setSelectedTier] = useState('TIER_I');

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchExperts = async () => {
            try {
                const res = await axios.get((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/professionals/pending`), { headers });
                setExperts(res.data.data || []);
            } catch (err) {
                console.error("Specialist fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchExperts();
    }, []);

    const loadDossier = async (id) => {
        setSelectedId(id);
        setDossierLoading(true);
        try {
            const res = await axios.get((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/professionals/${id}`), { headers });
            setDossier(res.data.data);
            setAuditNotes('');
        } catch (err) {
            alert("Failed to load professional dossier.");
            setSelectedId(null);
        } finally {
            setDossierLoading(false);
        }
    };

    const handleAction = async (status) => {
        if (!dossier) return;
        try {
            await axios.patch((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/professionals/${dossier.id}/verify`), { 
                status: status, 
                tier: selectedTier,
                notes: auditNotes || `Sovereign Action: ${status}`
            }, { headers });
            
            alert(`Dossier Action Executed: ${status}`);
            setDossier(null);
            setSelectedId(null);
            // Remove from local state
            setExperts(prev => prev.filter(e => e.id !== dossier.id));
        } catch (err) {
            alert("Accreditation action failed.");
        }
    };

    if (loading) return <div className="p-10 text-center text-white/20 italic">Scanning Specialist Dossiers...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* PENDING QUEUE */}
            <div className="lg:col-span-1 space-y-4">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold">Dossier Queue</h3>
                        <p className="text-xs text-slate-400">Awaiting forensic credential review.</p>
                    </div>
                    <div className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">{experts.length} Pending</div>
                </div>

                {experts.map(expert => (
                    <div 
                        key={expert.id} 
                        onClick={() => loadDossier(expert.id)}
                        className={`p-6 rounded-2xl border transition-all cursor-pointer ${selectedId === expert.id ? 'bg-indigo-600/10 border-indigo-500' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-indigo-500/10 rounded-full flex items-center justify-center text-xs font-bold text-indigo-400">
                                {expert.full_name ? expert.full_name.charAt(0) : 'P'}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">{expert.full_name || 'Pending Profile'}</h4>
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">{expert.specialty || 'UNSPECIFIED'}</div>
                            </div>
                        </div>
                    </div>
                ))}
                {experts.length === 0 && (
                    <div className="p-10 text-center bg-white/5 rounded-2xl border border-dashed border-white/10 opacity-50">
                        No dossiers awaiting review.
                    </div>
                )}
            </div>

            {/* SOVEREIGN REVIEW PANEL */}
            <div className="lg:col-span-2">
                {dossierLoading ? (
                    <div className="glass-panel p-20 flex justify-center items-center h-full text-indigo-400 italic">Decrypting Dossier...</div>
                ) : dossier ? (
                    <div className="glass-panel p-10 h-full border-t-4 border-indigo-500 animate-fade-in">
                        <header className="flex justify-between items-start mb-10">
                            <div>
                                <h2 className="text-3xl font-black">{dossier.full_name}</h2>
                                <p className="text-sm text-indigo-400 font-bold mt-1 tracking-widest uppercase">{dossier.specialty}</p>
                                <p className="text-xs text-slate-400 mt-1">Dossier ID: #{dossier.id} • Registered: {new Date(dossier.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                                PENDING REVIEW
                            </div>
                        </header>

                        {/* CREDENTIAL MATRIX */}
                        <div className="grid grid-cols-2 gap-6 mb-10">
                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Verified Certifications</h4>
                                {dossier.certifications?.length > 0 ? (
                                    <ul className="space-y-3">
                                        {dossier.certifications.map(c => (
                                            <li key={c.id} className="flex gap-3 items-start">
                                                <div className="text-lg">📜</div>
                                                <div>
                                                    <div className="text-xs font-bold text-white">{c.certification_name}</div>
                                                    <div className="text-[9px] text-slate-400">{c.issuing_body} ({c.year_issued})</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <div className="text-xs text-slate-500 italic">No certifications listed.</div>}
                            </div>
                            
                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Competency Matrix</h4>
                                {dossier.skills?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {dossier.skills.map(s => (
                                            <span key={s.id} className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold text-slate-300">
                                                {s.skill_name}
                                            </span>
                                        ))}
                                    </div>
                                ) : <div className="text-xs text-slate-500 italic">No specific skills listed.</div>}
                            </div>
                        </div>

                        {/* ACTION BAR */}
                        <div className="mb-8">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Forensic Audit Notes</label>
                            <textarea 
                                value={auditNotes}
                                onChange={(e) => setAuditNotes(e.target.value)}
                                placeholder="Enter credential review findings or specific exam requirements..."
                                className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-sm focus:border-indigo-500 outline-none h-24 resize-none"
                            />
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assign Expertise Tier:</label>
                            <select 
                                value={selectedTier} 
                                onChange={e => setSelectedTier(e.target.value)}
                                className="bg-slate-900 border border-white/10 text-white text-xs font-bold rounded-lg p-2 outline-none focus:border-indigo-500"
                            >
                                <option value="TIER_I">Tier I (Standard)</option>
                                <option value="TIER_II">Tier II (Advanced)</option>
                                <option value="TIER_III">Tier III (Master)</option>
                            </select>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => handleAction('VERIFIED')}
                                className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-500 transition-all uppercase tracking-widest text-xs"
                            >
                                Issue Sovereign Badge 🛡️
                            </button>
                            <button 
                                onClick={() => handleAction('PENDING')}
                                className="flex-1 py-4 bg-amber-600 text-white font-black rounded-xl hover:bg-amber-500 transition-all uppercase tracking-widest text-xs"
                            >
                                Request Exam 📝
                            </button>
                            <button 
                                onClick={() => handleAction('REJECTED')}
                                className="px-8 py-4 bg-red-600/10 text-red-500 font-black rounded-xl border border-red-500/20 hover:bg-red-600/20 transition-all uppercase tracking-widest text-xs"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="glass-panel p-20 flex flex-col items-center justify-center text-center opacity-30 h-full border-dashed">
                        <div className="text-6xl mb-6">🔍</div>
                        <h3 className="text-xl font-bold uppercase tracking-widest">No Dossier Selected</h3>
                        <p className="text-[10px] max-w-xs mx-auto mt-2 leading-relaxed">Select a professional from the queue to initiate a forensic credential review.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ActiveRoster = () => {
    const [professionals, setProfessionals] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchRoster = async () => {
        try {
            const res = await axios.get((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/professionals/active`), { headers });
            setProfessionals(res.data.data || []);
        } catch (err) {
            console.error("Roster fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoster();
    }, []);

    const executeSuspend = async (id, name) => {
        if (!window.confirm(`CRITICAL: Are you sure you want to suspend ${name}? They will immediately lose sign-off privileges.`)) return;
        try {
            await axios.patch((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/professionals/${id}/verify`), { status: 'REJECTED', notes: 'Suspended by Sovereign Authority' }, { headers });
            fetchRoster();
            alert(`${name} has been suspended.`);
        } catch (err) {
            alert("Suspension failed.");
        }
    };

    const executeReinstate = async (id, name) => {
        if (!window.confirm(`Reinstate ${name}'s credentials?`)) return;
        try {
            await axios.patch((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/professionals/${id}/verify`), { status: 'VERIFIED', notes: 'Reinstated by Sovereign Authority' }, { headers });
            fetchRoster();
            alert(`${name} has been reinstated.`);
        } catch (err) {
            alert("Reinstatement failed.");
        }
    };

    if (loading) return <div className="p-10 text-center text-white/20 italic">Loading Active Roster...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold">Active Roster & Enforcement</h2>
                    <p className="text-sm text-slate-400">Global ledger of certified professionals and the Sovereign Kill Switch.</p>
                </div>
                <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-black uppercase tracking-widest">
                    {professionals.filter(p => p.certification_status === 'approved').length} Active Badges
                </div>
            </div>

            <div className="glass-panel p-0 overflow-hidden border-t-4 border-indigo-500">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500">
                        <tr>
                            <th className="p-4">Certified Expert</th>
                            <th className="p-4">Specialization</th>
                            <th className="p-4">Expertise Tier</th>
                            <th className="p-4">Badge Status</th>
                            <th className="p-4 text-right">Enforcement Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {professionals.map(p => (
                            <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-4 font-bold">{p.full_name || 'Unnamed Professional'}</td>
                                <td className="p-4 text-slate-400">{p.specialty || 'General'}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded text-[9px] font-black uppercase tracking-widest">
                                        {p.specialty_tier || 'TIER_I'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${p.certification_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {p.certification_status === 'approved' ? 'ACTIVE' : 'SUSPENDED'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    {p.certification_status === 'approved' ? (
                                        <button 
                                            onClick={() => executeSuspend(p.id, p.full_name)}
                                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Suspend Badge 🛑
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => executeReinstate(p.id, p.full_name)}
                                            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Reinstate ↺
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {professionals.length === 0 && (
                            <tr><td colSpan="5" className="p-10 text-center opacity-30 italic">No professionals found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const EngagementPipeline = () => {
    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h2 className="text-2xl font-bold">Engagement Pipeline</h2>
                <p className="text-sm text-slate-400">Oversight of the professional marketplace and technical assignments.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { title: 'Project: Water Quality Audit', lab: 'Frontier Geochem', bids: 4, budget: '$2,500' },
                    { title: 'Project: Forensic Toxicology', lab: 'Apex Bio-Labs', bids: 2, budget: '$1,800' },
                    { title: 'Project: Soil Composition Study', lab: 'Continental Millers', bids: 12, budget: '$3,200' }
                ].map((job, i) => (
                    <div key={i} className="glass-panel p-6 border-t-2 border-indigo-500 hover:border-indigo-400 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded">MARKETPLACE_ACTIVE</span>
                            <span className="text-[10px] font-bold text-slate-500">{job.bids} Bids</span>
                        </div>
                        <h4 className="font-bold text-lg mb-1">{job.title}</h4>
                        <p className="text-xs text-slate-500 mb-6">Requested by {job.lab}</p>
                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                            <div className="text-xs font-bold">{job.budget}</div>
                            <button className="px-3 py-1 bg-white text-black text-[9px] font-black uppercase rounded">Audit Bids →</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminAccreditation;
