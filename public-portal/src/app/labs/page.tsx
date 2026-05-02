async function getLabs() {
  try {
    const res = await fetch((`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/public/labs`), { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    return [];
  }
}

export default async function LabsDirectory() {
  const labs = await getLabs();

  return (
    <div className="bg-[#02040a] min-h-screen text-[#f8fafc]">
      {/* Institutional Header */}
      <div className="w-full bg-blue-600/5 border-b border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Verified Laboratory Infrastructure Index</span>
            </div>
            <h1 className="text-6xl font-bold tracking-tighter mb-4">Laboratory <span className="text-blue-400">Network</span> Directory.</h1>
            <p className="text-white/40 max-w-2xl text-lg leading-relaxed font-medium">
                Official registry of clinical, chemical, and industrial laboratories operating within the QualiCore verified ecosystem. 
                All listed entities maintain direct digital traceability via the LIMS Gateway.
            </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20">
        {labs.length === 0 ? (
            <div className="p-32 rounded-[3rem] bg-white/[0.01] border border-white/5 text-center text-white/20 italic">
                Synchronizing Network Infrastructure... No active laboratories found.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {labs.map((lab: any, i: number) => (
                    <div key={i} className="p-10 rounded-[3rem] bg-white/[0.01] border border-white/5 hover:border-blue-500/30 transition-all flex flex-col group">
                        <div className="flex justify-between items-start mb-10">
                            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                🧪
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${lab.verification_status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                    {lab.verification_status}
                                </span>
                                {lab.iso_status !== 'NOT_ACCREDITED' && (
                                    <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest">ISO 17025 Auth</span>
                                )}
                            </div>
                        </div>

                        <div className="mb-10">
                            <h3 className="text-3xl font-bold tracking-tight mb-2 group-hover:text-blue-400 transition-colors leading-none">{lab.name}</h3>
                            <p className="text-white/30 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mt-4">
                                <span className="text-blue-500">📍</span> {lab.city}, {lab.country}
                            </p>
                        </div>

                        <div className="space-y-6 mt-auto">
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                                <div className="text-[10px] text-white/30 uppercase font-black tracking-widest mb-2">Technical Specialization</div>
                                <div className="text-sm font-bold text-white/80">{lab.specialization}</div>
                            </div>

                            <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                                    UUID: <span className="font-mono text-white/40">{lab.original_id?.substring(0,8) || '---'}</span>
                                </div>
                                <button className="text-blue-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">
                                    Full Dossier →
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        <div className="mt-32 p-16 rounded-[3rem] bg-white/[0.01] border border-white/5 text-center">
            <h4 className="text-2xl font-bold mb-6">Network Integrity Standards</h4>
            <p className="text-sm text-white/30 max-w-4xl mx-auto leading-relaxed font-medium">
                The QualiCore Verified Laboratory Network represents a consortium of analytical facilities that have integrated their operations with our digital transparency engine. 
                Presence in this registry indicates active compliance with data traceability protocols.
            </p>
        </div>
      </div>
    </div>
  );
}
