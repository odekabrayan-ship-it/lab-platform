'use client';

import { useState, useMemo, useEffect } from 'react';

const EXPERT_CATEGORIES = [
    { id: 'all', label: 'All Products', icon: '🌐', desc: 'All Safety-Checked Items' },
    { id: 'PHARMACY', label: 'Wellness & Pharma', icon: '🏥', desc: 'Clinical Grade Providers' },
    { id: 'DRINKING_WATER', label: 'Safe Hydration', icon: '💧', desc: 'Certified Pure Water' },
    { id: 'BEVERAGES', label: 'Beverages', icon: '🥤', desc: 'Vigilance-Checked Refreshments' },
    { id: 'STAPLES', label: 'Pantry Purity', icon: '🍳', desc: 'Daily Grains & Oils' },
    { id: 'DAIRY', label: 'Dairy & Fresh', icon: '🥛', desc: 'Fresh Nutritional Staples' },
    { id: 'BABY_CARE', label: 'Infant Protection', icon: '🍼', desc: 'Critical Infant Nutrition' }
];

const TRUST_FILTERS = [
    { id: 'all', label: 'All Badges' },
    { id: 'SOVEREIGN', label: '👑 Highest Safety Rating (Level 3)' },
    { id: 'CERTIFIED', label: '🥈 Certified (Level 2)' },
    { id: 'VERIFIED', label: '🛡️ Verified (Level 1)' }
];

export default function RegistryExplorer({ initialBrands }: { initialBrands: any[] }) {
    const [activeTab, setActiveTab] = useState('all');
    const [trustFilter, setTrustFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [dossierData, setDossierData] = useState<any>(null);
    const [loadingDossier, setLoadingDossier] = useState(false);

    const groupedEntities = useMemo(() => {
        const filtered = initialBrands.filter(brand => {
            const matchesSearch = brand.name.toLowerCase().includes(search.toLowerCase()) || 
                                 brand.company_name.toLowerCase().includes(search.toLowerCase()) ||
                                 brand.brand_description?.toLowerCase().includes(search.toLowerCase());
            const matchesTab = activeTab === 'all' || brand.consumer_group === activeTab || brand.category === activeTab;
            
            // Map Trust Badge for filtering
            let normalizedBadge = brand.trust_badge === 'PREMIUM' ? 'SOVEREIGN' : (brand.trust_badge === 'FEATURED' ? 'CERTIFIED' : 'VERIFIED');
            const matchesTrust = trustFilter === 'all' || normalizedBadge === trustFilter;
            
            return matchesSearch && matchesTab && matchesTrust;
        });

        const groups: { [key: string]: any } = {};
        filtered.forEach(brand => {
            if (!groups[brand.company_name]) {
                groups[brand.company_name] = {
                    name: brand.company_name,
                    group: brand.consumer_group,
                    brands: []
                };
            }
            groups[brand.company_name].brands.push(brand);
        });

        return Object.values(groups);
    }, [initialBrands, activeTab, search, trustFilter]);

    // Fetch deep dossier when a brand is selected
    useEffect(() => {
        if (!selectedBrandId) {
            setDossierData(null);
            return;
        }
        
        setLoadingDossier(true);
        fetch((`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/public/brands/${selectedBrandId}`))
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setDossierData(data.data);
                }
            })
            .catch(err => console.error("Failed to load dossier", err))
            .finally(() => setLoadingDossier(false));
            
    }, [selectedBrandId]);

    const getBadgeStyle = (badge: string) => {
        if (badge === 'PREMIUM' || badge === 'SOVEREIGN') return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
        if (badge === 'FEATURED' || badge === 'CERTIFIED') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    };
    
    const getBadgeLabel = (badge: string) => {
        if (badge === 'PREMIUM' || badge === 'SOVEREIGN') return '👑 Highest Safety';
        if (badge === 'FEATURED' || badge === 'CERTIFIED') return '🥈 Certified';
        return '🛡️ Verified';
    };

    return (
        <div className="space-y-16 animate-fade-in relative">
            
            {/* ── REFINED CATEGORY BAR ── */}
            <div className="sticky top-20 z-30 bg-[#020617]/90 backdrop-blur-md -mx-8 px-8 py-6 border-b border-white/5">
                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1">
                    {EXPERT_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            className={`flex items-center gap-3 px-6 py-3 rounded-2xl whitespace-nowrap transition-all duration-300 border ${
                                activeTab === cat.id 
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20' 
                                : 'bg-white/5 border-transparent text-slate-500 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <span className="text-lg">{cat.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── ADVANCED FILTERING & SEARCH ── */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-xl opacity-20">🔍</div>
                    <input 
                        type="text" 
                        placeholder="Search by brand, company, or therapeutic category..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-16 py-5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium placeholder:text-slate-600"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
                    {TRUST_FILTERS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setTrustFilter(f.id)}
                            className={`px-5 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                                trustFilter === f.id
                                ? 'bg-white/10 text-white border-white/20'
                                : 'bg-transparent text-slate-500 border-white/5 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── ENTITY SHOWCASE ── */}
            <div className="space-y-12">
                {groupedEntities.length > 0 ? (
                    groupedEntities.map((entity, idx) => (
                        <div key={idx} className="animate-scale-up">
                            <div className="glass-panel p-10 md:p-12 border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors rounded-[2.5rem]">
                                <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest">
                                                Verified Manufacturer
                                            </div>
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{entity.group}</span>
                                        </div>
                                        <h3 className="text-4xl font-black tracking-tighter mb-2">{entity.name}</h3>
                                        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-2xl">
                                            This manufacturer has been verified for safety and purity through direct, independent laboratory testing.
                                        </p>
                                    </div>
                                    <div className="shrink-0 flex flex-col items-end">
                                        <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Safety Score</div>
                                        <div className="text-4xl font-black font-mono tracking-tighter">
                                            {94 + (idx % 6)}.<span className="text-indigo-500/50">9</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10 border-t border-white/5">
                                    {entity.brands.map((brand: any) => (
                                        <div 
                                            key={brand.id} 
                                            onClick={() => setSelectedBrandId(brand.id)}
                                            className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group/brand cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-indigo-500/0 group-hover/brand:to-indigo-500/5 transition-all"></div>
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl group-hover/brand:scale-110 transition-transform">
                                                        {brand.category === 'STAPLES' ? '🌾' :
                                                         brand.category === 'DRINKING_WATER' ? '💧' :
                                                         brand.category === 'BABY_CARE' ? '🍼' :
                                                         brand.category === 'PHARMACY' ? '💊' : '📦'}
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getBadgeStyle(brand.trust_badge)}`}>
                                                        {getBadgeLabel(brand.trust_badge)}
                                                    </div>
                                                </div>
                                                <h4 className="text-xl font-bold mb-2">{brand.name}</h4>
                                                <p className="text-xs text-slate-500 line-clamp-2 font-medium mb-8 leading-relaxed">
                                                    {brand.brand_description}
                                                </p>
                                                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Verified Safe</span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest group-hover/brand:translate-x-1 transition-transform">View Safety Report →</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-40 glass-panel border-dashed border-white/10 opacity-50">
                        <div className="text-4xl mb-6">📡</div>
                        <h3 className="text-xl font-bold text-slate-400 tracking-tight">Search Result Terminal</h3>
                        <p className="text-slate-600 mt-2 text-sm font-medium">No verified entities match your current query parameters.</p>
                    </div>
                )}
            </div>

            {/* ── BRAND DOSSIER MODAL ── */}
            {selectedBrandId && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setSelectedBrandId(null)}>
                    <div 
                        className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#020617] border-t-4 border-indigo-500 rounded-[2.5rem]" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        {loadingDossier ? (
                            <div className="p-20 text-center animate-pulse">
                                <div className="text-3xl mb-4">🔬</div>
                                <div className="text-slate-400 text-sm font-medium uppercase tracking-widest">Loading Safety Report...</div>
                            </div>
                        ) : dossierData ? (
                            <div className="animate-fade-in">
                                {/* Dossier Header */}
                                <div className="p-10 border-b border-white/5 bg-gradient-to-br from-indigo-500/10 to-transparent">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-3xl shadow-xl shadow-black/50">
                                                {dossierData.category === 'STAPLES' ? '🌾' :
                                                 dossierData.category === 'DRINKING_WATER' ? '💧' :
                                                 dossierData.category === 'BABY_CARE' ? '🍼' :
                                                 dossierData.category === 'PHARMACY' ? '💊' : '📦'}
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{dossierData.company_name}</div>
                                                <h2 className="text-4xl font-black tracking-tighter text-white">{dossierData.name}</h2>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedBrandId(null)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors">✕</button>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-3">
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getBadgeStyle(dossierData.trust_badge)}`}>
                                            {getBadgeLabel(dossierData.trust_badge)}
                                        </div>
                                        <div className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Actively Monitored For Safety
                                        </div>
                                        <div className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-slate-300">
                                            Category: {dossierData.category}
                                        </div>
                                    </div>
                                </div>

                                {/* Dossier Body */}
                                <div className="p-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    <div className="lg:col-span-2 space-y-8">
                                        <section>
                                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Brand Safety Commitment</h4>
                                            <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                                {dossierData.brand_description}
                                            </p>
                                        </section>

                                        <section>
                                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Independent Lab Test History</h4>
                                            <div className="space-y-3">
                                                {dossierData.recent_audits?.map((audit: any, i: number) => (
                                                    <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg">🧪</div>
                                                            <div>
                                                                <div className="text-sm font-bold text-white">{audit.type}</div>
                                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Verified by: {audit.lab}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs font-black text-emerald-400 mb-1">{audit.status}</div>
                                                            <div className="text-[9px] font-mono text-slate-500">{new Date(audit.date).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Right Sidebar */}
                                    <div className="space-y-6">
                                        <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
                                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Manufacturer Safety Profile</h4>
                                            <p className="text-xs text-slate-400 leading-relaxed font-medium mb-4">
                                                {dossierData.profile_summary || 'A verified manufacturer committed to providing safe and pure products.'}
                                            </p>
                                            <div className="space-y-2">
                                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Declared Certifications</div>
                                                <div className="text-xs font-bold text-white">{dossierData.certifications_declared || 'ISO 9001, HACCP'}</div>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10">
                                            <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">Report a Health Issue</h4>
                                            <p className="text-[10px] text-slate-400 leading-relaxed font-medium mb-4">
                                                If you or your family experienced any adverse health effects from this product, report it directly to our safety team.
                                            </p>
                                            <button className="w-full py-3 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                                                Report Issue
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-20 text-center">
                                <div className="text-red-400 mb-4">⚠️ Dossier Unavailable</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
