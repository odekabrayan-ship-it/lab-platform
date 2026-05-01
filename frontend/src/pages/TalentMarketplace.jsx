import { useState, useEffect } from "react";
import API from "../services/api";

export default function TalentMarketplace() {
  const [talent, setTalent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState(null);
  
  // Dossier Modal State
  const [selectedPro, setSelectedPro] = useState(null);
  const [fetchingDossier, setFetchingDossier] = useState(false);

  useEffect(() => {
    const fetchTalent = async () => {
      try {
        const res = await API.get("/api/talent/search");
        setTalent(res.data.data);
      } catch (err) {
        console.error("Failed to load talent network");
      } finally {
        setLoading(false);
      }
    };
    fetchTalent();
  }, []);

  const handleHireRequest = async (id) => {
    try {
      await API.post("/api/talent/hire", { professional_id: id });
      setMessage({ type: "success", text: "Hire request placed to the Super Admin Authority. They will facilitate the introduction." });
      setSelectedPro(null); // Close modal if open
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      alert("Failed to place hire request.");
    }
  };

  const handleViewDossier = async (id) => {
      setFetchingDossier(true);
      try {
          const res = await API.get(`/api/talent/${id}`);
          setSelectedPro(res.data.data);
      } catch (err) { alert("Technical dossier retrieval failed."); }
      finally { setFetchingDossier(false); }
  };

  const filteredTalent = talent.filter(t => 
    t.full_name.toLowerCase().includes(search.toLowerCase()) || 
    t.specialty.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-gradient">Expert Talent Discovery</h2>
          <p className="text-muted">Discover and deep-dive into the technical dossiers of sovereign-certified laboratory experts.</p>
        </div>
        <div className="w-96">
            <input 
                className="w-full p-3 glass-panel border-none" 
                placeholder="🔍 Search Specialty or Skill (e.g. HPLC, QA, Lead)..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
        </div>
      </div>

      {message && (
        <div className="p-4 mb-6 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-bold flex justify-between items-center animate-slide-up">
            <span>🛡️ {message.text}</span>
            <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      {loading ? (
        <p className="text-center py-20 text-muted italic">Scanning certified expert registry...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredTalent.length === 0 ? (
            <div className="col-span-full text-center py-20 glass-panel">
                <p className="text-muted">No certified experts matched your current search.</p>
            </div>
          ) : filteredTalent.map(pro => (
            <div key={pro.id} className="glass-panel hover:border-blue-500/30 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl">👨‍🔬</div>
                    <div>
                        <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors">{pro.full_name}</h3>
                        <p className="text-sm font-bold text-blue-500">{pro.specialty}</p>
                        <p className="text-xs text-muted">📍 {pro.location}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="pill pill-paid">✓ CERTIFIED EXPERT</span>
                    <p className="text-[10px] text-muted mt-2 uppercase font-bold tracking-widest">{pro.experience_years} Years Experience</p>
                </div>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-lg mb-6 border border-white/5">
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {pro.bio}
                </p>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-white/10">
                <button className="text-xs text-blue-400 hover:underline font-bold" onClick={() => handleViewDossier(pro.id)}>
                    {fetchingDossier ? 'Retrieving Dossier...' : 'View Technical Dossier'}
                </button>
                <button className="btn-primary btn-sm px-6" onClick={() => handleHireRequest(pro.id)}>
                    Hire Professional
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EXPERT DOSSIER MODAL */}
      {selectedPro && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-8">
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-2xl">👨‍🔬</div>
                    <div>
                        <h2 className="text-2xl font-bold">{selectedPro.full_name}</h2>
                        <p className="text-blue-400 font-bold text-sm uppercase tracking-widest">{selectedPro.specialty}</p>
                    </div>
                </div>
                <button className="text-2xl" onClick={() => setSelectedPro(null)}>✕</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section>
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest">Technical Profile</h4>
                        <p className="text-sm text-slate-300 leading-relaxed italic">"{selectedPro.bio}"</p>
                    </section>

                    <section>
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-6 tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            Analytical Lineage (Verified History)
                        </h4>
                        <div className="space-y-0 ml-2 border-l-2 border-slate-800 pb-4">
                            {selectedPro.experience.map((exp, idx) => {
                                const start = new Date(exp.start_date);
                                const end = exp.is_current ? new Date() : new Date(exp.end_date);
                                const diffYears = end.getFullYear() - start.getFullYear();
                                const diffMonths = end.getMonth() - start.getMonth();
                                const totalMonths = diffYears * 12 + diffMonths;
                                const years = Math.floor(totalMonths / 12);
                                const months = totalMonths % 12;
                                const durationStr = `${years > 0 ? years + 'y ' : ''}${months}m`;

                                return (
                                    <div key={idx} className="relative pl-8 pb-10 last:pb-0">
                                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <h5 className="font-bold text-blue-400 text-base">{exp.role_title}</h5>
                                                <p className="text-sm font-bold text-slate-300">{exp.organization_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-mono text-slate-500 block uppercase">{exp.start_date} — {exp.is_current ? 'Present' : exp.end_date}</span>
                                                <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full mt-1 inline-block">{durationStr}</span>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-lg border border-white/5 mt-3">
                                            <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                                                {exp.responsibilities}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section>
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest">Technical Matrix (Skills & Instruments)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {selectedPro.skills.map((skill, idx) => (
                                <div key={idx} className="bg-white/5 p-3 rounded border border-white/10 flex justify-between items-center">
                                    <div>
                                        <div className="text-[8px] uppercase font-bold text-slate-500">{skill.category}</div>
                                        <div className="text-xs font-bold">{skill.skill_name}</div>
                                    </div>
                                    <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{skill.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <div className="glass-panel border-l-4 border-blue-500">
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-4">Authority Status</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Compliance:</span>
                                <span className="text-green-400 font-bold">CERTIFIED</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Experience:</span>
                                <span className="font-bold">{selectedPro.experience_years} Years</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Location:</span>
                                <span className="font-bold">{selectedPro.location}</span>
                            </div>
                        </div>
                    </div>

                    <button className="btn-primary w-full py-4" onClick={() => handleHireRequest(selectedPro.id)}>
                        🚀 Hire Professional
                    </button>
                    <p className="text-[9px] text-center text-muted italic">
                        By hiring this expert, a placement request will be sent to the Super Admin for formal facilitation.
                    </p>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
