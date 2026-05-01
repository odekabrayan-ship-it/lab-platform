import React, { useState, useEffect } from 'react';
import WorkspaceFrame from '../components/WorkspaceFrame';
import axios from 'axios';

const AdminAccreditation = () => {
    const tabs = [
        { id: 'dossiers', label: '🎓 Specialist Dossiers', icon: '🎓' },
        { id: 'competency', label: '🛡️ Competency Audit', icon: '🛡️' },
        { id: 'engagement', label: '💼 Engagement Pipeline', icon: '💼' }
    ];

    const renderContent = (activeTab) => {
        switch (activeTab) {
            case 'dossiers':
                return <SpecialistDossiers />;
            case 'competency':
                return <CompetencyAudit />;
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

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchExperts = async () => {
            try {
                const res = await axios.get('http://localhost:3000/api/admin/professionals/pending', { headers });
                setExperts(res.data.data);
            } catch (err) {
                console.error("Specialist fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchExperts();
    }, []);

    const handleApprove = async (proId) => {
        try {
            await axios.put(`http://localhost:3000/api/admin/professionals/${proId}/approve`, { status: 'approved', badge: 'Certified Specialist' }, { headers });
            alert("Expert Certified & Badged.");
            window.location.reload();
        } catch (err) {
            alert("Accreditation failed.");
        }
    };

    if (loading) return <div className="p-10 text-center text-white/20 italic">Scanning Specialist Dossiers...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold">Specialist Dossiers</h2>
                    <p className="text-sm text-slate-400">Management of certified expert credentials and professional lifecycles.</p>
                </div>
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded">Queue: {experts.length} Pending</div>
            </div>

            <div className="glass-panel p-0 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500">
                        <tr>
                            <th className="p-4">Certified Expert</th>
                            <th className="p-4">Specialization</th>
                            <th className="p-4">Accreditation status</th>
                            <th className="p-4 text-right">Sovereign Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {experts.map(expert => (
                            <tr key={expert.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-500/10 rounded-full flex items-center justify-center text-xs font-bold text-indigo-400">
                                        {expert.name ? expert.name.charAt(0) : 'P'}
                                    </div>
                                    <span className="font-bold">{expert.name || 'Pending Profile'}</span>
                                </td>
                                <td className="p-4 text-slate-400">{expert.specialization || 'N/A'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${expert.certification_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {expert.certification_status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleApprove(expert.id)} className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-500">Authorize & Badge 🛡️</button>
                                </td>
                            </tr>
                        ))}
                        {experts.length === 0 && <tr className="opacity-30"><td colSpan="4" className="p-10 text-center italic">No dossiers awaiting authority review.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const CompetencyAudit = () => {
    return (
        <div className="space-y-6">
            <div className="mb-8 text-center py-10 border-b border-white/5">
                <div className="text-4xl mb-4">🛡️</div>
                <h2 className="text-3xl font-black">Competency Audit Ledger</h2>
                <p className="text-sm text-slate-400">Permanent record of peer reviews, proficiency testing, and technical compliance.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-panel p-8">
                    <h3 className="text-lg font-bold mb-4">Recent Proficiency Reviews</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="p-4 bg-white/5 rounded-xl flex justify-between items-center border border-white/5">
                                <div>
                                    <div className="text-xs font-bold">Expert Review: Molecular Analysis</div>
                                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Status: COMPLIANT</div>
                                </div>
                                <div className="text-emerald-400 font-bold">98%</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="glass-panel p-8">
                    <h3 className="text-lg font-bold mb-4">ISO-17025 Compliance Radar</h3>
                    <div className="h-40 flex items-center justify-center italic text-slate-600 text-xs text-center leading-relaxed">
                        Visualizing compliance scores across <br/> the certified professional pool.
                    </div>
                </div>
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
