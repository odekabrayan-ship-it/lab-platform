import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const STATUS_CONFIG = {
  SUBMITTED:       { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Pending Review', icon: '⏳' },
  UNDER_REVIEW:    { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Under Review', icon: '🔍' },
  COMMITTEE_REVIEW:{ color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'Committee Review', icon: '👥' },
  MORE_INFO_NEEDED:{ color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', label: 'More Info Needed', icon: '❓' },
  APPROVED:        { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Approved', icon: '✅' },
  REJECTED:        { color: 'text-red-400 bg-red-500/10 border-red-500/20', label: 'Rejected', icon: '❌' },
};

export default function AccreditationDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [stage, setStage] = useState('INITIAL');
  const [processing, setProcessing] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState(null);
  const [filter, setFilter] = useState('SUBMITTED');

  const fetchApps = async () => {
    try {
      const res = await API.get('/api/cert/applications');
      setApplications(res.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);

  const openDetail = async (app) => {
    setSelected(app);
    setNotes('');
    setDetailLoading(true);
    try {
      const res = await API.get(`/api/cert/applications/${app.id}`);
      setDetail(res.data.data);
    } catch { setDetail(app); }
    setDetailLoading(false);
  };

  const handleDecision = async (id, decision) => {
    setProcessing(true);
    try {
      await API.post(`/api/cert/applications/${id}/review`, { decision, notes, review_stage: stage });
      setSelected(null);
      setDetail(null);
      setNotes('');
      await fetchApps();
    } catch (e) { console.error(e); }
    setProcessing(false);
  };

  const runExpirySweep = async () => {
    setSweeping(true);
    try {
      const res = await API.post('/api/cert/admin/expiry-sweep');
      setSweepResult(res.data.data);
    } catch (e) { console.error(e); }
    setSweeping(false);
  };

  const filteredApps = filter === 'ALL' ? applications : applications.filter(a => a.status === filter);

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'SUBMITTED').length,
    review: applications.filter(a => ['UNDER_REVIEW', 'COMMITTEE_REVIEW'].includes(a.status)).length,
    approved: applications.filter(a => a.status === 'APPROVED').length,
    rejected: applications.filter(a => a.status === 'REJECTED').length,
  };

  return (
    <div className="flex gap-8">
      {/* Main panel */}
      <div className={`${selected ? 'flex-1' : 'w-full'} transition-all`}>
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-1">Accreditation Authority</h1>
          <p className="text-slate-500 text-sm">Manage professional certification applications</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-white', border: 'border-white/10' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-400', border: 'border-amber-500/20' },
            { label: 'In Review', value: stats.review, color: 'text-blue-400', border: 'border-blue-500/20' },
            { label: 'Approved', value: stats.approved, color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-400', border: 'border-red-500/20' },
          ].map(s => (
            <div key={s.label} className={`bg-[#0f172a] border ${s.border} rounded-2xl p-4`}>
              <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{s.label}</div>
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Expiry sweep */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={runExpirySweep}
            disabled={sweeping}
            className="px-5 py-2 bg-orange-600/80 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-orange-500 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {sweeping ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sweeping...</> : '⚡ Run Expiry Sweep'}
          </button>
          {sweepResult && (
            <div className="text-xs text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
              ⚠️ {sweepResult.expiring_credentials} credentials expiring · {sweepResult.expiry_warnings_sent} emails sent
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 bg-white/[0.03] p-1 rounded-xl w-fit">
          {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'COMMITTEE_REVIEW', 'APPROVED', 'REJECTED', 'MORE_INFO_NEEDED'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              {f === 'ALL' ? `All (${applications.length})` : `${f.replace(/_/g, ' ')} (${applications.filter(a => a.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Application list */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-16 text-center text-slate-600 text-sm">No applications match this filter.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5">
                  <th className="text-left py-4 px-6">Applicant</th>
                  <th className="text-left py-4 px-4">Certification</th>
                  <th className="text-left py-4 px-4">Status</th>
                  <th className="text-left py-4 px-4">Submitted</th>
                  <th className="py-4 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map(app => {
                  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.SUBMITTED;
                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer ${selected?.id === app.id ? 'bg-teal-500/5' : ''}`}
                      onClick={() => openDetail(app)}
                    >
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">{app.full_name || `Professional #${app.professional_id}`}</div>
                        <div className="text-xs text-slate-600">{app.email}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-300 text-xs">{app.certification_type}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-xs">{new Date(app.submitted_at).toLocaleDateString()}</td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-teal-400 text-xs font-bold">Review →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-96 flex-shrink-0">
          <div className="bg-[#0f172a] border border-teal-500/20 rounded-2xl p-6 sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-white">Application #{selected.id}</h3>
              <button onClick={() => { setSelected(null); setDetail(null); }} className="text-slate-600 hover:text-white text-lg transition-colors">×</button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <>
                {/* Applicant info */}
                <div className="space-y-3 mb-6">
                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Applicant</div>
                    <div className="font-bold text-white text-sm">{detail?.full_name}</div>
                    <div className="text-xs text-slate-500">{detail?.email}</div>
                  </div>
                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Institution</div>
                    <div className="text-sm text-slate-300">{detail?.institution || '—'}</div>
                  </div>
                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Certification</div>
                    <div className="text-sm text-teal-400 font-bold">{detail?.certification_type}</div>
                  </div>
                  {detail?.professional_statement && (
                    <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                      <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Statement</div>
                      <div className="text-xs text-slate-400 leading-relaxed line-clamp-6">{detail?.professional_statement}</div>
                    </div>
                  )}
                  {(() => {
                    try {
                      const docs = JSON.parse(detail?.documents || '[]');
                      if (docs.length > 0) return (
                        <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Documents ({docs.length})</div>
                          {docs.map((d, i) => (
                            <div key={i} className="text-xs text-slate-400 flex items-center gap-1 py-0.5">
                              <span>📄</span> {d.name || d}
                            </div>
                          ))}
                        </div>
                      );
                    } catch {}
                    return null;
                  })()}
                </div>

                {/* Decision controls — only for SUBMITTED/UNDER_REVIEW/COMMITTEE_REVIEW */}
                {['SUBMITTED', 'UNDER_REVIEW', 'COMMITTEE_REVIEW', 'MORE_INFO_NEEDED'].includes(selected.status) && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Review Stage</div>
                      <select value={stage} onChange={e => setStage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-teal-500">
                        <option value="INITIAL">Initial Review</option>
                        <option value="DOCUMENT">Document Review</option>
                        <option value="COMMITTEE">Committee Review</option>
                        <option value="FINAL">Final Decision</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Notes / Feedback</div>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Add review notes (sent to applicant on rejection/info request)..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-teal-500 resize-none placeholder:text-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <button onClick={() => handleDecision(selected.id, 'UNDER_REVIEW')} disabled={processing} className="px-3 py-2 bg-blue-600/70 text-white text-xs font-black rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50">🔍 Mark Under Review</button>
                      <button onClick={() => handleDecision(selected.id, 'COMMITTEE_REVIEW')} disabled={processing} className="px-3 py-2 bg-purple-600/70 text-white text-xs font-black rounded-lg hover:bg-purple-500 transition-all disabled:opacity-50">👥 Escalate to Committee</button>
                      <button onClick={() => handleDecision(selected.id, 'MORE_INFO_NEEDED')} disabled={processing} className="px-3 py-2 bg-amber-600/70 text-white text-xs font-black rounded-lg hover:bg-amber-500 transition-all disabled:opacity-50">❓ Request More Info</button>
                      <button onClick={() => handleDecision(selected.id, 'APPROVED')} disabled={processing} className="px-3 py-2 bg-emerald-600 text-white text-xs font-black rounded-lg hover:bg-emerald-500 transition-all disabled:opacity-50">✅ Approve & Issue Credential</button>
                      <button onClick={() => handleDecision(selected.id, 'REJECTED')} disabled={processing} className="px-3 py-2 bg-red-600/80 text-white text-xs font-black rounded-lg hover:bg-red-500 transition-all disabled:opacity-50">❌ Reject Application</button>
                    </div>
                  </div>
                )}

                {!['SUBMITTED', 'UNDER_REVIEW', 'COMMITTEE_REVIEW', 'MORE_INFO_NEEDED'].includes(selected.status) && (
                  <div className={`p-4 rounded-xl border text-center text-sm font-bold ${STATUS_CONFIG[selected.status]?.color}`}>
                    {STATUS_CONFIG[selected.status]?.icon} {STATUS_CONFIG[selected.status]?.label}
                    {detail?.decision_notes && <div className="text-xs font-normal text-slate-500 mt-2">{detail.decision_notes}</div>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
