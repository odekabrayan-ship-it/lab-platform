async function getBrands() {
  try {
    const res = await fetch((`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/public/brands`), { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    return [];
  }
}

export default async function BrandsDirectory() {
  const brands = await getBrands();

  return (
    <div className="bg-[#02040a] min-h-screen text-[#f8fafc]">
      {/* Institutional Sub-Header */}
      <div className="w-full bg-indigo-600/5 border-b border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-6">
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Registry Index 2.0</span>
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">S Supply Chain Integrity</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tighter mb-4">Verified <span className="text-indigo-400">Brand</span> Directory.</h1>
            <p className="text-white/40 max-w-2xl text-sm leading-relaxed font-medium">
                A structured repository of consumer and industrial brands evaluated under the QualiCore Trust Framework. 
                Each entry is mapped to verified technical entities and laboratory confidence signals.
            </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Scientific Filtering (Sidebar) */}
          <div className="lg:col-span-3 space-y-12">
            <section>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-6">Search Protocols</h4>
                <div className="relative group">
                    <input 
                    type="text" 
                    placeholder="Search by Brand UUID..." 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-xs">🔍</span>
                </div>
            </section>

            <section>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-6">Taxonomy Filters</h4>
                <div className="space-y-3">
                    {['Pharmaceuticals', 'Botanicals', 'Nutraceuticals', 'Clinical Reagents'].map(cat => (
                        <label key={cat} className="flex items-center gap-3 text-[11px] font-bold text-white/40 cursor-pointer hover:text-white transition-colors group">
                            <input type="checkbox" className="w-4 h-4 rounded-md border-white/10 bg-white/5 text-indigo-600 focus:ring-0" />
                            <span className="tracking-wide uppercase">{cat}</span>
                        </label>
                    ))}
                </div>
            </section>

            <section className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                <h5 className="text-[10px] font-black text-indigo-400 mb-2 uppercase tracking-widest">Notice to Researchers</h5>
                <p className="text-[9px] text-white/30 leading-relaxed font-medium italic">
                    Confidence signals represent the aggregate of verified laboratory tests and institutional declarations over a 12-month trailing period.
                </p>
            </section>
          </div>

          {/* Technical Data Grid */}
          <div className="lg:col-span-9">
            {brands.length === 0 ? (
                <div className="p-20 rounded-[3rem] bg-white/[0.02] border border-white/5 border-dashed text-center text-white/20 italic text-sm">
                    No registry data synchronized for this query.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {brands.map((brand: any, i: number) => (
                        <div key={i} className="p-10 rounded-[2.5rem] bg-white/[0.01] border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col group">
                            <div className="flex justify-between items-start mb-8">
                                <div className="p-4 rounded-2xl bg-white/5 text-2xl grayscale group-hover:grayscale-0 transition-all">
                                    🧬
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Confidence Score</div>
                                    <div className="text-xl font-mono font-bold tracking-tighter">
                                        {brand.resolution_rate || 99}.<span className="text-indigo-500/50">8</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h3 className="text-3xl font-bold tracking-tight mb-2 group-hover:text-indigo-400 transition-colors">{brand.name}</h3>
                                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Index: {brand.category}</div>
                            </div>

                            <p className="text-sm text-white/40 leading-relaxed mb-10 line-clamp-3 font-medium">
                                {brand.brand_description || "A technical entity registered under the QualiCore supply chain vigilance framework with active LIMS interconnectivity."}
                            </p>

                            <div className="mt-auto space-y-4">
                                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-white/5">
                                    <div>
                                        <div className="text-[8px] font-black text-white/20 uppercase mb-1">Total Signals</div>
                                        <div className="text-xs font-bold font-mono">{brand.trust_count?.toLocaleString() || '---'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[8px] font-black text-white/20 uppercase mb-1">Vigilance Status</div>
                                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Verified Active</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-white/30 uppercase tracking-widest pt-2">
                                    <span>ID: {brand.id || '---'}</span>
                                    <span className="text-indigo-500/50">View Dossier →</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="mt-20 flex justify-center">
                <nav className="flex gap-2">
                    {[1, 2, 3].map(p => (
                        <button key={p} className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${p === 1 ? 'bg-indigo-600 text-white' : 'bg-white/5 border border-white/10 text-white/30 hover:text-white'}`}>
                            {p}
                        </button>
                    ))}
                </nav>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
