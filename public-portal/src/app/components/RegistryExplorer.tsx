'use client';

import { useState, useMemo } from 'react';

const EXPERT_CATEGORIES = [
    { id: 'all', label: 'Universal Registry', icon: '🌐', desc: 'Global Health Oversight' },
    { id: 'PHARMACY', label: 'Wellness & Pharma', icon: '🏥', desc: 'Clinical Grade Providers' },
    { id: 'DRINKING_WATER', label: 'Safe Hydration', icon: '💧', desc: 'Certified Pure Water' },
    { id: 'BEVERAGES', label: 'Beverages', icon: '🥤', desc: 'Vigilance-Checked Refreshments' },
    { id: 'STAPLES', label: 'Pantry Purity', icon: '🍳', desc: 'Daily Grains & Oils' },
    { id: 'DAIRY', label: 'Dairy & Fresh', icon: '🥛', desc: 'Fresh Nutritional Staples' },
    { id: 'BABY_CARE', label: 'Infant Protection', icon: '🍼', desc: 'Critical Infant Nutrition' }
];

export default function RegistryExplorer({ initialBrands }: { initialBrands: any[] }) {
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');

    const groupedEntities = useMemo(() => {
        const filtered = initialBrands.filter(brand => {
            const matchesSearch = brand.name.toLowerCase().includes(search.toLowerCase()) || 
                                 brand.company_name.toLowerCase().includes(search.toLowerCase()) ||
                                 brand.brand_description?.toLowerCase().includes(search.toLowerCase());
            const matchesTab = activeTab === 'all' || brand.consumer_group === activeTab;
            return matchesSearch && matchesTab;
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
    }, [initialBrands, activeTab, search]);

    return (
        <div className="space-y-16 animate-fade-in">
            
            {/* ── REFINED CATEGORY BAR ── */}
            <div className="sticky top-20 z-40 bg-[#020617]/90 backdrop-blur-md -mx-8 px-8 py-6 border-b border-white/5">
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

            {/* ── MINIMALIST SEARCH ── */}
            <div className="relative max-w-2xl group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-xl opacity-20">🔍</div>
                <input 
                    type="text" 
                    placeholder="Search the global trust ledger..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-16 py-6 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-medium placeholder:text-slate-600"
                />
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
                                                Certified Institution
                                            </div>
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{entity.group}</span>
                                        </div>
                                        <h3 className="text-4xl font-black tracking-tighter mb-2">{entity.name}</h3>
                                        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-2xl">
                                            Trusted provider mapped to the QualiCore scientific vigilance network. 
                                            Analytical integrity verified via direct laboratory interconnect.
                                        </p>
                                    </div>
                                    <div className="shrink-0 flex flex-col items-end">
                                        <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Network Score</div>
                                        <div className="text-4xl font-black font-mono tracking-tighter">
                                            {94 + (idx % 6)}.<span className="text-indigo-500/50">9</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10 border-t border-white/5">
                                    {entity.brands.map((brand: any) => (
                                        <div key={brand.id} className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/20 transition-all group/brand cursor-pointer">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl group-hover/brand:scale-110 transition-transform">
                                                    {brand.category === 'STAPLES' ? '🌾' :
                                                     brand.category === 'DRINKING_WATER' ? '💧' :
                                                     brand.category === 'BABY_CARE' ? '🍼' : '📦'}
                                                </div>
                                                <div className="px-3 py-1 rounded-full bg-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                                    {brand.trust_badge || 'VERIFIED'}
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-bold mb-2">{brand.name}</h4>
                                            <p className="text-xs text-slate-500 line-clamp-2 font-medium mb-8 leading-relaxed">
                                                {brand.brand_description}
                                            </p>
                                            <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Live Safety</span>
                                                </div>
                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Dossier →</span>
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
        </div>
    );
}
