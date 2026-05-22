import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await API.get(\`/api/invitations/\${token}\`);
        setInvite(res.data.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid or expired invitation link.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    try {
      await API.post(\`/api/invitations/\${token}/accept\`, { password });
      
      // Auto login
      const loginRes = await API.post('/api/auth/login', { email: invite.email, password });
      localStorage.setItem('qualicore_token', loginRes.data.data.token);
      localStorage.setItem('qualicore_user', JSON.stringify(loginRes.data.data.user));
      
      navigate('/dashboard'); // or appropriate redirect based on role
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center text-white">
        <div className="animate-pulse">Loading invitation details...</div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-white/5 border border-red-500/30 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 text-2xl">✕</div>
          <h2 className="text-xl font-bold mb-2">Invitation Error</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button onClick={() => navigate('/login')} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors font-semibold">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 inline-block mb-2">
            QualiCore
          </h1>
          <p className="text-slate-400 uppercase tracking-widest text-xs font-bold">Platform Invitation</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-1">Welcome aboard</h2>
            <p className="text-slate-400 text-sm">You have been invited to join the platform.</p>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-4 mb-6 border border-white/5">
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Invited As</div>
            <div className="font-semibold text-lg">{invite.email}</div>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] uppercase font-black tracking-wider rounded">
                Role: {invite.role}
              </span>
              {invite.sub_role && (
                <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-[10px] uppercase font-black tracking-wider rounded">
                  {invite.sub_role.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Set Password</label>
              <input 
                type="password" 
                required 
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-4 bg-black/20 border border-white/10 rounded-xl outline-none focus:border-blue-500 transition-colors"
                placeholder="Minimum 8 characters"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Confirm Password</label>
              <input 
                type="password" 
                required 
                minLength={8}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full p-4 bg-black/20 border border-white/10 rounded-xl outline-none focus:border-blue-500 transition-colors"
                placeholder="Confirm your password"
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
            >
              {submitting ? 'Creating Account...' : 'Accept Invitation & Join'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
