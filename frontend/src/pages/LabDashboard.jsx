import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import PaymentGateway from "../components/PaymentGateway";
import GuidancePanel from "../components/GuidancePanel";

const STATUS_TABS = [
  { key: 'ALL',              label: 'Global View' },
  { key: 'pending',          label: 'Client Intake' },
  { key: 'TECHNICAL_REVIEW', label: 'Technical Review' },
  { key: 'DISPATCHED',       label: 'In Transit' },
  { key: 'RECEIVED',         label: 'Arrived at Lab' },
  { key: 'RELEASED',         label: 'Released to Lab' },
  { key: 'in_progress',      label: 'Testing Phase' },
  { key: 'REVIEW_PENDING',   label: 'Quality Review' },
  { key: 'completed',        label: 'Finalized' },
];

const LAB_TABS = [
    { key: 'SAMPLES', label: 'Sample Lifecycle' },
    { key: 'TREASURY', label: 'Treasury Settings' },
    { key: 'LEDGER', label: 'Ledger' },
    { key: 'ANALYTICS', label: 'Intelligence' }
];

const statusColors = {
  pending:          "status-pending",
  TECHNICAL_REVIEW: "bg-blue-500/20 text-blue-400",
  DISPATCHED:       "bg-purple-500/20 text-purple-400",
  RECEIVED:         "bg-orange-500/20 text-orange-400",
  RELEASED:         "bg-indigo-500/20 text-indigo-400",
  REVIEW_PENDING:   "bg-orange-100 text-orange-700",
  accepted:         "status-accepted",
  rejected:         "status-rejected",
  in_progress:      "status-in_progress",
  completed:        "status-completed"
};

export default function LabDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [generatingReport, setGeneratingReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [labTab, setLabTab] = useState("SAMPLES");
  const [treasury, setTreasury] = useState(null);
  const [assigningRequest, setAssigningRequest] = useState(null);
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [tracingRequest, setTracingRequest] = useState(null);
  const [traceData, setTraceData] = useState(null);
  const [dispatchingRequest, setDispatchingRequest] = useState(null);
  const [dispatchForm, setDispatchForm] = useState({ tracking_number: "", notes: "" });
  const [team, setTeam] = useState([]);
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [selectedTechId, setSelectedTechId] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const fetchMembership = async () => {
        try {
            const res = await API.get("/api/membership/status");
            setMembershipStatus(res.data.data);
            if (user.role === 'lab') {
                const tresRes = await API.get("/api/treasury/lab");
                setTreasury(tresRes.data.data);
            }
        } catch (e) {}
    };
    fetchMembership();
  }, []);
  const isClient = user.role === 'client';

  const fetchRequests = async () => {
    try {
      const endpoint = isClient ? "/api/requests/client" : "/api/requests/lab";
      const res = await API.get(endpoint);
      setRequests(res.data.data);
    } catch (err) {
      console.error("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (isClient) return;
    try {
      const res = await API.get("/api/analytics/lab");
      setAnalytics(res.data.data);
    } catch (err) {
      console.error("Failed to fetch lab analytics");
    }
  };

  const fetchTeam = async () => {
    if (user.role !== 'lab') return;
    try {
      const res = await API.get("/api/lab/team");
      setTeam(res.data.data.filter(u => u.sub_role === 'LAB_TECHNICIAN'));
    } catch (e) {}
  };

  useEffect(() => { 
    fetchRequests(); 
    fetchAnalytics();
    fetchTeam();
  }, []);

  const handleResponse = async (id, status) => {
    try {
      await API.put(`/api/requests/${id}/respond`, { status });
      setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) {
      alert("Action failed");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/api/requests/${id}/status`, { status });
      setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) {
      alert("Status update failed");
    }
  };

  const handleAssign = async () => {
    if (!selectedTechId) return alert("Select a technician");
    try {
      await API.patch(`/api/requests/${assigningRequest.id}/assign`, {
        technician_id: selectedTechId,
        notes: assignmentNotes
      });
      alert(`Order #${assigningRequest.id} released to technical bench.`);
      setAssigningRequest(null);
      setSelectedTechId("");
      setAssignmentNotes("");
      fetchRequests();
    } catch (err) { alert("Assignment failed"); }
  };

  const openReviewModal = async (req) => {
    setReviewingRequest(req);
    try {
        const res = await API.get(`/api/requests/${req.id}/review-summary`);
        setReviewData(res.data.data);
    } catch (e) { alert("Failed to load review summary"); }
  };

  const handleApproveWorkOrder = async () => {
    if (!confirm("Final Technical Approval: Are you sure you want to approve all results and close this work order? This will enable CoA generation.")) return;
    try {
        await API.patch(`/api/requests/${reviewingRequest.id}/approve-results`);
        alert("✅ Work Order Approved. You can now generate the Certificate of Analysis.");
        setReviewingRequest(null);
        setReviewData(null);
        fetchRequests();
    } catch (err) { alert(err.response?.data?.message || "Approval failed"); }
  };

  const handleSubmitReview = async (id) => {
      if (!confirm("Submit for Final Review? This will notify the Lab Manager that technical work is complete.")) return;
      try {
          await API.patch(`/api/requests/${id}/submit-review`);
          alert("Work order submitted for managerial oversight.");
          fetchRequests();
      } catch (err) { alert("Submission failed"); }
  };

  const openTraceModal = async (req) => {
      setTracingRequest(req);
      try {
          const res = await API.get(`/api/requests/${req.id}/trace`);
          setTraceData(res.data.data);
      } catch (e) { alert("Failed to load traceability journey"); }
  };

  const handleDispatch = async (e) => {
      e.preventDefault();
      try {
          await API.post(`/api/requests/${dispatchingRequest.id}/dispatch`, dispatchForm);
          alert("Order marked as DISPATCHED. Lab has been notified.");
          setDispatchingRequest(null);
          fetchRequests();
      } catch (err) { alert("Dispatch failed"); }
  };

  const handleReceive = async (id) => {
      if (!confirm("Confirm Physical Receipt: Are you sure the sample box has arrived at the lab desk?")) return;
      try {
          await API.post(`/api/requests/${id}/receive`);
          alert("Sample marked as RECEIVED. Manager can now assign it to a technician.");
          fetchRequests();
      } catch (err) { alert("Receipt confirmation failed"); }
  };

  const handlePrintLabel = async (id) => {
      try {
          const res = await API.get(`/api/requests/${id}/dispatch-label`);
          window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${res.data.data.file_url}`, '_blank');
      } catch (err) { alert("Label generation failed"); }
  };

  const handleGenerateReport = async (requestId) => {
    const pin = prompt("🔐 AUTHENTICATION REQUIRED: Enter your Technical Signature PIN to authorize report release:");
    if (!pin) return;

    setGeneratingReport(requestId);
    try {
      const res = await API.post("/api/reports/generate", { test_request_id: requestId, signature_pin: pin });
      const { report_number } = res.data.data;
      alert(`✅ Report ${report_number} generated and digitally signed successfully!\n\nThe client has been notified and the certificate is now legally verifiable.`);
      fetchRequests();
    } catch (err) {
      alert(`Report generation failed:\n${err.response?.data?.error || "Unauthorized or PIN incorrect"}`);
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleDownloadReport = async (reportId) => {
    try {
      const res = await API.get(`/api/reports/${reportId}/download`);
      const { file_url } = res.data.data;
      window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${file_url}`, '_blank');
    } catch (err) {
      alert(err.response?.data?.message || "Download failed");
    }
  };

  // Filtered requests
  const filtered = activeTab === 'ALL' ? requests : requests.filter(r => r.status === activeTab);

  // Summary stats
  const counts = STATUS_TABS.slice(1).reduce((acc, t) => {
    acc[t.key] = requests.filter(r => r.status === t.key).length;
    return acc;
  }, {});

  const pageTitle = isClient ? "My Test Requests" : (user.sub_role === 'REGISTRAR' ? "Sample Accessioning & Review" : (user.sub_role === 'TECHNICIAN' ? "Laboratory Bench Queue" : "Laboratory Intelligence"));
  const pageDesc  = isClient
    ? "Track the full lifecycle of your laboratory test orders."
    : (user.sub_role === 'REGISTRAR' ? "Review incoming client requests and release them to the technical bench." : "Manage your active test workload and enter technical results.");

  if (user.verification_status === 'PENDING_REVIEW') {
    return (
      <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-8">
        <div className="glass-panel max-w-2xl text-center p-16 border-t-4 border-blue-500 animate-fade-in shadow-[0_0_50px_rgba(37,99,235,0.1)]">
          <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse shadow-[0_0_20px_rgba(37,99,235,0.2)]">
            <span className="text-5xl">🛡️</span>
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tighter text-white">Institutional Review in Progress</h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-10">
            The QualiCore Sovereign Authority is currently auditing your laboratory dossier. 
            Your institutional access will be fully activated once our specialists have verified your 
            technical capabilities and ISO compliance credentials.
          </p>
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl mb-10 text-left">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dossier Submission</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Completed</span>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Authority Forensic Audit</span>
                </div>
                <span className="text-[10px] font-bold text-blue-400 uppercase">Active</span>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white">
                Check Status 🛰️
            </button>
            <button onClick={() => localStorage.removeItem('token')} className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">
                Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-8 bg-slate-950 min-h-screen text-slate-200">
      {/* ─── SCIENTIFIC COMMAND HEADER ─── */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
            <h1 className="text-2xl font-black tracking-tighter uppercase text-white m-0">
              Laboratory <span className="text-blue-500">Intelligence</span> Nexus
            </h1>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
            Institutional Oversight · ISO-17025 Compliance Engine · {user.sub_role?.replace('_', ' ') || 'Director'}
          </p>
        </div>

        <div className="flex gap-3">
            {!user.sub_role && (
                <Link to="/treasury-settings" className="px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all no-underline flex items-center gap-2">
                    🏦 Treasury
                </Link>
            )}
            {(user.sub_role === 'HR_MANAGER' || user.sub_role === 'LAB_MANAGER') && (
                <Link to="/hr-dashboard" className="px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all no-underline flex items-center gap-2">
                    💼 Talent
                </Link>
            )}
            <div className="flex bg-slate-900 p-1 rounded-lg border border-white/5">
                {LAB_TABS.map(tab => (
                    <button 
                        key={tab.key}
                        onClick={() => setLabTab(tab.key)}
                        className={`px-4 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all ${labTab === tab.key ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <GuidancePanel role={user.role} subRole={user.sub_role} />

      {/* ─── OPERATIONAL INTELLIGENCE QUADRANTS ─── */}
      {!isClient && analytics && labTab === "SAMPLES" && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="glass-panel p-6 border-l-4 border-blue-500 bg-blue-500/[0.02]">
            <div className="text-[9px] uppercase font-black text-slate-500 mb-3 tracking-widest">Revenue Velocity</div>
            <div className="text-3xl font-black text-white tabular-nums">${analytics.revenue.total_invoiced.toLocaleString()}</div>
            <div className="mt-4 flex items-center gap-2">
                <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${(analytics.revenue.collected / analytics.revenue.total_invoiced) * 100}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-green-500">{Math.round((analytics.revenue.collected / analytics.revenue.total_invoiced) * 100)}% Collected</span>
            </div>
          </div>

          <div className="glass-panel p-6 border-l-4 border-amber-500 bg-amber-500/[0.02]">
            <div className="text-[9px] uppercase font-black text-slate-500 mb-3 tracking-widest">SLA Performance</div>
            <div className="text-3xl font-black text-white tabular-nums">{analytics.tat_days} <span className="text-sm font-bold text-slate-500">Days Avg</span></div>
            <div className="mt-4 text-[10px] font-bold text-amber-500 uppercase">Within Institutional Bounds</div>
          </div>

          <div className="glass-panel p-6 border-l-4 border-emerald-500 bg-emerald-500/[0.02]">
            <div className="text-[9px] uppercase font-black text-slate-500 mb-3 tracking-widest">Operational Load</div>
            <div className="text-3xl font-black text-white tabular-nums">{analytics.active_samples} <span className="text-sm font-bold text-slate-500">Samples</span></div>
            <div className="mt-4 text-[10px] font-bold text-emerald-500 uppercase">Bench Capacity: 78%</div>
          </div>

          <div className="glass-panel p-6 border-l-4 border-red-500 bg-red-500/[0.02] cursor-pointer hover:bg-red-500/5 transition-all" onClick={() => navigate('/internal-capa')}>
            <div className="text-[9px] uppercase font-black text-slate-500 mb-3 tracking-widest">Vigilance Signal</div>
            <div className="text-3xl font-black text-white tabular-nums">{analytics.quality_events} <span className="text-sm font-bold text-slate-500">Events</span></div>
            <div className="mt-4 text-[10px] font-bold text-red-500 uppercase">→ CAPA Command Center</div>
          </div>
        </div>

        {/* ─── ISO 17025 QUICK ACTIONS ─── */}
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => navigate('/internal-validation')} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:bg-emerald-500/20 transition-all">
            🛡️ Validation Queue
          </button>
          <button onClick={() => navigate('/internal-capa')} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-500/20 transition-all">
            🚨 CAPA Center
          </button>
          <button onClick={() => navigate('/control-chart')} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] font-black text-amber-400 uppercase tracking-widest hover:bg-amber-500/20 transition-all">
            📈 Control Chart
          </button>
          <button onClick={() => navigate('/risk-register')} className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[10px] font-black text-purple-400 uppercase tracking-widest hover:bg-purple-500/20 transition-all">
            ⚠️ Risk Register
          </button>
          <button onClick={() => navigate('/proficiency-testing')} className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-lg text-[10px] font-black text-pink-400 uppercase tracking-widest hover:bg-pink-500/20 transition-all">
            🎯 Proficiency Testing
          </button>
          <button onClick={() => navigate('/document-control')} className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-[10px] font-black text-sky-400 uppercase tracking-widest hover:bg-sky-500/20 transition-all">
            📁 Document Control
          </button>
          <button onClick={() => navigate('/competency-assessment')} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:bg-indigo-500/20 transition-all">
            🎓 Staff Competency
          </button>
          <button onClick={() => navigate('/methods')} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-black text-blue-400 uppercase tracking-widest hover:bg-blue-500/20 transition-all">
            📋 Method Registry
          </button>
          <button onClick={() => navigate('/equipment')} className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-all">
            ⚖️ Equipment & Calibration
          </button>
        </div>
        </>
      )}

      {/* ─── STATUS VIGILANCE TABS ─── */}
      <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                    activeTab === tab.key 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                    : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                <span className={`ml-3 px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.key ? 'bg-white/20' : 'bg-slate-800'}`}>
                  {tab.key === 'ALL' ? requests.length : counts[tab.key] || 0}
                </span>
              </button>
            ))}
          </div>

          {!isClient && (
            <Link to="/direct-intake" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest no-underline transition-all shadow-xl">
                📦 Direct Intake
            </Link>
          )}
      </div>

      {/* ─── TRIAL & MEMBERSHIP VIGILANCE ─── */}
      {membershipStatus?.verification_status === 'TRIAL_ACTIVE' && (
        <div className="glass-panel border-indigo-500/50 bg-indigo-500/5 p-6 mb-8 flex justify-between items-center animate-slide-up border-l-4">
            <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 text-xl font-black border border-indigo-500/20 tabular-nums">
                    {Math.max(0, 30 - Math.floor((new Date() - new Date(membershipStatus.trial_started_at)) / (1000 * 60 * 60 * 24)))}
                </div>
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Network Accreditation Trial Active</h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight">
                        <strong>{Math.max(0, 30 - Math.floor((new Date() - new Date(membershipStatus.trial_started_at)) / (1000 * 60 * 60 * 24)))} Days Remaining</strong> · Maintain technical standards to secure full verification.
                    </p>
                </div>
            </div>
            <div className="badge bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-black uppercase px-3 py-1">Trial Authority</div>
        </div>
      )}

      {(membershipStatus?.subscription_status === 'AWAITING_PAYMENT' || 
        (membershipStatus?.verification_status === 'TRIAL_ACTIVE' && 
         (30 - Math.floor((new Date() - new Date(membershipStatus.trial_started_at)) / (1000 * 60 * 60 * 24))) <= 5)) && (
        <div className="glass-panel border-amber-500/30 bg-amber-500/[0.02] p-8 mb-10 animate-pulse-slow border-t-4">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tighter text-amber-500">SaaS Activation Protocol</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Secure Verified Laboratory Status · Unlock Enterprise Market Access
                    </p>
                </div>
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">Action Required</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { id: 'BASIC', name: 'Basic Listing', price: 299, features: ['Verified Lab Badge', 'Standard Search', 'Email Alerts'] },
                    { id: 'PROFESSIONAL', name: 'Technical Bench', price: 499, features: ['Priority Search', 'RFQ Access', 'Digital CoA Signatures'] },
                    { id: 'ENTERPRISE', name: 'Institutional Growth', price: 999, features: ['Unlimited Staff', 'Quality Analytics', 'API Access'] }
                ].map(plan => (
                    <div key={plan.id} className="bg-slate-900/50 p-6 rounded-xl border border-white/5 hover:border-amber-500/30 transition-all group relative overflow-hidden">
                        <div className="mb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{plan.name}</h4>
                            <div className="text-3xl font-black text-white mt-2 tabular-nums">${plan.price}<span className="text-xs text-slate-500 font-normal tracking-normal">/yr</span></div>
                        </div>
                        <ul className="space-y-2 mb-8">
                            {plan.features.map(f => (
                                <li key={f} className="text-[9px] text-slate-500 font-bold uppercase flex items-center gap-2">
                                    <span className="text-amber-500/50">→</span> {f}
                                </li>
                            ))}
                        </ul>
                        <button 
                            onClick={() => setPayTarget({ amount: plan.price, requestId: 0, paymentType: 'SUBSCRIPTION', metadata: { tier: plan.id } })}
                            className="w-full py-3 bg-amber-600/10 hover:bg-amber-600 text-amber-500 hover:text-white border border-amber-500/30 font-black text-[10px] uppercase tracking-widest rounded transition-all"
                        >
                            Select Plan
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* ─── TECHNICAL TABS CONTENT ─── */}
      {labTab === "TREASURY" && treasury && (
        <div className="glass-panel animate-slide-in p-8 border-t-4 border-blue-600">
            <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black uppercase tracking-tighter">Financial Sovereignty <span className="text-blue-500">Config</span></h3>
                <span className="text-[9px] font-black uppercase px-3 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">Verified Ledger Connection</span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="space-y-8">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Mobile Money (Direct STK)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block">Shortcode</label>
                                <input className="w-full p-4 bg-slate-900 border border-white/5 rounded-lg outline-none focus:border-blue-500 font-mono text-sm text-white" value={treasury.mpesa_shortcode || ""} onChange={e => setTreasury({ ...treasury, mpesa_shortcode: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block">Passkey</label>
                                <input type="password" className="w-full p-4 bg-slate-900 border border-white/5 rounded-lg outline-none focus:border-blue-500 font-mono text-sm text-white" value={treasury.mpesa_passkey || ""} onChange={e => setTreasury({ ...treasury, mpesa_passkey: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">B2B Institutional Banking</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block">Institution Name</label>
                                <input className="w-full p-4 bg-slate-900 border border-white/5 rounded-lg outline-none focus:border-blue-500 text-sm text-white" value={treasury.bank_name || ""} onChange={e => setTreasury({ ...treasury, bank_name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block">Account Number</label>
                                    <input className="w-full p-4 bg-slate-900 border border-white/5 rounded-lg outline-none focus:border-blue-500 font-mono text-sm text-white" value={treasury.bank_account_number || ""} onChange={e => setTreasury({ ...treasury, bank_account_number: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block">SWIFT/BIC Code</label>
                                    <input className="w-full p-4 bg-slate-900 border border-white/5 rounded-lg outline-none focus:border-blue-500 font-mono text-sm text-white" value={treasury.bank_swift_code || ""} onChange={e => setTreasury({ ...treasury, bank_swift_code: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={async () => { await API.put("/api/treasury/lab", treasury); alert("Sovereign Treasury Profile Updated"); }} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                        Save Technical Profile
                    </button>
                </div>

                <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-10 flex flex-col">
                    <div className="w-12 h-12 bg-blue-600/10 text-blue-500 rounded-xl flex items-center justify-center text-2xl mb-6 border border-blue-500/20">🏛️</div>
                    <h4 className="text-lg font-black uppercase tracking-tighter mb-4 text-white">Settlement Architecture</h4>
                    <p className="text-xs text-slate-500 leading-relaxed uppercase tracking-tight mb-8">
                        Configure direct financial channels for institutional settlements. Funds bypass intermediaries and are routed directly to your laboratory's sovereign accounts via the Daraja protocol and SWIFT-verified wire instructions.
                    </p>
                    <div className="mt-auto space-y-3">
                        <div className="flex items-center gap-3 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Real-time STK Push Active
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-blue-500 uppercase tracking-widest opacity-60">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            B2B Settlement Validated
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {labTab === "LEDGER" && (
          <div className="glass-panel animate-slide-in p-0 overflow-hidden border-t-4 border-indigo-600">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-lg font-black uppercase tracking-tighter">Settlement <span className="text-indigo-500">Ledger</span></h3>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scientific Revenue Audit</div>
              </div>
              <table className="data-table">
                  <thead>
                      <tr className="bg-slate-900/50">
                          <th className="text-[9px] uppercase tracking-widest text-slate-500 py-4">Transaction ID</th>
                          <th className="text-[9px] uppercase tracking-widest text-slate-500">Contractor</th>
                          <th className="text-[9px] uppercase tracking-widest text-slate-500">Service Description</th>
                          <th className="text-[9px] uppercase tracking-widest text-slate-500">Amount (USD)</th>
                          <th className="text-[9px] uppercase tracking-widest text-slate-500">Status</th>
                          <th className="text-[9px] uppercase tracking-widest text-slate-500">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {requests.filter(r => r.payment_id).map(r => (
                          <tr key={r.payment_id} className="hover:bg-white/[0.02] transition-all">
                              <td className="font-mono text-[10px] text-slate-500 py-4">TXN-{r.payment_id.toString().padStart(6, '0')}</td>
                              <td className="text-sm font-black text-white">{r.company_name}</td>
                              <td className="text-[11px] text-slate-400">{r.test_description}</td>
                              <td className="font-black text-blue-400 tabular-nums">${(r.quoted_price || 0).toLocaleString()}</td>
                              <td>
                                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${r.payment_status === 'PAID' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                      {r.payment_status}
                                  </span>
                              </td>
                              <td>
                                  {r.payment_status === 'PAID' && (
                                      <button onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/${r.payment_id}/receipt?token=${localStorage.getItem('token')}`, '_blank')} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black uppercase rounded transition-all">
                                          Receipt
                                      </button>
                                  )}
                              </td>
                          </tr>
                      ))}
                      {requests.filter(r => r.payment_id).length === 0 && (
                          <tr><td colSpan="6" className="text-center py-20 text-slate-600 italic text-sm uppercase tracking-widest">No financial settlements recorded</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      )}

      {labTab === "SAMPLES" && (
        <div className="glass-panel p-0 overflow-hidden border-t-4 border-blue-600 animate-slide-up">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/20">
                <h3 className="text-lg font-black uppercase tracking-tighter">Technical <span className="text-blue-500">Bench Queue</span></h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Active SLA
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> Critical Vigilance
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr className="bg-slate-900/50">
                      <th className="text-[9px] uppercase tracking-widest text-slate-500 py-4">Analytical ID</th>
                      <th className="text-[9px] uppercase tracking-widest text-slate-500">{isClient ? 'Laboratory Authority' : 'Corporate Partner'}</th>
                      <th className="text-[9px] uppercase tracking-widest text-slate-500">Scientific Description</th>
                      <th className="text-[9px] uppercase tracking-widest text-slate-500">Ingress Source</th>
                      <th className="text-[9px] uppercase tracking-widest text-slate-500">Timestamp</th>
                      <th className="text-[9px] uppercase tracking-widest text-slate-500">SLA Status</th>
                      <th className="text-[9px] uppercase tracking-widest text-slate-500">Report Hash</th>
                      <th className="text-[9px] uppercase tracking-widest text-slate-500">Governance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-20 text-slate-600 italic text-sm uppercase tracking-widest">
                          Operational Queue Empty
                        </td>
                      </tr>
                    ) : (
                      filtered.map(req => (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition-all">
                          <td className="font-mono text-[10px] text-slate-500 py-4">
                            <div className="text-blue-500 font-black">QR-{req.id.toString().padStart(6, '0')}</div>
                            {req.assigned_technician_email && (
                              <div className="text-[8px] text-slate-600 uppercase mt-1">Tech: {req.assigned_technician_email.split('@')[0]}</div>
                            )}
                          </td>
                          <td className="text-sm font-black text-white">{isClient ? req.lab_name : req.company_name}</td>
                          <td className="max-w-xs">
                            <div className="text-[11px] text-slate-300 font-medium leading-tight">{req.test_description}</div>
                            {req.assignment_notes && (
                              <div className="text-[9px] text-slate-500 italic mt-2 bg-black/20 p-2 rounded border border-white/5">
                                📑 {req.assignment_notes}
                              </div>
                            )}
                          </td>
                          <td>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${req.request_source === 'WALK_IN' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                  {req.request_source || 'CLIENT'}
                              </span>
                          </td>
                          <td className="text-[10px] font-mono text-slate-500">{new Date(req.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${statusColors[req.status] || 'bg-slate-800 text-slate-400'}`}>
                                    {req.status.replace('_', ' ')}
                                </span>
                                <button className="opacity-40 hover:opacity-100 transition-opacity" onClick={() => openTraceModal(req)}>🛣️</button>
                            </div>
                          </td>
                          <td>
                            {req.report_id ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-mono font-black text-emerald-500">{req.report_number}</span>
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${req.report_status === 'delivered' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>{req.report_status}</span>
                              </div>
                            ) : <span className="text-[10px] text-slate-700 tracking-widest uppercase font-black">---</span>}
                          </td>
                          <td>
                            <div className="flex gap-2">
                                {!isClient && (
                                  <>
                                    {user.sub_role === 'REGISTRAR' && req.status === 'pending' && (
                                      <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase rounded shadow-lg" onClick={() => handleResponse(req.id, 'TECHNICAL_REVIEW')}>Accept</button>
                                    )}
                                    {user.sub_role === 'LAB_MANAGER' && (req.status === 'TECHNICAL_REVIEW' || req.status === 'RECEIVED') && (
                                      <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase rounded shadow-lg" onClick={() => setAssigningRequest(req)}>Assign</button>
                                    )}
                                    {user.sub_role === 'LAB_MANAGER' && req.status === 'REVIEW_PENDING' && (
                                      <button className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-black uppercase rounded shadow-lg" onClick={() => openReviewModal(req)}>Review</button>
                                    )}
                                    {user.sub_role === 'TECHNICIAN' && req.status === 'in_progress' && (
                                        <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase rounded shadow-lg" onClick={() => handleSubmitReview(req.id)}>Submit</button>
                                    )}
                                    {req.status === 'in_progress' && (
                                        <Link to={`/results/batch?requestId=${req.id}`} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black uppercase rounded no-underline">Bench</Link>
                                    )}
                                  </>
                                )}
                                {isClient && req.report_id && (
                                    <button onClick={() => handleDownloadReport(req.report_id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase rounded shadow-lg">Download CoA</button>
                                )}
                                {!isClient && req.report_id && (
                                  <button onClick={() => handleDownloadReport(req.report_id)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black uppercase rounded">PDF</button>
                                )}
                                {!isClient && user.sub_role === 'LAB_MANAGER' && req.status === 'completed' && !req.report_id && (
                                  <button onClick={() => handleGenerateReport(req.id)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase rounded shadow-lg">Release CoA</button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

      {payTarget && (
        <PaymentGateway 
            amount={payTarget.amount} 
            requestId={payTarget.requestId} 
            paymentType={payTarget.paymentType}
            metadata={payTarget.metadata}
            onClose={() => setPayTarget(null)} 
            onSuccess={() => {
                setPayTarget(null);
                window.location.reload();
            }}
        />
      )}

      {assigningRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex-center p-6">
              <div className="glass-panel w-full max-w-md animate-scale-up border-white/10">
                  <h3 className="text-xl font-bold mb-2">Technical Review & Assignment</h3>
                  <p className="text-xs text-slate-400 mb-6">Order #{assigningRequest.id}: {assigningRequest.test_description}</p>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Select Designated Analyst</label>
                          <select 
                            className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                            value={selectedTechId}
                            onChange={e => setSelectedTechId(e.target.value)}
                          >
                              <option value="">Choose technician...</option>
                              {team.map(t => <option key={t.id} value={t.id}>{t.email}</option>)}
                          </select>
                      </div>

                      <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Technical Instructions / Notes</label>
                          <textarea 
                            className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                            rows="4"
                            placeholder="Specify test parameters, equipment priorities, or special handling instructions..."
                            value={assignmentNotes}
                            onChange={e => setAssignmentNotes(e.target.value)}
                          />
                      </div>

                      <div className="flex gap-4 pt-4">
                          <button className="btn-secondary flex-1" onClick={() => setAssigningRequest(null)}>Abort</button>
                          <button className="btn-primary flex-1 bg-indigo-600 border-none" onClick={handleAssign}>Release to Bench →</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {reviewingRequest && reviewData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex-center p-6">
              <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-white/10">
                  <div className="flex justify-between items-start mb-6 shrink-0">
                    <div>
                        <h3 className="text-2xl font-black">Final Quality Inspection</h3>
                        <p className="text-xs text-slate-400">Work Order #{reviewingRequest.id} | Technician: {reviewData.request.technician_email}</p>
                    </div>
                    <button onClick={() => setReviewingRequest(null)} className="text-slate-500 hover:text-white">✕ Close</button>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 space-y-8 pr-2">
                      {reviewData.samples.map(sample => (
                          <div key={sample.id} className="bg-slate-900/50 rounded-xl border border-white/5 p-6">
                              <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                                  <div>
                                      <h4 className="font-bold text-lg text-blue-400">{sample.sample_code}</h4>
                                      <p className="text-xs text-slate-400">{sample.description}</p>
                                  </div>
                                  <span className={`pill pill-${sample.status}`}>{sample.status}</span>
                              </div>

                              <table className="data-table text-[11px]">
                                  <thead>
                                      <tr className="bg-slate-800/50">
                                          <th>Parameter</th>
                                          <th>Result Value</th>
                                          <th>MU (±)</th>
                                          <th>Ref Method</th>
                                          <th>Equip</th>
                                          <th>P/F</th>
                                          <th>Analyst</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {sample.results.map(res => (
                                          <tr key={res.id}>
                                              <td className="font-bold">{res.parameter_name}</td>
                                              <td className="text-blue-300 font-mono">{res.value} {res.unit}</td>
                                              <td className="text-slate-500">{res.measurement_uncertainty || '-'}</td>
                                              <td className="text-slate-500">{res.method_reference || 'Internal'}</td>
                                              <td className="text-slate-500">{res.equipment_id || '-'}</td>
                                              <td>
                                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${res.pass_fail === 'Pass' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                      {res.pass_fail}
                                                  </span>
                                              </td>
                                              <td className="text-[10px] text-slate-500">{res.entered_by_email.split('@')[0]}</td>
                                          </tr>
                                      ))}
                                      {sample.results.length === 0 && (
                                          <tr><td colSpan="7" className="text-center py-4 italic text-slate-600">No results recorded for this sample.</td></tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      ))}
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/10 shrink-0 flex justify-between items-center">
                      <div className="text-xs text-slate-400 italic">
                          💡 Maker-Checker Rule: Final approval locks all results and generates an immutable audit trail.
                      </div>
                      <div className="flex gap-4">
                          <button className="btn-secondary" onClick={() => setReviewingRequest(null)}>Decline / Further Review</button>
                          <button className="btn-primary bg-green-600 hover:bg-green-500 border-none px-10" onClick={handleApproveWorkOrder}>
                              Approve & Authorize Release
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {tracingRequest && traceData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex-center p-6">
              <div className="glass-panel w-full max-w-lg border-white/10 overflow-hidden flex flex-col">
                  <div className="flex justify-between items-start mb-8">
                      <div>
                          <h3 className="text-xl font-black">End-to-End Traceability</h3>
                          <p className="text-xs text-slate-400">Order #{tracingRequest.id} | Digital Audit Trail</p>
                      </div>
                      <button onClick={() => { setTracingRequest(null); setTraceData(null); }} className="text-slate-500 hover:text-white">✕</button>
                  </div>

                  <div className="space-y-0 relative">
                      {/* Vertical Connector Line */}
                      <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-800"></div>

                      {traceData.timeline.map((item, idx) => (
                          <div key={idx} className="relative pl-12 pb-8 last:pb-0">
                              {/* Step Node */}
                              <div className={`absolute left-0 w-10 h-10 rounded-full flex-center text-lg z-10 border-4 border-[#0f172a] ${item.status === 'complete' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : item.status === 'current' ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                                  {item.status === 'complete' ? '✓' : item.icon}
                              </div>

                              <div className={item.status === 'pending' ? 'opacity-40' : ''}>
                                  <div className="flex justify-between items-start">
                                      <h4 className={`font-bold text-sm ${item.status === 'current' ? 'text-blue-400' : 'text-white'}`}>{item.label}</h4>
                                      {item.timestamp && (
                                          <span className="text-[10px] text-slate-500 font-mono">{new Date(item.timestamp).toLocaleDateString()}</span>
                                      )}
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                                  {item.timestamp && (
                                      <p className="text-[9px] text-blue-500/60 font-mono mt-1 uppercase tracking-tighter">Verified @ {new Date(item.timestamp).toLocaleTimeString()}</p>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
                      <button className="btn-secondary w-full" onClick={() => { setTracingRequest(null); setTraceData(null); }}>
                          Close Audit View
                      </button>
                  </div>
              </div>
          </div>
      )}

      {dispatchingRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex-center p-6">
              <div className="glass-panel w-full max-w-md">
                  <h3 className="text-xl font-black mb-4">🚚 Dispatch Shipment</h3>
                  <p className="text-xs text-slate-400 mb-6">Enter tracking details for Order #{dispatchingRequest.id}. This will notify the lab to prepare for arrival.</p>
                  
                  <form onSubmit={handleDispatch} className="space-y-4">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Courier Tracking Number *</label>
                          <input 
                              required 
                              className="w-full p-3 rounded bg-white/5 border border-white/10 focus:border-blue-500 outline-none" 
                              placeholder="e.g. DHL-98231238"
                              value={dispatchForm.tracking_number}
                              onChange={e => setDispatchForm({...dispatchForm, tracking_number: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Dispatch Notes</label>
                          <textarea 
                              className="w-full p-3 rounded bg-white/5 border border-white/10 focus:border-blue-500 outline-none h-24" 
                              placeholder="e.g. Shipped on dry ice, fragile..."
                              value={dispatchForm.notes}
                              onChange={e => setDispatchForm({...dispatchForm, notes: e.target.value})}
                          />
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button type="button" className="btn-secondary flex-1" onClick={() => setDispatchingRequest(null)}>Cancel</button>
                          <button type="submit" className="btn-primary flex-1">Confirm Dispatch</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
