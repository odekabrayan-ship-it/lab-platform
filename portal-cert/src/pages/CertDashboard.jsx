import { useState, useEffect } from 'react';
import { getUser } from '../services/auth';
import API from '../services/api';

export default function CertDashboard() {
  const user = getUser();
  const [credentials, setCredentials] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [credRes, appRes] = await Promise.all([
          API.get('/api/cert/credentials').catch(() => ({ data: { data: [] } })),
          API.get('/api/cert/applications').catch(() => ({ data: { data: [] } }))
        ]);
        setCredentials(credRes.data.data || []);
        setApplications(appRes.data.data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, []);

  const activeCount = credentials.filter(c => c.status === 'ACTIVE').length;
  const pendingCount = applications.filter(a => a.status === 'SUBMITTED').length;
  const expiringCount = credentials.filter(c => {
    if (!c.expiry_date) return false;
    const diff = new Date(c.expiry_date) - new Date();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight mb-2">Welcome back, <span className="text-teal-400">{user.email}</span></h1>
        <p className="text-slate-500 text-sm">Your professional certification overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#0f172a] border border-teal-500/20 rounded-2xl p-6">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Active Credentials</div>
          <div className="text-4xl font-black text-teal-400">{activeCount}</div>
        </div>
        <div className="bg-[#0f172a] border border-amber-500/20 rounded-2xl p-6">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pending Applications</div>
          <div className="text-4xl font-black text-amber-400">{pendingCount}</div>
        </div>
        <div className="bg-[#0f172a] border border-red-500/20 rounded-2xl p-6">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Expiring Soon</div>
          <div className="text-4xl font-black text-red-400">{expiringCount}</div>
        </div>
      </div>

      <div className="flex gap-4 mb-10">
        <a href="/apply" className="px-6 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all">Apply for Certification</a>
        <a href="/registry" className="px-6 py-3 bg-white/5 text-white font-bold text-xs uppercase tracking-widest rounded-xl border border-white/10 hover:border-teal-500/30 transition-all">View Registry</a>
      </div>

      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-black mb-4">My Credentials</h2>
        {loading ? (
          <div className="text-slate-500 text-sm">Loading...</div>
        ) : credentials.length === 0 ? (
          <div className="text-slate-500 text-sm py-8 text-center">No credentials yet. Apply for your first certification to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Number</th>
                <th className="text-left py-3 px-4">Authority</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-bold">{c.credential_type}</td>
                  <td className="py-3 px-4 font-mono text-teal-400 text-xs">{c.credential_number}</td>
                  <td className="py-3 px-4 text-slate-400">{c.issuing_authority}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{c.status}</span></td>
                  <td className="py-3 px-4 text-slate-400">{c.expiry_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
