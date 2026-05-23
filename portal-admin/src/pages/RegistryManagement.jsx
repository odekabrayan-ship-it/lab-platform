import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const RegistryManagement = () => {
    const [searchParams] = useSearchParams();
    const [companies, setCompanies] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || 'companies');
    const [vigilanceReports, setVigilanceReports] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [currentEntity, setCurrentEntity] = useState(null);

    const API_BASE = (`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/trust`);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [compRes, brandRes, vigilanceRes] = await Promise.all([
                axios.get(`${API_BASE}/companies`, { headers }),
                axios.get(`${API_BASE}/brands`, { headers }),
                axios.get((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/vigilance/reports`), { headers })
            ]);
            setCompanies(compRes.data.data);
            setBrands(brandRes.data.data);
            setVigilanceReports(vigilanceRes.data.data);
        } catch (err) {
            console.error("Failed to fetch registry data", err);
        }
        setLoading(false);
    };

    const handleSaveCompany = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            if (currentEntity?.id) {
                await axios.put(`${API_BASE}/companies/${currentEntity.id}`, data, { headers });
            } else {
                await axios.post(`${API_BASE}/companies`, data, { headers });
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            alert("Error saving company");
        }
    };

    const handleSaveBrand = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            if (currentEntity?.id) {
                await axios.put(`${API_BASE}/brands/${currentEntity.id}`, data, { headers });
            } else {
                await axios.post(`${API_BASE}/brands`, data, { headers });
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            alert("Error saving brand");
        }
    };

    const deleteEntity = async (type, id) => {
        if (!window.confirm("Are you sure? This will remove the entity from the public registry.")) return;
        try {
            await axios.delete(`${API_BASE}/${type}/${id}`, { headers });
            fetchData();
        } catch (err) {
            alert("Error deleting entity");
        }
    };

    if (loading) {
        return <div className="p-8 bg-[#0a0a0f] min-h-screen text-white/20 italic text-center py-20">Loading registry data...</div>;
    }

    return (
        <div className="p-8 bg-[#0a0a0f] min-h-screen text-white font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-end mb-12">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight mb-2">Registry Management</h1>
                        <p className="text-white/40 text-sm">Control the public trust layer: Companies, Brands, and Visibility.</p>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => { setCurrentEntity(null); setShowModal(true); }}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm transition-all"
                        >
                            + New {activeTab === 'companies' ? 'Company' : 'Brand'}
                        </button>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex gap-8 border-b border-white/5 mb-10">
                    {['companies', 'brands', 'vigilance'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/30 hover:text-white'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {activeTab === 'companies' ? (
                        companies.map(c => (
                            <div key={c.id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex justify-between items-center group hover:border-indigo-500/30 transition-all">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-indigo-400 font-bold">
                                        {c.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{c.name}</h3>
                                        <p className="text-xs text-white/30 uppercase tracking-widest font-bold">{c.industry} • {c.country}</p>
                                        <p className="text-[9px] text-white/20 mt-1 uppercase font-bold tracking-tighter">Expires: {new Date(c.trust_expiry).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                        c.trust_status === 'VERIFIED' ? 'bg-green-500/10 text-green-400' : 
                                        c.trust_status === 'AWAITING_UPDATE' ? 'bg-amber-500/10 text-amber-400' :
                                        'bg-red-500/10 text-red-400'
                                    }`}>
                                        {c.trust_status}
                                    </span>
                                    
                                    {(c.trust_status === 'EXPIRED' || c.trust_status === 'AWAITING_UPDATE') && (
                                        <button 
                                            onClick={async () => {
                                                await axios.post(`${API_BASE}/companies/${c.id}/recertify`, {}, { headers });
                                                fetchData();
                                            }}
                                            className="px-3 py-1 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-500 transition-all"
                                        >
                                            Recertify
                                        </button>
                                    )}

                                    <button onClick={() => { setCurrentEntity(c); setShowModal(true); }} className="p-2 hover:text-indigo-400 transition-colors">Edit</button>
                                    <button onClick={() => deleteEntity('companies', c.id)} className="p-2 hover:text-red-400 transition-colors">Delete</button>
                                </div>
                            </div>
                        ))
                    ) : activeTab === 'brands' ? (
                        brands.map(b => (
                            <div key={b.id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex justify-between items-center group hover:border-indigo-500/30 transition-all">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-indigo-400 font-bold italic">
                                        {b.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{b.name}</h3>
                                        <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Owned by {b.company_name}</p>
                                        <p className="text-[9px] text-indigo-400/40 mt-1 uppercase font-bold tracking-tighter">Confidence Signals: {b.trust_count?.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${b.trust_badge === 'PREMIUM' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-white/40'}`}>
                                        {b.trust_badge}
                                    </span>
                                    <button onClick={() => { setCurrentEntity(b); setShowModal(true); }} className="p-2 hover:text-indigo-400 transition-colors">Edit</button>
                                    <button 
                                        onClick={() => {
                                            const code = `<script src="${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/scripts/quali-seal.js" data-brand-id="${b.id}" data-theme="dark"></script>`;
                                            navigator.clipboard.writeText(code);
                                            alert("Embed Code Copied to Clipboard!\n\nGive this to the brand to place on their website.");
                                        }}
                                        className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
                                    >
                                        Get Seal Code
                                    </button>
                                    <button onClick={() => deleteEntity('brands', b.id)} className="p-2 hover:text-red-400 transition-colors">Delete</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="space-y-6">
                            {vigilanceReports.map(report => (
                                <div key={report.id} className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 border-l-4 border-l-red-500/50">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-black uppercase rounded">Adverse Signal</span>
                                                <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Report #{report.id} • {new Date(report.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <h3 className="text-xl font-bold">{report.brand_name} <span className="text-white/30 text-sm font-normal">({report.company_name})</span></h3>
                                        </div>
                                        <select 
                                            defaultValue={report.status}
                                            onChange={async (e) => {
                                                await axios.put((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/vigilance/reports/${report.id}`), { status: e.target.value, brand_response: report.brand_response }, { headers });
                                                fetchData();
                                            }}
                                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-indigo-500"
                                        >
                                            <option value="PENDING">Pending Review</option>
                                            <option value="INVESTIGATING">Investigating</option>
                                            <option value="RESOLVED">Resolved</option>
                                            <option value="DISMISSED">Dismissed</option>
                                        </select>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                                        <div className="p-4 bg-white/5 rounded-2xl">
                                            <label className="block text-[9px] font-bold text-white/20 uppercase mb-1">Issue Type</label>
                                            <div className="text-sm font-bold text-red-400">{report.symptom_type}</div>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl">
                                            <label className="block text-[9px] font-bold text-white/20 uppercase mb-1">Severity</label>
                                            <div className="text-sm font-bold uppercase">{report.severity}</div>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl">
                                            <label className="block text-[9px] font-bold text-white/20 uppercase mb-1">Batch Number</label>
                                            <div className="text-sm font-mono text-white/60">{report.batch_number || 'N/A'}</div>
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <label className="block text-[10px] font-bold text-white/20 uppercase mb-2">Description</label>
                                        <p className="text-sm text-white/60 leading-relaxed italic">"{report.description}"</p>
                                    </div>

                                    <div className="pt-8 border-t border-white/5">
                                        <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-4 tracking-widest">Official Brand / Admin Response</label>
                                        <textarea 
                                            defaultValue={report.brand_response}
                                            placeholder="Enter the official response or investigation outcome..."
                                            onBlur={async (e) => {
                                                await axios.put((`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/vigilance/reports/${report.id}`), { status: report.status, brand_response: e.target.value }, { headers });
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:border-indigo-500/50 outline-none h-24"
                                        />
                                    </div>
                                </div>
                            ))}
                            {vigilanceReports.length === 0 && <div className="py-20 text-center text-white/20 italic">No vigilance signals in queue.</div>}
                        </div>
                    )}
                </div>

                {/* MODAL */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
                        <div className="w-full max-w-2xl bg-[#111118] border border-white/10 rounded-3xl p-10 overflow-y-auto max-h-[90vh]">
                            <h2 className="text-2xl font-bold mb-8">Manage {activeTab === 'companies' ? 'Company' : 'Brand'}</h2>
                            <form onSubmit={activeTab === 'companies' ? handleSaveCompany : handleSaveBrand} className="space-y-6">
                                {activeTab === 'companies' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Company Name</label>
                                                <input name="name" defaultValue={currentEntity?.name} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Industry</label>
                                                <input name="industry" defaultValue={currentEntity?.industry} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none" required />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Country</label>
                                                <input name="country" defaultValue={currentEntity?.country} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Consumer Health Group</label>
                                                <select name="consumer_group" defaultValue={currentEntity?.consumer_group || 'STAPLES'} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none">
                                                    <option value="PHARMACY">PHARMACY - Pharmacies & Pharma</option>
                                                    <option value="DRINKING_WATER">DRINKING_WATER - Drinking Waters</option>
                                                    <option value="BEVERAGES">BEVERAGES - Soft Drinks & Beverages</option>
                                                    <option value="STAPLES">STAPLES - Edible Food & Staples</option>
                                                    <option value="DAIRY">DAIRY - Dairy Products</option>
                                                    <option value="RETAIL">RETAIL - Certified Retailers</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Trust Expiry Date</label>
                                            <input type="date" name="trust_expiry" defaultValue={currentEntity?.trust_expiry ? currentEntity.trust_expiry.split('T')[0] : ''} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none" required />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Profile Summary</label>
                                            <textarea name="profile_summary" defaultValue={currentEntity?.profile_summary} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none h-24" />
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Compliance Claims</label>
                                                <input name="compliance_claims" defaultValue={currentEntity?.compliance_claims} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Quality Practices</label>
                                                <input name="quality_practices" defaultValue={currentEntity?.quality_practices} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Company ID</label>
                                            <select name="company_id" defaultValue={currentEntity?.company_id} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none">
                                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Brand Name</label>
                                            <input name="name" defaultValue={currentEntity?.name} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none" required />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Category</label>
                                                <input name="category" defaultValue={currentEntity?.category} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Trust Badge</label>
                                                <select name="trust_badge" defaultValue={currentEntity?.trust_badge || 'STANDARD'} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none">
                                                    <option value="STANDARD">Standard</option>
                                                    <option value="FEATURED">Featured</option>
                                                    <option value="PREMIUM">Premium</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Description</label>
                                            <textarea name="brand_description" defaultValue={currentEntity?.brand_description} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none h-24" />
                                        </div>
                                    </>
                                )}
                                <div className="flex gap-4 pt-6">
                                    <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 transition-all">Save Changes</button>
                                    <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-all text-white/50">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegistryManagement;
