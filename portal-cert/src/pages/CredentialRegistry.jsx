import { useState, useEffect } from 'react';
import API from '../services/api';

export default function CredentialRegistry() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/cert/registry', { params: { search } });
      setResults(res.data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { doSearch(); }, []);

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight mb-2">Professional Credential Registry</h1>
      <p className="text-slate-500 text-sm mb-10">Search and verify professional certifications</p>

      <div className="flex gap-4 mb-8">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder="Search by name, credential number, or specialization..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm text-white focus:border-teal-500 outline-none placeholder:text-slate-600" />
        <button onClick={doSearch} className="px-8 py-4 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all">Search</button>
      </div>

      <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Searching...</div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No credentials found. Try a different search term.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                <th className="text-left py-4 px-6">Professional</th>
                <th className="text-left py-4 px-6">Credential</th>
                <th className="text-left py-4 px-6">Number</th>
                <th className="text-left py-4 px-6">Status</th>
                <th className="text-left py-4 px-6">Issued</th>
                <th className="text-left py-4 px-6">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-4 px-6">
                    <div className="font-bold text-white">{r.full_name || 'N/A'}</div>
                    <div className="text-xs text-slate-500">{r.specialization || ''}</div>
                  </td>
                  <td className="py-4 px-6 font-bold">{r.credential_type}</td>
                  <td className="py-4 px-6 font-mono text-teal-400 text-xs">{r.credential_number}</td>
                  <td className="py-4 px-6"><span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400">{r.status}</span></td>
                  <td className="py-4 px-6 text-slate-400">{r.issued_date || '—'}</td>
                  <td className="py-4 px-6 text-slate-400">{r.expiry_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
