import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/auth';
import API, { API_BASE } from '../services/api';

export default function CertDashboard() {
  const user = getUser();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState([]);
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [renewingId, setRenewingId] = useState(null);
  const [renewStatement, setRenewStatement] = useState('');
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewSuccess, setRenewSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [credRes, appRes, proRes] = await Promise.all([
          API.get('/api/cert/credentials').catch(() => ({ data: { data: [] } })),
          API.get('/api/cert/applications').catch(() => ({ data: { data: [] } })),
          API.get('/api/cert/profile').catch(() => ({ data: { data: null } })),
        ]);
        setCredentials(credRes.data.data || []);
        setApplications(appRes.data.data || []);
        setProfile(proRes.data.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, []);

  const downloadCertificate = async (cred) => {
    setDownloading(cred.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/cert/credentials/${cred.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QualiCore-${cred.credential_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download certificate. Please try again.');
    }
    setDownloading(null);
  };

  const submitRenewal = async (credId) => {
    setRenewLoading(true);
    try {
      await API.post(`/api/cert/credentials/${credId}/renew`, { professional_statement: renewStatement });
      setRenewingId(null);
      setRenewStatement('');
      setRenewSuccess(true);
      setTimeout(() => setRenewSuccess(false), 4000);
    } catch (e) {
      alert(e.response?.data?.error || 'Renewal failed. Please try again.');
    }
    setRenewLoading(false);
  };

  const activeCount = credentials.filter(c => c.status === 'ACTIVE').length;
  const pendingCount = applications.filter(a => ['SUBMITTED', 'UNDER_REVIEW', 'COMMITTEE_REVIEW'].includes(a.status)).length;
  const expiringCount = credentials.filter(c => {
    if (!c.expiry_date || c.status !== 'ACTIVE') return false;
    const diff = new Date(c.expiry_date) - new Date();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  }).length;

  const daysUntil = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Welcome */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-1">
            Welcome, <span className="text-teal-400">{profile?.full_name || user.email}</span>
          </h1>
          <p className="text-slate-500 text-sm">{profile?.specialization && `${profile.specialization} · `}{profile?.institution || 'Complete your profile to get started'}</p>
        </div>
        {!profile?.full_name && (
          <button onClick={() => navigate('/profile')} className="px-5 py-2.5 bg-amber-600/80 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-amber-500 transition-all flex items-center gap-2">
            ⚠️ Complete Profile
          </button>
        )}
      </div>

      {/* Renewal success banner */}
      {renewSuccess && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm font-bold">
          <span className="text-xl">✓</span> Renewal application submitted. You will be notified by email.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#0f172a] border border-teal-500/20 rounded-2xl p-6">
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Active Credentials</div>
          <div className="text-4xl font-black text-teal-400">{activeCount}</div>
          <div className="text-xs text-slate-600 mt-1">Verified & current</div>
        </div>
        <div className="bg-[#0f172a] border border-amber-500/20 rounded-2xl p-6">
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Pending Applications</div>
          <div className="text-4xl font-black text-amber-400">{pendingCount}</div>
          <div className="text-xs text-slate-600 mt-1">Under review</div>
        </div>
        <div className="bg-[#0f172a] border border-red-500/20 rounded-2xl p-6">
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Expiring &lt;90 days</div>
          <div className="text-4xl font-black text-red-400">{expiringCount}</div>
          <div className="text-xs text-slate-600 mt-1">{expiringCount > 0 ? 'Action required' : 'All good'}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-10">
        <a href="/apply" className="px-5 py-2.5 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all">🎓 Apply for Certification</a>
        <a href="/profile" className="px-5 py-2.5 bg-white/5 text-white font-bold text-xs uppercase tracking-widest rounded-xl border border-white/10 hover:border-teal-500/30 transition-all">👤 Edit Profile</a>
        <a href="/registry" className="px-5 py-2.5 bg-white/5 text-white font-bold text-xs uppercase tracking-widest rounded-xl border border-white/10 hover:border-white/20 transition-all">🔍 Public Registry</a>
      </div>

      {/* Credentials */}
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-black mb-5">My Credentials</h2>
        {credentials.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">🎓</div>
            <div className="text-slate-500 text-sm">No credentials yet.</div>
            <a href="/apply" className="mt-4 inline-block text-xs text-teal-400 font-bold hover:underline">Apply for your first certification →</a>
          </div>
        ) : (
          <div className="space-y-4">
            {credentials.map(c => {
              const days = c.expiry_date ? daysUntil(c.expiry_date) : null;
              const isExpiring = days !== null && days <= 90 && days > 0;
              const isExpired = c.status === 'EXPIRED' || (days !== null && days <= 0);
              return (
                <div key={c.id} className={`p-5 rounded-2xl border transition-all ${isExpired ? 'border-red-500/20 bg-red-500/5' : isExpiring ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {c.status}
                        </span>
                        {isExpiring && <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">⚠️ Expires in {days}d</span>}
                      </div>
                      <div className="text-base font-black text-white mb-1">{c.credential_type}</div>
                      <div className="font-mono text-teal-400 text-xs mb-2">{c.credential_number}</div>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Issued</div>
                          <div className="text-slate-400">{c.issued_date || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Expires</div>
                          <div className={isExpired ? 'text-red-400' : isExpiring ? 'text-amber-400' : 'text-slate-400'}>{c.expiry_date || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Authority</div>
                          <div className="text-slate-400 truncate">{c.issuing_authority}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {c.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => downloadCertificate(c)}
                            disabled={downloading === c.id}
                            className="px-4 py-2 bg-teal-600 text-white text-xs font-black rounded-xl hover:bg-teal-500 transition-all disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {downloading === c.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '⬇️'}
                            Download PDF
                          </button>
                          <a
                            href={`/verify/${c.credential_number}`}
                            target="_blank"
                            className="px-4 py-2 bg-white/5 text-slate-400 text-xs font-bold rounded-xl border border-white/10 hover:border-white/20 transition-all text-center"
                          >
                            🔍 Verify
                          </a>
                          {isExpiring && (
                            <button
                              onClick={() => setRenewingId(renewingId === c.id ? null : c.id)}
                              className="px-4 py-2 bg-amber-600/80 text-white text-xs font-black rounded-xl hover:bg-amber-500 transition-all"
                            >
                              🔄 Renew
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Renewal panel */}
                  {renewingId === c.id && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Renewal Statement</div>
                      <textarea
                        rows={3}
                        value={renewStatement}
                        onChange={e => setRenewStatement(e.target.value)}
                        placeholder="Briefly describe any updates to your qualifications since your last certification..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-amber-500 transition-all resize-none placeholder:text-slate-700"
                      />
                      <div className="flex gap-3 mt-3">
                        <button onClick={() => setRenewingId(null)} className="px-4 py-2 bg-white/5 text-white text-xs font-bold rounded-lg border border-white/10">Cancel</button>
                        <button
                          onClick={() => submitRenewal(c.id)}
                          disabled={renewLoading}
                          className="px-6 py-2 bg-amber-600 text-white text-xs font-black rounded-lg hover:bg-amber-500 transition-all disabled:opacity-50"
                        >
                          {renewLoading ? 'Submitting...' : 'Submit Renewal Application'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Application history */}
      {applications.length > 0 && (
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-black mb-5">Application History</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5">
                <th className="text-left py-3 px-4">Certification</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Submitted</th>
                <th className="text-left py-3 px-4">Reviewed</th>
                <th className="text-left py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(a => {
                const statusColors = {
                  SUBMITTED: 'bg-amber-500/10 text-amber-400',
                  UNDER_REVIEW: 'bg-blue-500/10 text-blue-400',
                  COMMITTEE_REVIEW: 'bg-purple-500/10 text-purple-400',
                  APPROVED: 'bg-emerald-500/10 text-emerald-400',
                  REJECTED: 'bg-red-500/10 text-red-400',
                  MORE_INFO_NEEDED: 'bg-orange-500/10 text-orange-400',
                };
                return (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-bold text-white">{a.certification_type}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${statusColors[a.status] || 'bg-white/10 text-white'}`}>{a.status.replace(/_/g, ' ')}</span></td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{new Date(a.submitted_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{a.reviewed_at ? new Date(a.reviewed_at).toLocaleDateString() : '—'}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs max-w-[200px] truncate">{a.decision_notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
