import React, { useState, useEffect } from 'react';
import WorkspaceFrame from '../components/WorkspaceFrame';
import axios from 'axios';

const AdminRegistry = () => {
    const tabs = [
        { id: 'brands', label: '🏷️ Brand Authority', icon: '🏷️' },
        { id: 'vigilance', label: '🚨 Vigilance Monitor', icon: '🚨' },
        { id: 'mediation', label: '⚖️ Mediation Hub', icon: '⚖️' },
        { id: 'public_mirror', label: '🌍 Public Mirror', icon: '🌍' }
    ];

    const renderContent = (activeTab) => {
        switch (activeTab) {
            case 'brands':
                return <BrandAuthority />;
            case 'vigilance':
                return <VigilanceMonitor />;
            case 'mediation':
                return <MediationHub />;
            case 'public_mirror':
                return <PublicMirror />;
            default:
                return <BrandAuthority />;
        }
    };

    return (
        <WorkspaceFrame 
            title="Consumer Trust Registry"
            subtitle="Sovereign Public Safety & Brand Integrity"
            tabs={tabs}
        >
            {(activeTab) => renderContent(activeTab)}
        </WorkspaceFrame>
    );
};

// --- SUB-COMPONENTS ---

const BrandAuthority = () => {
    const [companies, setCompanies] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const API_BASE = 'http://localhost:3000/api/admin/trust';
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [compRes, brandRes] = await Promise.all([
                    axios.get(`${API_BASE}/companies`, { headers }),
                    axios.get(`${API_BASE}/brands`, { headers })
                ]);
                setCompanies(compRes.data.data);
                setBrands(brandRes.data.data);
            } catch (err) {
                console.error("Registry fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="p-10 text-center text-white/20 italic">Synchronizing Registry Ledger...</div>;

    return (
        <div className="space-y-12">
            {/* COMPANIES SECTION */}
            <section>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold">Institutional Partners</h3>
                        <p className="text-xs text-slate-400">Verifying and auditing corporate trust dossiers.</p>
                    </div>
                    <button className="px-4 py-2 bg-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">➕ Add Company</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companies.map(c => (
                        <div key={c.id} className="glass-panel p-6 flex justify-between items-center group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 font-bold">{c.name.charAt(0)}</div>
                                <div>
                                    <h4 className="font-bold text-sm">{c.name}</h4>
                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">{c.industry} • {c.country}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${c.trust_status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {c.trust_status}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* BRANDS SECTION */}
            <section>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold">Verified Brand Registry</h3>
                        <p className="text-xs text-slate-400">Issuing and auditing QualiCore Trust Seals.</p>
                    </div>
                    <button className="px-4 py-2 bg-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">➕ Register Brand</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {brands.map(b => (
                        <div key={b.id} className="glass-panel p-6 flex flex-col items-center text-center group">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">🏷️</div>
                            <h4 className="font-bold text-base mb-1">{b.name}</h4>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">By {b.company_name}</p>
                            <div className="flex gap-2 mb-6">
                                <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded text-[9px] font-black uppercase">{b.trust_badge}</span>
                                <span className="px-2 py-1 bg-white/5 text-slate-400 rounded text-[9px] font-black uppercase">Seal Active</span>
                            </div>
                            <button className="w-full py-2 bg-white/5 border border-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Audit Brand</button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

const VigilanceMonitor = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await axios.get('http://localhost:3000/api/admin/vigilance/reports', { headers });
                setReports(res.data.data);
            } catch (err) {
                console.error("Vigilance fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    if (loading) return <div className="p-10 text-center text-white/20 italic">Scanning Adverse Signals...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-red-500">Vigilance Monitor</h2>
                    <p className="text-sm text-slate-400">Real-time tracking of adverse safety signals and consumer reports.</p>
                </div>
                <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-black animate-pulse">
                    🚨 {reports.length} ACTIVE SIGNALS
                </div>
            </div>

            <div className="space-y-6">
                {reports.map(report => (
                    <div key={report.id} className="glass-panel p-8 border-l-4 border-red-500 flex flex-col md:flex-row gap-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-[10px] font-black bg-red-500/10 text-red-500 px-2 py-0.5 rounded uppercase">{report.severity}</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Report #{report.id} • {report.symptom_type}</span>
                            </div>
                            <h3 className="text-xl font-bold mb-2">{report.brand_name}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed italic mb-6">"{report.description}"</p>
                            <div className="flex gap-6">
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Batch: <span className="text-white">{report.batch_number || 'N/A'}</span></div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Status: <span className="text-blue-400">{report.status}</span></div>
                            </div>
                        </div>
                        <div className="w-full md:w-80 flex flex-col gap-3 justify-center">
                            <button className="w-full py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl">Initiate Investigation</button>
                            <button className="w-full py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Issue Safety Alert</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PublicMirror = () => {
    const launchPublicPortal = () => {
        // Launches the root public-facing portal
        window.open('/', '_blank');
    };

    return (
        <div className="max-w-4xl mx-auto py-12 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8">🌍</div>
            <h2 className="text-3xl font-black mb-4">Public Discovery Mirror</h2>
            <p className="text-slate-400 mb-12">
                Initiate a 'Public Sentinel View' to audit the transparency layer. 
                Monitor how safety signals, verified brands, and trust seals are presented to the consumer pool.
            </p>

            <div className="glass-panel p-12 bg-gradient-to-br from-indigo-600/10 to-blue-600/10 border-indigo-500/20">
                <div className="mb-8">
                    <h4 className="text-lg font-bold mb-2">Public Portal Endpoint</h4>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Production Environment: ACTIVE</p>
                </div>
                
                <button 
                    onClick={launchPublicPortal}
                    className="px-12 py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] uppercase tracking-widest text-xs"
                >
                    Launch Public Mirror ↗
                </button>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Public Access</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono">200 OK</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Mirror Latency</div>
                    <div className="text-sm font-bold text-blue-400 font-mono">0.8ms</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Sentinel Mode</div>
                    <div className="text-sm font-bold text-indigo-400 font-mono text-[9px] uppercase">Super Admin Oversight</div>
                </div>
            </div>
        </div>
    );
};

export default AdminRegistry;
