import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { setSession } from '../services/auth';

export default function CertLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/api/login', { ...form, portal: 'cert' });
      const { token, user } = res.data.data;
      if (!['professional', 'admin'].includes(user.role)) {
        setError('Access denied: Professional or Admin credentials required.');
        return;
      }
      setSession(token, user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials or unauthorized access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] relative flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(20,184,166,0.04)_0%,_transparent_50%)] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/5 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-teal-600 rounded-3xl mx-auto mb-8 flex items-center justify-center text-4xl shadow-[0_20px_50px_rgba(20,184,166,0.3)] rotate-3 hover:rotate-0 transition-transform duration-500">
            <span className="font-black text-white italic">Q</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter mb-3 text-white">Professional Gateway</h1>
          <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.3em]">QualiCore Certification Authority</p>
        </div>
        <div className="glass-panel p-10 border-white/5 bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-cyan-400"></div>
          {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold mb-8">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Professional Identity</label>
              <input type="email" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-teal-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" placeholder="professional@institution.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Credential Key</label>
              <input type="password" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-teal-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" placeholder="••••••••" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-5 rounded-2xl bg-teal-600 text-white font-black text-xs uppercase tracking-widest hover:bg-teal-500 transition-all shadow-[0_20px_40px_-10px_rgba(20,184,166,0.4)] flex items-center justify-center gap-3 disabled:opacity-50">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Access Certification Portal <span className="text-lg">→</span></>}
            </button>
          </form>
          <div className="mt-12 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-4">
              Need an account? <Link to="/register" className="text-teal-400 hover:underline">Register Here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
