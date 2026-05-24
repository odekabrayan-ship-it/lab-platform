import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { setSession } from '../services/auth';

export default function CertRegister() {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwdStrength, setPwdStrength] = useState({ score: 0, label: '', color: 'bg-slate-700' });
  const navigate = useNavigate();

  // Evaluate Password Strength
  useEffect(() => {
    let score = 0;
    if (form.password.length > 7) score += 1;
    if (/[A-Z]/.test(form.password)) score += 1;
    if (/[0-9]/.test(form.password)) score += 1;
    if (/[^A-Za-z0-9]/.test(form.password)) score += 1;

    if (form.password.length === 0) setPwdStrength({ score: 0, label: '', color: 'bg-slate-700' });
    else if (score < 2) setPwdStrength({ score, label: 'Weak', color: 'bg-red-500' });
    else if (score === 2) setPwdStrength({ score, label: 'Fair', color: 'bg-amber-500' });
    else if (score === 3) setPwdStrength({ score, label: 'Good', color: 'bg-blue-500' });
    else setPwdStrength({ score, label: 'Strong', color: 'bg-emerald-500' });
  }, [form.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
    }
    if (pwdStrength.score < 2) {
        setError("Please choose a stronger password.");
        return;
    }

    setLoading(true);
    try {
      // Register specifically as a professional
      await API.post('/api/register', { email: form.email, password: form.password, role: 'professional' });
      
      // Auto login
      const res = await API.post('/api/login', { email: form.email, password: form.password, portal: 'cert' });
      const { token, user } = res.data.data;
      
      if (!['professional', 'admin'].includes(user.role)) {
        setError('Access denied: Professional role mapping failed.');
        return;
      }
      setSession(token, user);
      
      // Send new professionals straight to profile setup
      navigate('/profile');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] relative flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(20,184,166,0.04)_0%,_transparent_50%)] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/5 blur-[150px] rounded-full pointer-events-none"></div>
      
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-teal-600 rounded-3xl mx-auto mb-8 flex items-center justify-center text-4xl shadow-[0_20px_50px_rgba(20,184,166,0.3)] hover:rotate-6 transition-transform duration-500">
            <span className="font-black text-white italic">Q</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter mb-3 text-white">Join the Authority</h1>
          <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.3em]">QualiCore Technical Professional</p>
        </div>
        
        <div className="glass-panel p-10 border-white/5 bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-cyan-400"></div>
          
          {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold mb-8">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Professional Email</label>
              <input 
                type="email" 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-teal-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                placeholder="analyst@institution.com" 
                value={form.email} 
                onChange={(e) => setForm({...form, email: e.target.value})} 
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Secure Credential Key</label>
              <input 
                type="password" 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-teal-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700 mb-2" 
                placeholder="••••••••" 
                value={form.password} 
                onChange={(e) => setForm({...form, password: e.target.value})} 
              />
              {form.password.length > 0 && (
                <div className="flex items-center gap-2 ml-1">
                    <div className="flex-1 flex gap-1 h-1.5">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className={`flex-1 rounded-full ${s <= pwdStrength.score ? pwdStrength.color : 'bg-white/5'}`}></div>
                        ))}
                    </div>
                    <span className={`text-[10px] font-bold ${pwdStrength.color.replace('bg-', 'text-')}`}>{pwdStrength.label}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Confirm Credential Key</label>
              <input 
                type="password" 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-teal-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                placeholder="••••••••" 
                value={form.confirmPassword} 
                onChange={(e) => setForm({...form, confirmPassword: e.target.value})} 
              />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-red-400 text-[10px] font-bold mt-2 ml-1">Keys do not match</p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading || form.password !== form.confirmPassword || pwdStrength.score < 2} 
              className="w-full py-5 mt-4 rounded-2xl bg-teal-600 text-white font-black text-xs uppercase tracking-widest hover:bg-teal-500 transition-all shadow-[0_20px_40px_-10px_rgba(20,184,166,0.4)] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>Establish Professional Identity <span className="text-lg">→</span></>}
            </button>
          </form>
          
          <div className="mt-10 pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">By joining, you adhere to the QualiCore Code of Technical Ethics.</p>
          </div>
        </div>

        <div className="text-center mt-8">
          <span className="text-slate-500 text-sm">Already certified?</span>{" "}
          <Link to="/login" className="text-teal-400 font-bold text-sm hover:text-teal-300 transition-colors">Access Portal</Link>
        </div>
      </div>
    </div>
  );
}
