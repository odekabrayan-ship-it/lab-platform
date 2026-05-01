import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function LabMarketplace() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLab, setSelectedLab] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const res = await API.get("/api/marketplace/labs");
        setLabs(res.data.data);
      } catch (err) {
        console.error("Failed to load marketplace");
      } finally {
        setLoading(false);
      }
    };
    fetchLabs();
  }, []);

  const filteredLabs = labs.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    (l.capability_list && l.capability_list.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-gradient">Analytical Intelligence Marketplace</h2>
          <p className="text-muted">Discover verified technical partners with absolute trust provided by the QualiCore Accreditation Authority.</p>
        </div>
        <div className="w-96">
            <input 
                className="w-full p-3 glass-panel border-none" 
                placeholder="🔍 Search Test or Method (e.g. Lead, HPLC, Water)..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
        </div>
      </div>

      {loading ? (
        <p className="text-center py-20 text-muted">Scanning global laboratory network...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredLabs.length === 0 ? (
              <div className="col-span-full text-center py-20 glass-panel">
                  <p className="text-muted">No labs found matching your technical specifications.</p>
              </div>
          ) : filteredLabs.map(lab => (
            <div key={lab.id} className="glass-panel hover:border-blue-500/50 transition-all group">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors">{lab.name}</h3>
                        <p className="text-sm text-muted">📍 {lab.city}, {lab.country}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {lab.verification_status === 'VERIFIED' ? (
                            <span className="pill bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1 font-black">
                                <span className="text-sm">🛡️</span> QUALICORE VERIFIED
                            </span>
                        ) : (
                            <span className="pill bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1 font-black">
                                <span className="text-sm">🚀</span> NETWORK TRIAL
                            </span>
                        )}
                        <div className="flex gap-1 flex-wrap justify-end">
                            {lab.accreditations.map((acc, idx) => (
                                <span key={idx} className="pill bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] uppercase font-bold" title={`Cert: ${acc.cert}`}>
                                    🛡️ {acc.type}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/5 p-3 rounded text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Avg. TAT</div>
                        <div className="text-sm font-bold">{lab.turnaround_time || '3-5 Days'}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Logistics</div>
                        <div className="text-sm font-bold">{lab.sample_pickup ? 'Pickup' : 'Drop-off'}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Compliance</div>
                        <div className="text-sm font-bold">{lab.accreditations.length > 0 ? 'Full' : 'Standard'}</div>
                    </div>
                </div>

                <div className="mb-8">
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-widest">Top Capabilities</h4>
                    <div className="flex flex-wrap gap-2">
                        {lab.capability_list ? lab.capability_list.split(',').slice(0, 5).map(cap => (
                            <span key={cap} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[10px] border border-slate-700">
                                {cap}
                            </span>
                        )) : <span className="text-xs text-muted">Contact for analytical scope.</span>}
                        {lab.capability_list && lab.capability_list.split(',').length > 5 && (
                            <span className="text-[10px] text-blue-400 font-bold self-center">
                                + {lab.capability_list.split(',').length - 5} More
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-white/10">
                    <button className="text-xs text-blue-400 hover:underline font-bold" onClick={() => setSelectedLab(lab)}>
                        View Technical Dossier
                    </button>
                    <button className="btn-primary btn-sm" onClick={() => navigate(`/relationship-manager`)}>
                        🚀 Initiate Engagement
                    </button>
                </div>
            </div>
          ))}
        </div>
      )}

      {/* TECHNICAL DOSSIER MODAL */}
      {selectedLab && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-2xl font-bold">{selectedLab.name}</h2>
                    <p className="text-muted">Technical Dossier & Analytical Scope</p>
                </div>
                <button className="text-2xl" onClick={() => setSelectedLab(null)}>✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="md:col-span-2">
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-4 tracking-widest">Verified Accreditation Authority</h4>
                    <div className="space-y-4">
                        {selectedLab.accreditations.length === 0 ? (
                            <p className="text-sm italic text-muted">No formal accreditations verified by the platform.</p>
                        ) : selectedLab.accreditations.map((acc, idx) => (
                            <div key={idx} className="bg-white/5 p-4 rounded border border-white/10 flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-blue-400">{acc.type}</div>
                                    <div className="text-[10px] text-slate-400 uppercase">Certificate: {acc.cert}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase font-bold text-slate-500">Valid Until</div>
                                    <div className="text-sm font-mono">{new Date(acc.expiry).toLocaleDateString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h4 className="text-xs font-bold uppercase text-slate-500 mt-8 mb-4 tracking-widest">Full Analytical Scope</h4>
                    <div className="flex flex-wrap gap-2">
                        {selectedLab.capability_list ? selectedLab.capability_list.split(',').map(cap => (
                            <span key={cap} className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700">
                                {cap}
                            </span>
                        )) : "N/A"}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-panel bg-blue-500/5 border-blue-500/20">
                        <h4 className="text-[10px] uppercase font-bold text-blue-400 mb-2">Service Performance</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-xs text-slate-400">Mean TAT:</span>
                                <span className="text-xs font-bold">{selectedLab.turnaround_time}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs text-slate-400">Logistics:</span>
                                <span className="text-xs font-bold">{selectedLab.sample_pickup ? 'Pickup' : 'Drop-off'}</span>
                            </div>
                        </div>
                    </div>
                    <button className="btn-primary w-full py-4" onClick={() => navigate(`/relationship-manager`)}>
                        Initiate Partnership
                    </button>
                    <p className="text-[10px] text-center text-muted italic">
                        By initiating a partnership, you will enter the formal Technical Capability Review (Contract Review) phase as per ISO 17025.
                    </p>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
