import { useState, useEffect } from 'react';
import API from '../services/api';

export default function AccreditationDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [notes, setNotes] = useState('');

  const fetchApps = async () => {
    try {
      const res = await API.get('/api/cert/applications');
      setApplications(res.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);

  const handleDecision = async (id, decision) => {
    try {
      await API.post(`/api/cert/applications/${id}/review`, { decision, notes });
      setReviewingId(null);
      setNotes('');
      fetchApps();
    } catch (e) { console.error(e); }
  };

  const pending = applications.filter(a => a.status === 'SUBMITTED');
  const reviewed = applications.filter(a => a.status !== 'SUBMITTED');
  const approvedCount = applications.filter(a => a.status === 'APPROVED').length;
  const rejectedCount = applications.filter(a => a.status === 'REJECTED').length;

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight mb-2">Accreditation Authority</h1>
      <p className="text-slate-500 text-sm mb-10">Review and manage certification applications</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Applications</div>
          <div className="text-3xl font-black text-white">{applications.length}</div>
        </div>
        <div className="bg-[#0f172a] border border-amber-500/20 rounded-2xl p-6">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pending Review</div>
          <div className="text-3xl font-black text-amber-400">{pending.length}</div>
        </div>
        <div className="bg-[#0f172a] border border-emerald-500/20 rounded-2xl p-6">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Approved</div>
          <div className="text-3xl font-black text-emerald-400">{approvedCount}</div>
        </div>
        <div className="bg-[#0f172a] border border-red-500/20 rounded-2xl p-6">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Rejected</div>
          <div className="text-3xl font-black text-red-400">{rejectedCount}</div>
        </div>
      </div>

      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-black mb-4 text-amber-400">⏳ Pending Applications</h2>
        {loading ? <div className="text-slate-500 text-sm">Loading...</div> : pending.length === 0 ? (
          <div className="text-slate-500 text-sm py-4 text-center">No pending applications.</div>
        ) : (
          <div className="space-y-4">
            {pending.map(app => (
              <div key={app.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-white">{app.full_name || app.email || `Professional #${app.professional_id}`}</div>
                    <div className="text-xs text-slate-500">{app.certification_type} · Submitted {new Date(app.submitted_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDecision(app.id, 'APPROVED')} className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-lg hover:bg-emerald-500">Approve</button>
                    <button onClick={() => setReviewingId(reviewingId === app.id ? null : app.id)} className="px-4 py-2 bg-red-600/80 text-white text-xs font-black rounded-lg hover:bg-red-500">Reject</button>
                    <button onClick={() => handleDecision(app.id, 'MORE_INFO_NEEDED')} className="px-4 py-2 bg-amber-600/80 text-white text-xs font-black rounded-lg hover:bg-amber-500">More Info</button>
                  </div>
                </div>
                {app.professional_statement && <div className="text-xs text-slate-400 bg-white/[0.02] p-3 rounded-lg">{app.professional_statement}</div>}
                {reviewingId === app.id && (
                  <div className="mt-3 flex gap-3">
                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Rejection reason..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none" />
                    <button onClick={() => handleDecision(app.id, 'REJECTED')} className="px-4 py-2 bg-red-600 text-white text-xs font-black rounded-lg">Confirm Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewed.length > 0 && (
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-black mb-4">Reviewed Applications</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                <th className="text-left py-3 px-4">Applicant</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Decision</th>
                <th className="text-left py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {reviewed.map(app => (
                <tr key={app.id} className="border-b border-white/5">
                  <td className="py-3 px-4 font-bold">{app.full_name || app.email || `#${app.professional_id}`}</td>
                  <td className="py-3 px-4">{app.certification_type}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${app.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{app.status}</span></td>
                  <td className="py-3 px-4 text-slate-400">{app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
