async function getCompanies() {
  try {
    const res = await fetch((`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/public/companies`), { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    return [];
  }
}

export default async function CompaniesDirectory() {
  const companies = await getCompanies();

  return (
    <div className="bg-[#02040a] min-h-screen text-[#f8fafc]">
      {/* Sub-Header: Institutional Authority */}
      <div className="w-full bg-emerald-600/5 border-b border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Institutional Registry of Technical Entities</span>
            </div>
            <h1 className="text-6xl font-bold tracking-tighter mb-4">Corporate <span className="text-emerald-400">Integrity</span> Index.</h1>
            <p className="text-white/40 max-w-2xl text-lg leading-relaxed font-medium">
                Official directory of verified organizations within the QualiCore supply chain. 
                Each entity has undergone a structured audit of their quality management systems and transparency protocols.
            </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 gap-12">
            {companies.length === 0 ? (
                <div className="p-32 rounded-[3rem] bg-white/[0.01] border border-white/5 text-center text-white/20 italic">
                    Synchronizing Corporate Ledger... No entities found.
                </div>
            ) : (
                companies.map((company: any, i: number) => (
                    <div key={i} className="p-10 lg:p-16 rounded-[3rem] bg-white/[0.01] border border-white/5 hover:border-emerald-500/30 transition-all group overflow-hidden relative">
                        {/* Decorative Identifier */}
                        <div className="absolute -top-10 -right-10 text-[120px] font-black text-white/[0.02] pointer-events-none select-none">
                            {company.industry?.charAt(0) || 'E'}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10">
                            {/* Primary Info */}
                            <div className="lg:col-span-4 space-y-8">
                                <div>
                                    <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">
                                        🏢
                                    </div>
                                    <h3 className="text-4xl font-bold tracking-tight mb-2 group-hover:text-emerald-400 transition-colors">{company.name}</h3>
                                    <div className="text-xs font-bold text-white/30 uppercase tracking-[0.2em]">{company.industry} • {company.country}</div>
                                </div>
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                        Level {company.verification_level || 3} Verified Entity
                                    </div>
                                    <p className="text-sm text-white/40 leading-relaxed font-medium">
                                        {company.profile_summary}
                                    </p>
                                </div>
                            </div>

                            {/* Technical Metadata */}
                            <div className="lg:col-span-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <section>
                                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6 border-b border-emerald-500/20 pb-2">Compliance Dossier</h4>
                                        <div className="space-y-6">
                                            <div>
                                                <div className="text-xs font-bold text-white mb-2">Primary Compliance Claim</div>
                                                <div className="text-sm text-white/50 leading-relaxed italic border-l-2 border-white/5 pl-4">
                                                    "{company.compliance_claims}"
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white mb-2">Institutional Certifications</div>
                                                <div className="text-sm text-white/50 leading-relaxed border-l-2 border-white/5 pl-4">
                                                    {company.certifications_declared}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6 border-b border-emerald-500/20 pb-2">Operational Standards</h4>
                                        <div className="space-y-6">
                                            <div>
                                                <div className="text-xs font-bold text-white mb-2">Verified Quality Practices</div>
                                                <div className="text-sm text-white/50 leading-relaxed border-l-2 border-white/5 pl-4">
                                                    {company.quality_practices}
                                                </div>
                                            </div>
                                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black uppercase text-emerald-400">Supply Chain Transparency</span>
                                                    <span className="text-xs font-mono font-bold">100%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500/50" style={{ width: '100%' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap justify-between items-center gap-6">
                                    <div className="flex gap-4">
                                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Registered UUID: <span className="text-white/40 font-mono">{company.id || '---'}</span></div>
                                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Registry Level: <span className="text-emerald-400 font-mono">SOVEREIGN</span></div>
                                    </div>
                                    <button className="px-8 py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/10">
                                        Inspect Entity Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

        <div className="mt-32 p-16 rounded-[3rem] bg-white/[0.02] border border-white/5 text-center">
            <SectionHeading 
                title="Integrity Management Statement"
                subtitle="All entities listed in the QualiCore Corporate Integrity Index have submitted to a structured review of their transparency protocols. No medical claims are implied by an entity's presence in this registry."
            />
            <div className="flex justify-center gap-8 mt-12 grayscale opacity-30">
                <div className="text-[10px] font-black uppercase tracking-[0.3em]">ISO-17025 Compliant</div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional Grade</div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em]">Data Traceability</div>
            </div>
        </div>
      </div>
    </div>
  );
}

const SectionHeading = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight mb-4">{title}</h2>
        <p className="text-white/40 text-sm leading-relaxed font-medium">
            {subtitle}
        </p>
    </div>
);
