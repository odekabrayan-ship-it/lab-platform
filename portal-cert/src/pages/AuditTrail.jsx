import { useState, useEffect } from 'react';
import API from '../services/api';

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await API.get('/api/cert/audit');
        setLogs(res.data.data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight mb-2">Certification Audit Trail</h1>
      <p className="text-slate-500 text-sm mb-10">Complete audit log of all certification actions</p>

      <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading audit log...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No audit events recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                <th className="text-left py-4 px-6">Timestamp</th>
                <th className="text-left py-4 px-6">Action</th>
                <th className="text-left py-4 px-6">Performed By</th>
                <th className="text-left py-4 px-6">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-4 px-6 text-slate-400 text-xs font-mono">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                      log.action.includes('APPROVED') ? 'bg-emerald-500/10 text-emerald-400' :
                      log.action.includes('REJECTED') ? 'bg-red-500/10 text-red-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>{log.action}</span>
                  </td>
                  <td className="py-4 px-6 text-white/60">{log.performed_by_email || `User #${log.performed_by}`}</td>
                  <td className="py-4 px-6 text-slate-500 text-xs max-w-xs truncate">{log.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
