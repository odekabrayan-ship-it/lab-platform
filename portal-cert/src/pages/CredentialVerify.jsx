import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../services/api';

export default function CredentialVerify() {
  const { credentialNumber } = useParams();
  const [query, setQuery] = useState(credentialNumber || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (credentialNumber) { handleVerify(credentialNumber); }
  }, [credentialNumber]);

  const handleVerify = async (num) => {
    const target = (num || query).trim().toUpperCase();
    if (!target) return;
    setLoading(true);
    setSearched(false);
    try {
      const res = await API.get(`/api/cert/verify/${target}`);
      setResult(res.data);
      setSearched(true);
    } catch (e) {
      setResult({ verified: false, data: null });
      setSearched(true);
    }
    setLoading(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-teal-600/20 border border-teal-500/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🔍</div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Credential Verification</h1>
        <p className="text-slate-500 text-sm">Enter a QualiCore credential number to instantly verify its authenticity and current status.</p>
      </div>

      {/* Search box */}
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            placeholder="e.g. QC-LAB-ABCD123"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:border-teal-500 placeholder:text-slate-700 uppercase"
          />
          <button
            onClick={() => handleVerify()}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🔍'} Verify
          </button>
        </div>
        <p className="text-[11px] text-slate-700 mt-3">Format: QC-XXX-XXXXXXXX · Credential numbers are printed on issued certificates</p>
      </div>

      {/* Result */}
      {searched && result && (
        <div className={`rounded-2xl border p-8 transition-all ${result.verified ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          {/* Status banner */}
          <div className={`flex items-center gap-4 mb-8 p-4 rounded-xl ${result.verified ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${result.verified ? 'bg-emerald-600' : 'bg-red-600'}`}>
              {result.verified ? '✓' : '✗'}
            </div>
            <div>
              <div className={`text-2xl font-black ${result.verified ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.verified ? 'Credential Verified' : result.isExpired ? 'Credential Expired' : 'Not Found'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Checked at {new Date(result.checkedAt || Date.now()).toLocaleString()}
              </div>
            </div>
          </div>

          {result.data ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: 'Credential Holder', value: result.data.full_name, highlight: true },
                  { label: 'Credential Type', value: result.data.credential_type, highlight: true },
                  { label: 'Credential Number', value: result.data.credential_number, mono: true },
                  { label: 'Issuing Authority', value: result.data.issuing_authority },
                  { label: 'Institution', value: result.data.institution || '—' },
                  { label: 'Specialization', value: result.data.specialization || '—' },
                  { label: 'Issue Date', value: formatDate(result.data.issued_date) },
                  { label: 'Expiry Date', value: formatDate(result.data.expiry_date) },
                ].map(f => (
                  <div key={f.label} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{f.label}</div>
                    <div className={`text-sm font-bold ${f.highlight ? 'text-white' : f.mono ? 'text-teal-400 font-mono text-xs' : 'text-slate-300'}`}>
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status badge */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase border ${result.data.status === 'ACTIVE' && result.verified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {result.isExpired ? 'EXPIRED' : result.data.status}
                </span>
                {result.data.verification_hash && (
                  <div className="text-[10px] text-slate-700 font-mono">Hash: {result.data.verification_hash.substring(0, 16)}...</div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-slate-400 text-sm">No credential found with number <strong className="text-white font-mono">{query}</strong>.</p>
              <p className="text-slate-600 text-xs mt-2">Please check the credential number and try again. If you believe this is an error, contact the issuing authority.</p>
            </div>
          )}
        </div>
      )}

      {/* Info box */}
      {!searched && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🔐', title: 'Tamper-Proof', desc: 'Each credential has a unique verification hash that cannot be forged.' },
            { icon: '⚡', title: 'Instant Check', desc: 'Verification results are returned in real-time from the live registry.' },
            { icon: '🌍', title: 'Publicly Accessible', desc: 'Anyone can verify a credential. No account or login required.' },
          ].map(f => (
            <div key={f.title} className="p-4 bg-[#0f172a] border border-white/5 rounded-xl text-center">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-xs font-black text-white mb-1">{f.title}</div>
              <div className="text-[11px] text-slate-600">{f.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
