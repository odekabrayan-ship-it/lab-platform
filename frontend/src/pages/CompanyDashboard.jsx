import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import GuidancePanel from "../components/GuidancePanel";
import PaymentGateway from "../components/PaymentGateway";

// ── Donut SVG Chart ──────────────────────────────────────────────────────────
function DonutChart({ pass, fail, size = 120 }) {
  const total = pass + fail;
  const pct = total > 0 ? Math.round((pass / total) * 100) : null;
  const r = 42;
  const circ = 2 * Math.PI * r;
  const passArc = total > 0 ? (pass / total) * circ : 0;
  const offset = circ * 0.25; // start from top

  return (
    <div className="ring-chart-wrap">
      <div className="ring-chart" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
          {total > 0 && (
            <circle
              cx="50" cy="50" r={r} fill="none"
              stroke="#10b981" strokeWidth="12"
              strokeDasharray={`${passArc} ${circ}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          )}
          {total > 0 && fail > 0 && (
            <circle
              cx="50" cy="50" r={r} fill="none"
              stroke="#ef4444" strokeWidth="12"
              strokeDasharray={`${circ - passArc - 4} ${circ}`}
              strokeDashoffset={-passArc + offset + 2}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          )}
        </svg>
        <div className="ring-center">
          {pct !== null ? (
            <>
              <div className="ring-pct">{pct}%</div>
              <div className="ring-sub">Pass</div>
            </>
          ) : (
            <div className="ring-sub" style={{ fontSize: 11 }}>No data</div>
          )}
        </div>
      </div>
      <div className="ring-legend">
        <div className="ring-legend-item">
          <span className="ring-dot" style={{ background: '#10b981' }} />
          <span><strong>{pass}</strong> Pass</span>
        </div>
        <div className="ring-legend-item">
          <span className="ring-dot" style={{ background: '#ef4444' }} />
          <span><strong>{fail}</strong> Fail</span>
        </div>
      </div>
    </div>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function MonthlyBarChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '20px 0' }}>No activity in the last 6 months.</p>;
  }
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="bar-chart">
      {data.map((d) => {
        const heightPct = (d.count / max) * 100;
        const label = d.month.substring(5); // "MM" from "YYYY-MM"
        return (
          <div key={d.month} className="bar-col">
            <span className="bar-value">{d.count}</span>
            <div className="bar-fill" style={{ height: `${Math.max(heightPct, 4)}%` }} title={`${d.month}: ${d.count} requests`} />
            <span className="bar-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Vigilance Intelligence Feed ──────────────────────────────────────────────
function VigilanceFeed({ reports }) {
    if (!reports || reports.length === 0) {
        return (
            <div className="p-8 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                <div className="text-3xl mb-3 opacity-30">🛡️</div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No Active Safety Threats</h4>
                <p className="text-[9px] text-slate-600 mt-1">Your corporate vigilance shield is active and monitoring public registry reports.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {reports.map(report => (
                <div key={report.id} className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl group hover:bg-red-500/10 transition-all">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Adverse Event detected</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 uppercase">{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                    <h5 className="text-xs font-black text-white mb-1 group-hover:text-red-400 transition-colors">{report.brand_name}: {report.product_category}</h5>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{report.report_summary}</p>
                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Status: <span className="text-amber-400">Under Mediation</span></span>
                        <button className="text-[9px] font-black text-white uppercase tracking-widest hover:underline">Forensic Analysis →</button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Supplier Compliance Cockpit ──────────────────────────────────────────────
function ComplianceCockpit({ labs }) {
    return (
        <div className="space-y-4">
            {labs.map(lab => {
                const isExpiring = lab.accreditation_expiry && new Date(lab.accreditation_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                    <div key={lab.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${lab.verification_status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {lab.verification_status === 'VERIFIED' ? '🛡️' : '⚠️'}
                            </div>
                            <div>
                                <h5 className="text-xs font-black text-white">{lab.name}</h5>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{lab.accreditation_status || 'ISO 17025'}</span>
                                    {isExpiring && <span className="text-[8px] font-black text-amber-500 uppercase px-1.5 py-0.5 bg-amber-500/10 rounded-full animate-pulse">Expiry Alert</span>}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[9px] font-bold text-slate-600 uppercase">Accreditation Expiry</div>
                            <div className={`text-[10px] font-black ${isExpiring ? 'text-amber-400' : 'text-slate-400'}`}>
                                {lab.accreditation_expiry ? new Date(lab.accreditation_expiry).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, value, label, sub, accent, to }) {
  const inner = (
    <div className="kpi-card group relative overflow-hidden" style={{ '--kpi-accent': accent || 'var(--primary)' }}>
      {/* Background Glow */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" style={{ background: accent || 'var(--primary)' }} />
      
      <span className="kpi-icon relative z-10">{icon}</span>
      <div className="kpi-value relative z-10">{value ?? '—'}</div>
      <div className="kpi-label relative z-10">{label}</div>
      {sub && <div className="kpi-sub relative z-10">{sub}</div>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link> : inner;
}

// ── Batch Radar Row (Scientific "Pizza Tracker") ─────────────────────────────
function BatchRadarRow({ batch }) {
    // Mapping internal statuses to the "Expert" Supply Chain steps
    const RADAR_STEPS = [
        { key: 'SAMPLED',    label: 'Sampled',      internal: ['pending', 'TECHNICAL_REVIEW'] },
        { key: 'SHIPPED',    label: 'Shipped',      internal: ['DISPATCHED'] },
        { key: 'INTAKE',     label: 'Lab Intake',   internal: ['RECEIVED'] },
        { key: 'PREP',       label: 'Prep',         internal: ['RELEASED', 'PREP'] },
        { key: 'ANALYSIS',   label: 'Analysis',     internal: ['in_progress', 'ANALYZING'] },
        { key: 'REVIEW',     label: 'QA Review',    internal: ['REVIEW_PENDING', 'REVIEW'] },
        { key: 'CERTIFIED',  label: 'Certified',    internal: ['completed', 'CERTIFIED'] }
    ];

    // Determine current step index based on both request status and sample phase
    const getActiveStep = () => {
        // Check request status first for logistics
        const reqIdx = RADAR_STEPS.findIndex(s => s.internal.includes(batch.status));
        // Check sample phase for technical work
        const sampleIdx = RADAR_STEPS.findIndex(s => s.internal.includes(batch.current_phase));
        
        return Math.max(reqIdx, sampleIdx);
    };

    const currentStepIdx = getActiveStep();

    return (
        <div className="py-6 border-b border-white/5 last:border-0 group">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-black text-white">Batch #{batch.id} — {batch.test_description}</span>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">Live Tracker</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span>Lab: <strong className="text-slate-300">{batch.lab_name}</strong></span>
                        <span className="opacity-20">|</span>
                        <span>{batch.sample_count} Analytical Units</span>
                    </div>
                </div>
                <Link to={`/requests/${batch.id}`} className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest border border-white/10 px-3 py-1 rounded transition-all">
                    View Technical Log →
                </Link>
            </div>

            {/* High-Fidelity Step Tracker */}
            <div className="relative px-2">
                {/* Connector Line */}
                <div className="absolute top-[9px] left-6 right-6 h-[2px] bg-slate-800 z-0" />
                <div 
                    className="absolute top-[9px] left-6 h-[2px] bg-blue-500 z-0 transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                    style={{ width: `calc(${(currentStepIdx / (RADAR_STEPS.length - 1)) * 100}% - 12px)` }}
                />

                <div className="flex justify-between relative z-10">
                    {RADAR_STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIdx;
                        const isActive = idx === currentStepIdx;
                        
                        return (
                            <div key={step.key} className="flex flex-col items-center group/step">
                                <div 
                                    className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                                        isActive ? 'bg-blue-500 border-blue-400 scale-125 shadow-[0_0_15px_rgba(59,130,246,0.6)]' :
                                        isCompleted ? 'bg-blue-900/40 border-blue-500/50' :
                                        'bg-slate-900 border-slate-800'
                                    }`}
                                >
                                    {isCompleted && <span className="text-[10px] text-blue-400">✓</span>}
                                    {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                                </div>
                                <span className={`mt-3 text-[10px] font-black uppercase tracking-tighter transition-colors ${
                                    isActive ? 'text-white' : 
                                    isCompleted ? 'text-slate-400' : 
                                    'text-slate-600'
                                }`}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Event label helper ────────────────────────────────────────────────────────
function friendlyEvent(event) {
  return event?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) || event;
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function CompanyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payTarget, setPayTarget] = useState(null); // { amount, requestId }
  const navigate = useNavigate();
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [vigilanceData, setVigilanceData] = useState([]);
  const [complianceData, setComplianceData] = useState([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const fetchMembership = async () => {
        try {
            const res = await API.get("/api/membership/status");
            setMembershipStatus(res.data.data);
        } catch (e) {}
    };
    fetchMembership();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [anaRes, vigRes, compRes] = await Promise.all([
            API.get("/api/analytics/client"),
            API.get("/api/industry/vigilance"),
            API.get("/api/industry/compliance")
        ]);
        setData(anaRes.data.data);
        setVigilanceData(vigRes.data.data);
        setComplianceData(compRes.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-8">Executive Dashboard</h1>

      {/* Membership Activation Alert */}
      {membershipStatus?.subscription_status === 'AWAITING_PAYMENT' && (
        <div className="glass-panel border-amber-500/50 bg-amber-500/5 p-6 mb-8 flex justify-between items-center animate-pulse-slow">
            <div>
                <h3 className="font-bold text-amber-400">Action Required: Activate Membership</h3>
                <p className="text-sm text-slate-400 mt-1">Your application is approved! Pay the onboarding fee to unlock your full professional dashboard.</p>
            </div>
            <button 
                onClick={() => setPayTarget({ 
                    amount: user.role === 'lab' ? 500 : 200, 
                    requestId: 0, 
                    paymentType: 'SUBSCRIPTION',
                    metadata: { tier: 'CORPORATE' }
                })}
                className="btn-sm bg-amber-500 hover:bg-amber-400 border-none text-black font-bold px-8"
            >
                Pay Registration Fee
            </button>
        </div>
      )}

      {/* Membership Suspension Overlay */}
      {membershipStatus?.subscription_status === 'EXPIRED' && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[999] flex-center p-6 text-center">
              <div className="max-w-md animate-scale-up">
                  <div className="w-24 h-24 bg-red-500/10 rounded-full flex-center text-red-500 text-5xl mx-auto mb-8 border border-red-500/20">⚖️</div>
                  <h2 className="text-3xl font-black text-white mb-4">Corporate Account Suspended</h2>
                  <p className="text-slate-400 mb-8 leading-relaxed">Your company's membership has <strong>Expired</strong>. Access to your quality analytics and procurement dashboards has been restricted by the Oversight Engine.</p>
                  
                  <div className="glass-panel border-red-500/20 p-6 mb-8 text-left bg-red-500/5">
                      <div className="text-[10px] font-bold text-red-400 uppercase mb-2">Requirement</div>
                      <div className="text-sm font-semibold">Renew Membership Subscription ($200)</div>
                  </div>

                  <button 
                    onClick={() => setPayTarget({ 
                        amount: 200, 
                        requestId: 0, 
                        paymentType: 'SUBSCRIPTION',
                        metadata: { tier: 'RENEWAL' }
                    })}
                    className="btn-primary w-full py-4 bg-red-600 hover:bg-red-500 border-none text-lg font-bold"
                  >
                    Renew Corporate Subscription
                  </button>
                  <p className="mt-6 text-xs text-slate-500">Need help? Contact the Membership Authority.</p>
              </div>
          </div>
      )}
          <p className="text-muted">Loading intelligence data...</p>
        </div>
        <div className="kpi-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="kpi-card">
              <div className="skeleton-cell" style={{ height: 28, width: '60%', marginBottom: 8 }} />
              <div className="skeleton-cell" style={{ height: 12, width: '80%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="banner banner-error">{error}</div>
        <button className="btn-primary mt-4" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (user.verification_status === 'PENDING_REVIEW') {
    return (
      <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-8">
        <div className="glass-panel max-w-2xl text-center p-16 border-t-4 border-indigo-500 animate-fade-in shadow-[0_0_50px_rgba(79,70,229,0.1)]">
          <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse shadow-[0_0_20px_rgba(79,70,229,0.2)]">
            <span className="text-5xl">🛡️</span>
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tighter text-white">Institutional Review in Progress</h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-10">
            The QualiCore Sovereign Authority is currently auditing your corporate dossier. 
            Your industrial access will be fully activated once our specialists have verified your 
            operational credentials and quality assurance standards.
          </p>
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl mb-10 text-left">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Corporate Submission</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Completed</span>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Authority Forensic Audit</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Active</span>
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

  const { kpis, monthlyActivity, labPerformance, recentActivity, invoiceSummary, activeBatches } = data;

  // ── Onboarding Sentinel ───────────────────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(kpis.totalRequests === 0);

  return (
    <div className="animate-fade-in space-y-8">
        {/* WELCOME ONBOARDING SCREEN */}
        {showOnboarding && (
            <div className="fixed inset-0 bg-[#0f172a] z-[1000] flex items-center justify-center p-6 overflow-y-auto">
                <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center animate-scale-up">
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-5xl font-black text-white tracking-tighter mb-4 leading-none">
                                Welcome to <span className="text-blue-500">QualiCore</span>
                            </h1>
                            <p className="text-xl text-slate-400 font-medium">A Verified Laboratory Network for Trusted Product Testing</p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { icon: '🛡️', text: 'Only ISO-aligned laboratories' },
                                { icon: '🔗', text: 'Full test traceability' },
                                { icon: '⚖️', text: 'Competitive lab selection' },
                                { icon: '📜', text: 'Audit-ready reporting system' }
                            ].map(prop => (
                                <div key={prop.text} className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                        {prop.icon}
                                    </div>
                                    <span className="text-slate-300 font-bold uppercase text-xs tracking-widest">{prop.text}</span>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => setShowOnboarding(false)}
                            className="btn-primary px-12 py-5 text-sm font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)] border-none"
                        >
                            Enter Intelligence Control Tower
                        </button>
                    </div>

                    <div className="glass-panel border-white/5 bg-white/[0.02] p-8 space-y-8">
                        <div>
                            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">What you can do here:</h3>
                            <div className="space-y-6">
                                {[
                                    { title: 'Request laboratory testing', desc: 'Directly initiate ISO-compliant test orders with technical partners.' },
                                    { title: 'Compare verified labs', desc: 'Audit lab capabilities, turnaround times, and yield scores.' },
                                    { title: 'Track test lifecycle', desc: 'Real-time visibility into the scientific supply chain.' },
                                    { title: 'Access certified reports (CoA)', desc: 'Instant download of digitally signed, legally verifiable reports.' }
                                ].map(action => (
                                    <div key={action.title} className="relative pl-6 border-l border-white/10 group">
                                        <div className="absolute -left-[1px] top-0 h-4 w-[2px] bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <h4 className="text-sm font-black text-white mb-1">{action.title}</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed font-medium">{action.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-xl opacity-40">⚙️</div>
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Platform Support</div>
                                <div className="text-xs font-bold text-slate-400">Documentation & Guides Available</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {/* Executive Quick Command */}
        <div className="glass-panel p-3 flex items-center gap-6 bg-slate-900/40 border-white/5 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <span className="text-blue-400 font-black text-xs uppercase tracking-widest">Global Sentinel</span>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
            </div>
            <div className="h-6 w-[1px] bg-white/5" />
            <input 
                className="bg-transparent border-none outline-none text-slate-300 text-sm flex-1 font-medium placeholder:text-slate-600"
                placeholder="Search analytical batches, partner laboratories, or technical reports..."
                readOnly
            />
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Throughput</div>
                    <div className="text-xs font-black text-white">1.2 TB/s</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                    ⚙️
                </div>
            </div>
        </div>

        {/* Page Header (Executive Cockpit) */}
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter mb-2 leading-none">Intelligence Control Tower</h2>
            <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
              <span>QA Authority for <strong className="text-slate-300 uppercase tracking-widest">{user.email.split('@')[0]} Global Industries</strong></span>
              <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
              <span className="text-blue-400/80 uppercase text-[10px] font-black tracking-widest">Sovereign Data Shield Active</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Link to="/explore" className="btn-secondary px-8 py-3 text-[10px] font-black uppercase tracking-widest no-underline border-white/5 hover:border-blue-500/50 transition-all flex items-center gap-2">
              <span>🔍</span> Lab Discovery
            </Link>
            <Link to="/create-request" className="btn-primary px-8 py-3 text-[10px] font-black uppercase tracking-widest no-underline bg-blue-600 hover:bg-blue-500 shadow-[0_20px_40px_-10px_rgba(37,99,235,0.5)] flex items-center gap-2">
              <span>➕</span> Initiate Batch Testing
            </Link>
          </div>
        </div>
  
        <GuidancePanel role={user.role} subRole={user.sub_role} />

        {/* ── TRUST ACCELERATOR CALL-TO-ACTION ── */}
        <div className="p-10 rounded-[3rem] bg-gradient-to-br from-indigo-600 via-indigo-700 to-fuchsia-800 relative overflow-hidden group mb-4">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 blur-3xl -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/20 blur-3xl rounded-full"></div>
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-16">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[9px] font-black uppercase tracking-widest mb-6">
                        Institutional Expansion Program
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter mb-4 leading-[0.9]">Elevate Your <br />Public Trust.</h2>
                    <p className="text-white/70 text-lg font-medium leading-relaxed max-w-md">
                        Join the Elite Tier of verified industries. Increase your market share by showcasing real-time laboratory integrity to millions of consumers on the public registry.
                    </p>
                    <div className="flex gap-4 mt-10">
                        <Link 
                            to="/trust-accelerator" 
                            className="px-10 py-5 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl shadow-black/20"
                        >
                            Start Acceleration →
                        </Link>
                        <button className="px-10 py-5 bg-transparent border border-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all">
                            View Case Studies
                        </button>
                    </div>
                </div>
                <div className="hidden lg:block">
                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { label: 'Trust Index Boost', val: '+42%', icon: '📈' },
                            { label: 'Consumer Verification Requests', val: '2.4k', icon: '📡' },
                            { label: 'Audit Readiness Level', val: '98%', icon: '⚖️' },
                            { label: 'Market Visibility', val: 'PREMIUM', icon: '💎' }
                        ].map((stat, i) => (
                            <div key={i} className="p-8 rounded-[2rem] bg-white/10 backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-all">
                                <div className="text-2xl mb-2">{stat.icon}</div>
                                <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">{stat.label}</div>
                                <div className="text-3xl font-black">{stat.val}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT COLUMN: Intelligence & Operations */}
          <div className="lg:col-span-3 space-y-8">
              
              {/* Intelligence Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KpiCard icon="🧬" value={kpis.totalRequests} label="System Throughput" sub="Total Batches Logged" to="/dashboard" />
                  <KpiCard icon="📡" value={kpis.activeRequests} label="Active Analysis" sub="In Laboratory Pipeline" accent="#f59e0b" to="/dashboard" />
                  <KpiCard icon="🎖️" value={kpis.completedRequests} label="Quality Yield" sub="Validated CoAs Issued" accent="#10b981" to="/vault" />
                  <KpiCard icon="⚖️" value={invoiceSummary?.unpaid_count ?? 0} label="Treasury State" sub={`${invoiceSummary?.outstanding?.toFixed(2) ?? '0.00'} USD Unsettled`} accent={invoiceSummary?.unpaid_count > 0 ? '#f59e0b' : '#10b981'} to="/billing" />
              </div>

              {/* Outstanding Invoice Alert */}
              {invoiceSummary?.unpaid_count > 0 && (
                  <div className="glass-panel border-l-4 border-amber-500 flex justify-between items-center py-5 px-8 bg-amber-500/5 animate-fade-in">
                      <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-xl animate-pulse">💰</div>
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <strong className="text-amber-400 text-sm uppercase tracking-widest">Financial Triage Required</strong>
                              </div>
                              <p className="text-slate-500 text-[11px] font-medium">
                                  Total outstanding of <span className="text-slate-300 font-black">{invoiceSummary.outstanding?.toFixed(2)} USD</span> across {invoiceSummary.unpaid_count} requests.
                              </p>
                          </div>
                      </div>
                      <button 
                          onClick={() => setPayTarget({ amount: invoiceSummary.outstanding, requestId: 'TOTAL' })}
                          className="btn-primary px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[10px] border-none shadow-[0_10px_20px_-5px_rgba(245,158,11,0.3)]" 
                      >
                          Settle Ledger ⚡
                      </button>
                  </div>
              )}

              {/* Live Batch Radar */}
              {activeBatches?.length > 0 && (
                  <div className="glass-panel p-8">
                      <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                          <div>
                              <h3 className="text-xl font-black text-white tracking-tight">Active Supply Chain Radar</h3>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time Batch Status & GxP Compliance Tracking</p>
                          </div>
                          <Link to="/dashboard" className="btn-secondary px-4 py-2 text-[10px] font-black uppercase tracking-widest no-underline">View Global Registry →</Link>
                      </div>
                      <div className="space-y-1">
                          {activeBatches.map(batch => (
                              <BatchRadarRow key={batch.id} batch={batch} />
                          ))}
                      </div>
                  </div>
              )}

              {/* Analytical Performance row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="glass-panel p-8">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                          <span className="w-1 h-4 bg-blue-500 rounded-full"></span> Monthly Throughput
                      </h3>
                      <MonthlyBarChart data={monthlyActivity} />
                  </div>
                  <div className="glass-panel p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                      <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                          <span className="w-1 h-4 bg-emerald-500 rounded-full"></span> Quality Yield Sentinel
                      </h3>
                      <div className="flex-center py-4">
                        <DonutChart pass={kpis.passCount} fail={kpis.failCount} size={160} />
                      </div>
                  </div>
              </div>
          </div>

          {/* RIGHT COLUMN: Quality & Vigilance Sentinel */}
          <div className="space-y-8">
              
              {/* Vigilance Sentinel */}
              <div className="glass-panel p-6 border-t-4 border-red-500 shadow-[0_20px_50px_-12px_rgba(239,68,68,0.2)]">
                  <div className="flex justify-between items-center mb-6">
                      <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">Active Vigilance</h3>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                              <span className="text-[9px] font-bold text-red-500/80 uppercase">Monitoring Public Registry</span>
                          </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">🛡️</div>
                  </div>
                  <VigilanceFeed reports={vigilanceData} />
              </div>

              {/* ── NEW: VIGILANCE SEAL COMMAND CENTER ── */}
              <div className="p-8 rounded-[2rem] bg-slate-900 border border-emerald-500/30 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                  <div className="text-3xl mb-4">🧬</div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">Vigilance Seals</h3>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-6">
                      Your industrial sovereignty is live. Manage your dynamic QR seals and monitor global scan analytics.
                  </p>
                  <Link 
                      to="/seal-command" 
                      className="inline-block w-full text-center py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                  >
                      Enter Command Center →
                  </Link>
              </div>

              {/* Compliance Sentinel */}
              <div className="glass-panel p-6 border-t-4 border-indigo-500">
                  <div className="flex justify-between items-center mb-6">
                      <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">Supplier Compliance</h3>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">ISO 17025 Accreditation Sentinel</p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">⚖️</div>
                  </div>
                  <ComplianceCockpit labs={complianceData} />
                  <button className="w-full mt-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 transition-all">
                      Initiate Supplier Audit
                  </button>
              </div>

              {/* Quick Procurement Access */}
              <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl relative overflow-hidden shadow-2xl group cursor-pointer">
                  <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform" />
                  <h3 className="text-xl font-black text-white mb-2 relative z-10">Expand Network</h3>
                  <p className="text-xs text-white/70 font-medium mb-6 relative z-10 leading-relaxed">
                      Instantly connect with additional ISO-certified laboratories for diversified testing strategies.
                  </p>
                  <Link to="/explore" className="relative z-10 inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest no-underline shadow-xl">
                      Discover Partners 📡
                  </Link>
              </div>
          </div>
        </div>

        {/* Quality Sentinel Donut */}
        <div className="glass-panel overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Quality Sentinel</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Pass/Fail Analytical Distribution</p>
            </div>
            <div className="text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Total Validated: <strong className="text-white">{(kpis.passCount || 0) + (kpis.failCount || 0)}</strong>
            </div>
          </div>
          <div className="flex-center py-4">
            <DonutChart pass={kpis.passCount} fail={kpis.failCount} size={160} />
          </div>
        </div>

      {/* Lab Partner Intelligence Matrix */}
      <div className="glass-panel overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Network Intelligence</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Laboratory Capability & SLA Performance Matrix</p>
          </div>
          <Link to="/network" className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-slate-300 uppercase tracking-widest no-underline transition-all">
            Manage Infrastructure →
          </Link>
        </div>

        {labPerformance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-950/20 rounded-2xl border border-dashed border-white/5">
            <div className="text-4xl mb-4 opacity-20">🤝</div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No laboratory partnerships detected</p>
            <Link to="/explore" className="btn-primary mt-6 px-8 py-3 text-[10px] font-black uppercase no-underline">Establish New Engagement</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Laboratory Entity</th>
                  <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">SLA Standard</th>
                  <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Load</th>
                  <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Certified</th>
                  <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg. TAT</th>
                  <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Yield Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {labPerformance.map((lab, i) => {
                  const tested = (lab.pass_count || 0) + (lab.fail_count || 0);
                  const score = tested > 0 ? Math.round((lab.pass_count / tested) * 100) : null;
                  const scoreColor = score === null ? 'text-slate-600' : score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
                  return (
                    <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-4">
                        <div className="font-black text-white">{lab.lab_name}</div>
                        <div className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">{lab.city || 'Global Site'}</div>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-[9px] font-black uppercase tracking-tighter">
                          {lab.sla_tat || '72H PRIORITY'}
                        </span>
                      </td>
                      <td className="py-4 text-slate-300 font-bold">{lab.total_requests}</td>
                      <td className="py-4 text-emerald-500 font-bold">{lab.completed_count}</td>
                      <td className="py-4 text-slate-300 font-bold">{lab.avg_days !== null ? `${lab.avg_days}d` : '—'}</td>
                      <td className="py-4 text-right">
                        <span className={`text-lg font-black ${scoreColor}`}>
                          {score !== null ? `${score}%` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div className="section-header">
          <div className="section-title-row">
            <h3>⏱ Recent Activity</h3>
            <p>Your last actions on the platform</p>
          </div>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-muted text-sm">No recent activity recorded.</p>
        ) : (
          <div className="activity-feed">
            {recentActivity.map((item, i) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" />
                <div style={{ flex: 1 }}>
                  <div className="activity-event">{friendlyEvent(item.event)}</div>
                  <div className="activity-time">{new Date(item.timestamp).toLocaleString()}</div>
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.scope}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 24 }}>
        {[
          { to: '/create-request', icon: '➕', label: 'New Test Request', color: '#2563eb', allowed: ['QA_TECHNICIAN'] },
          { to: '/vault',          icon: '📁', label: 'Document Vault',   color: '#8b5cf6', allowed: ['DIRECTOR', 'QA_TECHNICIAN', 'PROCUREMENT_MANAGER'] },
          { to: '/billing',        icon: '💳', label: 'Billing Center',   color: '#0891b2', allowed: ['PROCUREMENT_MANAGER'] },
          { to: '/disputes',       icon: '⚖️', label: 'Disputes',         color: '#dc2626', allowed: ['PROCUREMENT_MANAGER'] },
        ]
        .filter(q => !user.sub_role || q.allowed.includes(user.sub_role))
        .map(q => (
          <Link key={q.to} to={q.to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white', border: `1px solid ${q.color}30`,
              borderRadius: 10, padding: '16px 20px', textAlign: 'center',
              transition: 'all 0.2s', cursor: 'pointer', display: 'block'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = q.color; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = ''; }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{q.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{q.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
