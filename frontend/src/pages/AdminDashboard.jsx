import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../services/api";

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "pulse");
  const [stats, setStats] = useState(null);
  const [entities, setEntities] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [accreditations, setAccreditations] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [platformTreasury, setPlatformTreasury] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Communication States
  const [messagingTarget, setMessagingTarget] = useState(null); // { user_id, name, type }
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Advanced Review States
  const [reviewingPro, setReviewingPro] = useState(null);
  const [proDecision, setProDecision] = useState({ status: "VERIFIED", notes: "", tier: "EXPERT" });

  const [broadcasts, setBroadcasts] = useState([]);
  const [activeBroadcastApps, setActiveBroadcastApps] = useState(null);

  const [broadcastForm, setBroadcastForm] = useState({ subject: "", content: "", type: "ANNOUNCEMENT", target_specialty: "ALL" });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [verifyingEntity, setVerifyingEntity] = useState(null);
  const [vForm, setVForm] = useState({ status: "VERIFIED", notes: "" });
  
  const [membershipApproval, setMembershipApproval] = useState(null); // { entity, fee }
  const [customFee, setCustomFee] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, entitiesRes, accRes, auditRes, subRes, proRes, placeRes, treasuryRes, ledgerRes] = await Promise.all([
        API.get("/api/admin/ecosystem-stats"),
        API.get("/api/admin/entities"),
        API.get("/api/admin/accreditations"),
        API.get("/api/admin/audit-logs"),
        API.get("/api/admin/subscriptions"),
        API.get("/api/admin/professionals"),
        API.get("/api/admin/placements"),
        API.get("/api/admin/treasury"),
        API.get("/api/admin/ledger"),
        API.get("/api/admin/hr/requisitions")
      ]);
      setStats(statsRes.data.data);
      setEntities(entitiesRes.data.data);
      setAccreditations(accRes.data.data);
      setAuditLogs(auditRes.data.data);
      setSubscriptions(subRes.data.data);
      setProfessionals(proRes.data.data);
      setPlacements(placeRes.data.data);
      setPlatformTreasury(treasuryRes.data.data);
      setLedger(ledgerRes.data.data);
      setRequisitions(requisitionsRes.data.data);
    } catch (err) {
      console.error("Governance data sync failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleReviewPro = async (id) => {
      try {
          const res = await API.get(`/api/admin/professionals/${id}`);
          setReviewingPro(res.data.data);
          setProDecision({ status: res.data.data.certification_status, notes: res.data.data.admin_notes || "", tier: res.data.data.specialty_tier || "EXPERT" });
      } catch (err) { alert("Dossier retrieval failed"); }
  };

  const loadBroadcastHistory = async () => {
      try {
          const res = await API.get("/api/admin/broadcasts");
          setBroadcasts(res.data.data);
      } catch (err) { console.error("Failed to load broadcasts"); }
  };

  const viewApplicants = async (bcId) => {
      try {
          const res = await API.get(`/api/admin/broadcasts/${bcId}/applications`);
          setActiveBroadcastApps(res.data.data);
      } catch (err) { alert("Failed to load applicants"); }
  };

  useEffect(() => {
      loadData();
      loadBroadcastHistory();
  }, []);

  const submitProCertification = async (e) => {
      e.preventDefault();
      try {
          await API.patch(`/api/admin/professionals/${reviewingPro.id}/verify`, proDecision);
          setReviewingPro(null);
          loadData();
      } catch (err) { alert("Certification failed"); }
  };

  const handleSendBroadcast = async (e) => {
      e.preventDefault();
      setSendingBroadcast(true);
      try {
          const res = await API.post("/api/admin/broadcast", broadcastForm);
          alert(`Global Broadcast pushed to ${res.data.data.sent_count} professionals.`);
          setBroadcastForm({ subject: "", content: "", type: "ANNOUNCEMENT", target_specialty: "ALL" });
          loadBroadcastHistory();
      } catch (err) { alert("Broadcast failed"); }
      finally { setSendingBroadcast(false); }
  };

  const handleVerifyAccreditation = async (id, status) => {
      if (!confirm(`Mark this accreditation as ${status}?`)) return;
      try {
          await API.patch(`/api/admin/accreditations/${id}`, { status });
          loadData();
      } catch (err) { alert("Action failed"); }
  };

  const handleVerifyEntity = async (e) => {
    e.preventDefault();
    try {
      await API.put("/api/admin/verify", { id: verifyingEntity.id, type: verifyingEntity.type, ...vForm });
      setVerifyingEntity(null);
      loadData();
    } catch (err) { alert("Entity update failed"); }
  };

  const handleRespondRequisition = async (id, status) => {
    const feedback = prompt("Enter administrative feedback or sourcing status for the HR Manager:");
    if (!feedback && status === 'REJECTED') return;
    try {
        await API.put(`/api/admin/hr/requisitions/${id}/respond`, { status, feedback });
        loadData();
    } catch (e) { alert("Action failed"); }
  };

  const handleImpersonate = async (userId) => {
    if (!confirm("Are you sure you want to initiate a Perspective Shift? This will securely switch your session to this user's portal for oversight.")) return;
    try {
        const res = await API.post(`/api/admin/impersonate/${userId}`);
        const { token, user } = res.data.data;
        
        // Backup original admin token
        const currentToken = localStorage.getItem('token');
        localStorage.setItem('original_token', currentToken);
        
        // Inject impersonation token
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Redirect to role-appropriate dashboard
        if (user.role === 'lab') window.location.href = '/dashboard';
        else if (user.role === 'client') window.location.href = '/company-dashboard';
        else if (user.role === 'professional') window.location.href = '/professional-profile';
        else window.location.href = '/';
    } catch (err) {
        alert("Perspective shift failed. Ensure you have sovereign administrative authority.");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-gradient">QualiCore Global Control Tower</h2>
          <p className="text-muted">Sovereign oversight of technical entities and the national pool of certified experts.</p>
        </div>
        {stats && (
            <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-500">Network GDP</div>
                <div className="text-2xl font-bold text-green-400">${(stats.total_revenue || 0).toLocaleString()}</div>
            </div>
        )}
      </div>

      {/* TABS */}
      <div className="flex gap-6 border-b border-white/10 mb-8 overflow-x-auto">
        {[
            { id: 'pulse', label: '📊 Pulse' },
            { id: 'professionals', label: '🎓 Experts' },
            { id: 'membership', label: '💳 Authority' },
            { id: 'ledger', label: '📜 Ledger' },
            { id: 'treasury', label: '🏦 Treasury' },
            { id: 'entities', label: '🤝 Registry' },
            { id: 'talent', label: '💼 Talent Requests' },
            { id: 'accreditations', label: '🛡️ ISO Auth' },
            { id: 'registry_mgmt', label: '🌍 Public Registry' },
            { id: 'audit', label: '📝 Audit' }
        ].map(tab => (
            <button 
                key={tab.id}
                className={`pb-3 px-2 font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === tab.id ? 'text-blue-400 border-b-2 border-blue-400' : 'text-muted hover:text-white'}`}
                onClick={() => setActiveTab(tab.id)}
            >
                {tab.label}
            </button>
        ))}
      </div>

      {loading ? (
          <p className="text-muted text-center py-20 italic">Syncing Sovereign Ledger...</p>
      ) : (
          <>
            {/* MEMBERSHIP TAB */}
            {activeTab === 'membership' && (
              <div className="glass-panel animate-slide-in">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">Membership Authority</h3>
                  <span className="badge badge-primary">Financial Onboarding</span>
                </div>
                
                <div className="space-y-4">
                  {entities.filter(e => e.subscription_status === 'PENDING_ONBOARDING' || e.subscription_status === 'AWAITING_PAYMENT').map(entity => (
                    <div key={entity.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-white/5">
                      <div>
                        <div className="font-bold">{entity.company_name}</div>
                        <div className="text-[10px] text-muted uppercase">{entity.type} · {entity.verification_status}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-4">
                          <div className={`text-[10px] font-bold uppercase ${entity.subscription_status === 'AWAITING_PAYMENT' ? 'text-amber-500' : 'text-slate-500'}`}>
                            {entity.subscription_status}
                          </div>
                        </div>
                        {entity.subscription_status === 'PENDING_ONBOARDING' && (
                          <button 
                            onClick={() => {
                                setMembershipApproval(entity);
                                setCustomFee(entity.type === 'lab' ? "500" : (entity.type === 'client' ? "200" : "50"));
                            }}
                            className="btn-sm btn-primary bg-green-600 hover:bg-green-500 border-none"
                          >
                            Set Fee & Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {entities.filter(e => e.subscription_status === 'PENDING_ONBOARDING' || e.subscription_status === 'AWAITING_PAYMENT').length === 0 && (
                      <div className="text-center py-10 text-muted italic">No pending memberships.</div>
                  )}
                </div>

                {/* Custom Fee Modal */}
                {membershipApproval && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex-center z-[200] p-6">
                        <div className="glass-panel w-full max-w-sm animate-scale-up border-t-4 border-green-500">
                            <h3 className="font-bold text-lg mb-2">Set Registration Fee</h3>
                            <p className="text-xs text-muted mb-6">Authorize <strong>{membershipApproval.company_name}</strong> and request a custom onboarding settlement.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fee Amount (USD)</label>
                                    <input 
                                        type="number"
                                        className="w-full p-4 bg-slate-900 border border-white/10 rounded-lg text-2xl font-bold text-green-400 outline-none focus:border-green-500"
                                        value={customFee}
                                        onChange={e => setCustomFee(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setMembershipApproval(null)} className="btn-secondary flex-1">Cancel</button>
                                    <button 
                                        onClick={async () => {
                                            await API.post("/api/admin/membership/approve", { id: membershipApproval.id, type: membershipApproval.type, fee_amount: customFee });
                                            setMembershipApproval(null);
                                            loadData();
                                        }}
                                        className="btn-primary flex-1 bg-green-600 border-none"
                                    >
                                        Approve & Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            )}

            {/* PROFESSIONALS TAB */}
            {activeTab === 'professionals' && (
                <div className="animate-slide-up space-y-12">
                    <section>
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            Analytical Expert Applicants
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">Certification Gateway</span>
                        </h3>
                        <div className="glass-panel p-0 overflow-hidden">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Professional</th>
                                        <th>Primary Specialty</th>
                                        <th>Technical Depth</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {professionals.map(pro => (
                                        <tr key={pro.id}>
                                            <td>
                                                <div className="font-bold">{pro.full_name}</div>
                                                <div className="text-[10px] text-muted uppercase tracking-wider">{pro.email}</div>
                                            </td>
                                            <td className="text-sm font-bold text-blue-400">{pro.specialty}</td>
                                            <td>
                                                <div className="flex gap-2 text-[10px]">
                                                    <span className="text-slate-400">{pro.experience_years}y Exp</span>
                                                    <span className="text-purple-400">| {pro.cert_count} Certs</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`pill ${pro.certification_status === 'VERIFIED' ? 'pill-paid' : pro.certification_status === 'REJECTED' ? 'pill-danger' : 'pill-review'}`}>
                                                    {pro.certification_status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button className="btn-sm btn-primary text-[10px]" onClick={() => handleReviewPro(pro.id)}>Review Dossier</button>
                                                    <button className="btn-sm bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white text-[10px] border border-indigo-500/30" title="Perspective Shift" onClick={() => handleImpersonate(pro.user_id)}>
                                                        👁️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-4">Talent Placement Authority</h3>
                        <div className="glass-panel p-0 overflow-hidden">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Requester</th>
                                        <th>Target Expert</th>
                                        <th>Inquiry Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {placements.map(pl => (
                                        <tr key={pl.id}>
                                            <td className="text-xs font-bold text-slate-400">{pl.requester_type.toUpperCase()} #{pl.requester_id}</td>
                                            <td className="font-bold text-blue-400">{pl.professional_name}</td>
                                            <td className="text-[10px] text-muted uppercase">{new Date(pl.created_at).toLocaleDateString()}</td>
                                            <td><span className="pill pill-review">{pl.status}</span></td>
                                            <td><button className="text-blue-400 text-xs font-bold hover:underline">Facilitate Intro</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            Global Communication Hub
                            <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">Network Broadcast</span>
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Broadcast Form */}
                            <form onSubmit={handleSendBroadcast} className="glass-panel border-l-4 border-purple-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Subject / Job Title</label>
                                        <input className="w-full p-3 bg-slate-900 border border-white/10 rounded" placeholder="e.g. Urgent Requirement: Senior HPLC Specialist" value={broadcastForm.subject} onChange={e => setBroadcastForm({...broadcastForm, subject: e.target.value})} required />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Broadcast Type</label>
                                        <select className="w-full p-3 bg-slate-900 border border-white/10 rounded" value={broadcastForm.type} onChange={e => setBroadcastForm({...broadcastForm, type: e.target.value})}>
                                            <option value="ANNOUNCEMENT">Announcement</option>
                                            <option value="JOB_ALERT">Job Advert</option>
                                            <option value="URGENT">Urgent Alert</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Target Specialty</label>
                                        <select className="w-full p-3 bg-slate-900 border border-white/10 rounded" value={broadcastForm.target_specialty} onChange={e => setBroadcastForm({...broadcastForm, target_specialty: e.target.value})}>
                                            <option value="ALL">All Professionals</option>
                                            <option value="Microbiology">Microbiology</option>
                                            <option value="Analytical Chemistry">Analytical Chemistry</option>
                                            <option value="HPLC Specialist">HPLC Specialist</option>
                                            <option value="QA Management">QA Management</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Broadcast Content</label>
                                    <textarea className="w-full p-3 bg-slate-900 border border-white/10 rounded" rows={5} placeholder="Write your message or job description here..." value={broadcastForm.content} onChange={e => setBroadcastForm({...broadcastForm, content: e.target.value})} required />
                                </div>
                                <button type="submit" disabled={sendingBroadcast} className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                    {sendingBroadcast ? "Pushing to Network..." : "🚀 Push Global Broadcast"}
                                </button>
                            </form>

                            {/* Live Preview */}
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">Live Professional Preview</label>
                                <div className="glass-panel border-l-4 flex-1 bg-white/[0.02] border-blue-500/20 opacity-80 pointer-events-none overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <span className="text-6xl font-bold italic tracking-tighter">PREVIEW</span>
                                    </div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase mb-2 inline-block ${
                                                broadcastForm.type === 'URGENT' ? 'bg-red-500/10 text-red-400' : 
                                                broadcastForm.type === 'JOB_ALERT' ? 'bg-purple-500/10 text-purple-400' : 
                                                'bg-blue-500/10 text-blue-400'
                                            }`}>
                                                {broadcastForm.type.replace('_', ' ')}
                                            </span>
                                            <h4 className="text-xl font-bold">{broadcastForm.subject || 'Broadcast Subject'}</h4>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500">2026-04-26</span>
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-6 min-h-[100px]">
                                        {broadcastForm.content || 'Your message content will appear here...'}
                                    </p>
                                    {broadcastForm.type === 'JOB_ALERT' && (
                                        <div className="mt-4 flex items-center justify-between opacity-50">
                                            <button className="bg-purple-600 text-white text-[10px] font-bold px-6 py-2 rounded-full">Apply for Position</button>
                                            <p className="text-[9px] text-slate-500 italic">Managed by QualiCore Authority</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-500">
                            Broadcast History & Pipeline
                        </h3>
                        <div className="glass-panel p-0 overflow-hidden">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Subject</th>
                                        <th>Applicants</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {broadcasts.map(bc => (
                                        <tr key={bc.id}>
                                            <td className="text-[10px] font-mono text-muted">{new Date(bc.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <span className={`pill ${bc.type === 'JOB_ALERT' ? 'pill-review' : 'pill-active'}`}>{bc.type}</span>
                                            </td>
                                            <td className="font-bold text-slate-300">{bc.subject}</td>
                                            <td>
                                                <span className="font-bold text-blue-400">{bc.app_count}</span>
                                            </td>
                                            <td>
                                                {bc.type === 'JOB_ALERT' && (
                                                    <button onClick={() => viewApplicants(bc.id)} className="text-blue-400 text-xs font-bold hover:underline">View Pipeline</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            )}

            {/* TALENT REQUISITIONS TAB */}
            {activeTab === 'talent' && (
                <div className="glass-panel animate-slide-in">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">Global Talent Acquisition Pipeline</h3>
                        <span className="badge badge-secondary">HR Intelligence</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Urgency</th>
                                    <th>Laboratory</th>
                                    <th>Position / Dept</th>
                                    <th>Sourcing Details</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requisitions.map(req => (
                                    <tr key={req.id}>
                                        <td>
                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${
                                                req.urgency === 'Critical' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                                                req.urgency === 'High' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' : 'bg-slate-500/20 text-slate-400'
                                            }`}>
                                                {req.urgency}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="font-bold">{req.lab_name}</div>
                                            <div className="text-[10px] text-muted uppercase">{req.requester_email}</div>
                                        </td>
                                        <td>
                                            <div className="font-bold text-blue-400">{req.job_title}</div>
                                            <div className="text-[10px] text-slate-500">{req.department} · {req.position_type}</div>
                                        </td>
                                        <td className="max-w-xs">
                                            <div className="text-xs text-slate-300 italic mb-1">"{req.required_competencies}"</div>
                                            <div className="text-[10px] font-bold text-slate-500">Budget: {req.salary_range}</div>
                                        </td>
                                        <td>
                                            <span className={`pill text-[10px] ${
                                                req.status === 'APPROVED' ? 'pill-paid' : 
                                                req.status === 'SOURCING' ? 'bg-purple-500/20 text-purple-400' : 'pill-review'
                                            }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                {req.status === 'PENDING_ADMIN_REVIEW' && (
                                                    <button onClick={() => handleRespondRequisition(req.id, 'APPROVED')} className="btn-sm btn-primary py-1">Approve</button>
                                                )}
                                                {req.status === 'APPROVED' && (
                                                    <button onClick={() => handleRespondRequisition(req.id, 'SOURCING')} className="btn-sm bg-purple-600 text-white py-1">Start Sourcing</button>
                                                )}
                                                <button onClick={() => handleRespondRequisition(req.id, 'REJECTED')} className="btn-sm btn-danger py-1">Reject</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {requisitions.length === 0 && (
                                    <tr><td colSpan="6" className="text-center py-10 text-muted italic">No talent requisitions in the pipeline.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* REGISTRY TAB */}
            {activeTab === 'entities' && (
                <div className="animate-slide-up">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">Global Technical Registry</h3>
                        <div className="flex gap-2">
                            <span className="badge badge-primary">Laboratories: {entities.filter(e => e.type === 'lab').length}</span>
                            <span className="badge bg-slate-700 text-white">Clients: {entities.filter(e => e.type === 'client').length}</span>
                        </div>
                    </div>
                    <div className="glass-panel p-0 overflow-hidden">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Entity</th>
                                    <th>Type</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entities.map(entity => (
                                    <tr key={`${entity.type}-${entity.id}`}>
                                        <td>
                                            <div className="font-bold">{entity.company_name || entity.name}</div>
                                            <div className="text-[10px] text-muted uppercase">{entity.email}</div>
                                        </td>
                                        <td>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${entity.type === 'lab' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'}`}>
                                                {entity.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="text-xs text-slate-400">{entity.location || entity.city}</td>
                                        <td>
                                            <span className={`pill ${
                                                entity.verification_status === 'VERIFIED' ? 'pill-paid' : 
                                                entity.verification_status === 'TRIAL_ACTIVE' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                                entity.verification_status === 'PENDING_REVIEW' ? 'pill-review' : 'pill-danger'
                                            }`}>
                                                {entity.verification_status}
                                            </span>
                                        </td>
                                        <td className="text-[10px] text-muted">{new Date(entity.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => {
                                                        setVerifyingEntity(entity);
                                                        setVForm({ status: entity.verification_status, notes: entity.admin_notes || "" });
                                                    }}
                                                    className="text-blue-400 text-xs font-bold hover:underline"
                                                >
                                                    Review & Verify
                                                </button>
                                                <button 
                                                    className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/20"
                                                    title="Perspective Shift"
                                                    onClick={() => handleImpersonate(entity.user_id)}
                                                >
                                                    👁️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PULSE TAB */}
            {activeTab === 'pulse' && stats && (
                <div className="animate-slide-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="glass-panel border-l-4 border-blue-500">
                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Network GDP</div>
                            <div className="text-3xl font-bold">${stats.total_revenue.toLocaleString()}</div>
                        </div>
                        <div className="glass-panel border-l-4 border-purple-500">
                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Expert Coverage</div>
                            <div className="text-3xl font-bold">{professionals.length}</div>
                            <div className="text-[10px] text-green-400 mt-2">Certified Analytical Professionals</div>
                        </div>
                        <div className="glass-panel border-l-4 border-orange-500">
                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Quality Hot Spots</div>
                            <div className="text-3xl font-bold">{stats.quality_events}</div>
                        </div>
                        <div className="glass-panel border-l-4 border-green-500">
                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Active Partnerships</div>
                            <div className="text-3xl font-bold">{stats.active_partnerships}</div>
                        </div>
                        <div className="glass-panel border-l-4 border-indigo-500 bg-indigo-500/[0.03] cursor-pointer hover:bg-indigo-500/10 transition-all" onClick={() => window.location.href='/admin/registry'}>
                            <div className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Consumer Trust Registry</div>
                            <div className="text-2xl font-bold">Manage Public Layer →</div>
                            <div className="text-[10px] text-white/40 mt-2">Curation, Badges, & Publishing</div>
                        </div>
                    </div>
                </div>
            )}
          </>
      )}

      {/* ENTITY VERIFICATION MODAL */}
      {verifyingEntity && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex-center z-[200] p-6">
            <div className="glass-panel w-full max-w-lg animate-scale-up border-t-4 border-blue-500">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold">Network Accreditation Review</h3>
                        <p className="text-xs text-muted">Entity: <strong>{verifyingEntity.company_name || verifyingEntity.name}</strong> ({verifyingEntity.type})</p>
                    </div>
                    <button onClick={() => setVerifyingEntity(null)} className="text-slate-500 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleVerifyEntity} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Accreditation Decision</label>
                        <select 
                            className="w-full p-4 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500"
                            value={vForm.status}
                            onChange={e => setVForm({...vForm, status: e.target.value})}
                        >
                            <option value="PENDING_REVIEW">🕒 Pending Review</option>
                             <option value="TRIAL_ACTIVE">🚀 Approve for 30-Day Trial (Network Access)</option>
                             <option value="VERIFIED">✅ Full Verified Accreditation</option>
                             <option value="INFO_REQUESTED">❓ Request More Information</option>
                             <option value="REJECTED">❌ Reject Application</option>
                             <option value="SUSPENDED">🚫 Suspend Access</option>
                         </select>
                         <p className="text-[10px] text-slate-500 mt-2 italic">
                             Trial mode allows the entity full platform access for 30 days to demonstrate value before formal subscription.
                         </p>
                     </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Administrative Notes / Feedback</label>
                        <textarea 
                            className="w-full p-4 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 min-h-[120px]"
                            placeholder="Reason for decision, instructions for the user, or internal notes..."
                            value={vForm.notes}
                            onChange={e => setVForm({...vForm, notes: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={() => setVerifyingEntity(null)} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" className="btn-primary flex-1 bg-blue-600 border-none font-bold uppercase tracking-widest">
                            Update Registry Status
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* SOVEREIGN CERTIFICATION MODAL */}
      {reviewingPro && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="glass-panel w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-6 p-2">
                <div>
                    <h2 className="text-2xl font-bold">Expert Certification Authority</h2>
                    <p className="text-muted">Reviewing Dossier for: <span className="text-blue-400">{reviewingPro.full_name}</span></p>
                </div>
                <button className="text-2xl" onClick={() => setReviewingPro(null)}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-8 p-2">
                <div className="lg:col-span-2 space-y-8">
                    <section>
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest">Scientific Biography</h4>
                        <div className="bg-white/5 p-4 rounded border border-white/10 italic text-sm text-slate-300">
                            "{reviewingPro.bio}"
                        </div>
                    </section>

                    <section>
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest">Uploaded Scientific Credentials (Dossier)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {reviewingPro.documents?.map(doc => (
                                <div key={doc.id} className="bg-slate-900/50 p-4 rounded border border-white/5 flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] font-bold text-blue-400 uppercase">{doc.document_type}</div>
                                        <div className="text-xs font-medium text-white truncate max-w-[150px]">{doc.file_name}</div>
                                    </div>
                                    <a 
                                        href={doc.file_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded hover:bg-blue-500/20 transition-all"
                                    >
                                        Inspect File
                                    </a>
                                </div>
                            ))}
                            {(!reviewingPro.documents || reviewingPro.documents.length === 0) && (
                                <div className="col-span-2 text-center py-6 text-amber-500 bg-amber-500/5 rounded border border-amber-500/20 text-xs font-bold uppercase tracking-widest">
                                    ⚠️ No Documents Uploaded
                                </div>
                            )}
                        </div>
                    </section>

                    <section>
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest">Technical Work History</h4>
                        <div className="space-y-4">
                            {reviewingPro.experience.map(exp => (
                                <div key={exp.id} className="bg-white/5 p-4 rounded border border-white/10">
                                    <div className="flex justify-between font-bold">
                                        <span className="text-blue-400">{exp.role_title}</span>
                                        <span className="text-xs text-slate-500 uppercase">{exp.start_date} — {exp.is_current ? 'Present' : exp.end_date}</span>
                                    </div>
                                    <div className="text-xs font-bold mb-2">{exp.organization_name}</div>
                                    <p className="text-xs text-slate-400">{exp.responsibilities}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest">Verified Technical Matrix</h4>
                        <div className="grid grid-cols-2 gap-4">
                            {reviewingPro.skills.map(skill => (
                                <div key={skill.id} className="bg-white/5 p-3 rounded border border-white/10 flex justify-between items-center">
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
                    <form onSubmit={submitProCertification} className="glass-panel border-l-4 border-primary">
                        <h4 className="text-xs font-bold uppercase mb-6 tracking-widest">Authority Decision</h4>
                        
                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Certification Tier</label>
                            <select className="w-full p-2 bg-slate-900 border border-white/10 rounded" value={proDecision.tier} onChange={e => setProDecision({...proDecision, tier: e.target.value})}>
                                <option value="ANALYST">CERTIFIED ANALYST</option>
                                <option value="EXPERT">CERTIFIED EXPERT</option>
                                <option value="MASTER">CERTIFIED MASTER / QA AUTHORITY</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Final Decision</label>
                            <select className="w-full p-2 bg-slate-900 border border-white/10 rounded" value={proDecision.status} onChange={e => setProDecision({...proDecision, status: e.target.value})}>
                                <option value="VERIFIED">✅ GRANT CERTIFICATION</option>
                                <option value="PENDING">🕒 REQUIRE REVISION / MORE INFO</option>
                                <option value="REJECTED">❌ REJECT DOSSIER</option>
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Administrator Feedback</label>
                            <textarea className="w-full p-2 bg-slate-900 border border-white/10 rounded text-xs" rows={4} placeholder="Feedback for the professional..." value={proDecision.notes} onChange={e => setProDecision({...proDecision, notes: e.target.value})} />
                        </div>

                        <button type="submit" className="btn-primary w-full py-4">Issue Authority Decision</button>
                    </form>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* APPLICANT VIEWER MODAL */}
      {activeBroadcastApps && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex-center z-[100] p-6">
              <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                            <h3 className="text-2xl font-bold">Talent Pipeline Review</h3>
                            <button onClick={() => setActiveBroadcastApps(null)} className="text-slate-500 hover:text-white">✕ Close</button>
                        </div>

                  <div className="space-y-4">
                      {activeBroadcastApps.length === 0 ? (
                          <p className="text-center py-10 text-muted italic">No applications received for this alert yet.</p>
                      ) : (
                          activeBroadcastApps.map(app => (
                              <div key={app.id} className="glass-panel bg-white/5 border-l-4 border-purple-500 flex justify-between items-center">
                                  <div>
                                      <h4 className="font-bold text-blue-400 text-lg">{app.full_name}</h4>
                                      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">{app.specialty} • {app.experience_years}y Exp</p>
                                      <div className="mt-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                app.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' :
                                                app.status === 'PLACED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                            }`}>
                                                {app.status}
                                            </span>
                                        </div>
                                  </div>
                                  <div className="flex gap-3">
                                      {app.status === 'PENDING' && (
                                            <>
                                                <button onClick={() => updateAppStatus(app.id, 'PLACED')} className="btn-sm btn-success">Hire/Place</button>
                                                <button 
                                                    onClick={() => setMessagingTarget({ user_id: app.user_id, name: app.full_name, type: 'Applicant' })}
                                                    className="btn-sm btn-primary bg-blue-600 border-none"
                                                >
                                                    Communicate
                                                </button>
                                                <button onClick={() => updateAppStatus(app.id, 'REJECTED')} className="btn-sm btn-danger">Decline</button>
                                            </>
                                        )}
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}
            {/* DIRECT MESSAGING MODAL */}
            {messagingTarget && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex-center z-[200] p-6">
                    <div className="glass-panel w-full max-w-lg animate-scale-up border-t-4 border-blue-500">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold">Direct Administrative Update</h3>
                                <p className="text-xs text-muted">Targeting <strong>{messagingTarget.name}</strong> ({messagingTarget.type})</p>
                            </div>
                            <button onClick={() => setMessagingTarget(null)} className="text-slate-500 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Message Content (Portal Notification)</label>
                                <textarea 
                                    className="w-full p-4 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 min-h-[150px]"
                                    placeholder="Enter your administrative update or direct message here..."
                                    value={messageText}
                                    onChange={e => setMessageText(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="flex items-center gap-4 py-4 border-y border-white/5">
                                <div className="flex-1">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase">External Channels</div>
                                    <div className="flex gap-4 mt-2">
                                        <a href={`mailto:${entities.find(e => e.user_id === messagingTarget.user_id)?.email || professionals.find(p => p.user_id === messagingTarget.user_id)?.email}`} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                                            ✉️ Send Official Email
                                        </a>
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            📞 {entities.find(e => e.user_id === messagingTarget.user_id)?.phone || 'No phone recorded'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setMessagingTarget(null)} className="btn-secondary flex-1">Cancel</button>
                                <button 
                                    onClick={async () => {
                                        setSendingMessage(true);
                                        try {
                                            await API.post("/api/admin/notify-user", { user_id: messagingTarget.user_id, message: messageText });
                                            setMessagingTarget(null);
                                            setMessageText("");
                                            alert("Message transmitted successfully via the portal.");
                                        } finally { setSendingMessage(false); }
                                    }}
                                    disabled={sendingMessage || !messageText}
                                    className="btn-primary flex-1 bg-blue-600 border-none"
                                >
                                    {sendingMessage ? "Transmitting..." : "Transmit Update"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
    </div>
  );
}
