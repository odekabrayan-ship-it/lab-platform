import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";

const PersonaCard = ({ icon, title, desc, selected, onClick }) => (
    <div 
        onClick={onClick}
        className={`p-8 rounded-[2rem] border-2 transition-all duration-500 cursor-pointer relative overflow-hidden group ${
            selected 
            ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_40px_rgba(99,102,241,0.2)] scale-[1.02]' 
            : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
        }`}
    >
        {selected && (
            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center animate-scale-up">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
            </div>
        )}
        <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-500">{icon}</div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
);

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ 
    email: "", 
    password: "", 
    confirmPassword: "",
    role: "consumer"
  });
  const [error, setError] = useState("");
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

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
      const payload = { email: form.email, password: form.password, role: form.role };
      await API.post("/api/register", payload);
      const loginRes = await API.post("/api/login", { email: form.email, password: form.password });
      localStorage.setItem("token", loginRes.data.data.token);
      localStorage.setItem("user", JSON.stringify(loginRes.data.data.user));
      
      // Intelligent Onboarding Redirection
      const { role } = form;
      if (role === "consumer") navigate("/consumer-hub");
      else if (role === "client") navigate("/complete-profile");
      else if (role === "lab") navigate("/complete-lab-profile");
      else navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Verification server unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] relative flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* Cinematic Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(99,102,241,0.05)_0%,_transparent_50%)] pointer-events-none"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-fuchsia-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-5xl relative z-10">
            <div className="text-center mb-16 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Sovereign Onboarding Protocol v4.0
                </div>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4">
                    Join the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">QualiCore</span> Network.
                </h1>
                <p className="text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
                    Choose your institutional identity to begin. Whether you're a health-conscious consumer or a global analytical lab, your trust starts here.
                </p>
            </div>

            {step === 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-scale-up max-w-3xl mx-auto">
                    <PersonaCard 
                        icon="🛡️"
                        title="Guardian"
                        desc="Public consumers concerned about health. Access the Trust Registry and report signals."
                        selected={form.role === 'consumer'}
                        onClick={() => setForm({ ...form, role: 'consumer' })}
                    />
                    <PersonaCard 
                        icon="🏢"
                        title="Industrial Entity"
                        desc="Manufacturers, Labs, or Retailers. Scale your audit network and compliance claims."
                        selected={form.role === 'client' || form.role === 'lab'}
                        onClick={() => setForm({ ...form, role: 'client' })}
                    />

                    <div className="md:col-span-2 flex justify-center mt-12">
                        <button 
                            onClick={() => setStep(2)}
                            className="px-12 py-5 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all flex items-center gap-4 shadow-xl shadow-indigo-600/20"
                        >
                            Establish Identity Protocol <span className="text-xl">→</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="max-w-md mx-auto animate-scale-up">
                    <div className="glass-panel p-10 border-white/5 bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500"></div>
                        
                        <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8 hover:text-white transition-colors">
                            ← Reset Identity
                        </button>

                        <h2 className="text-2xl font-bold mb-8">Secure Credentials</h2>
                        
                        {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold mb-6">{error}</div>}

                        <form onSubmit={handleRegister} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Email Identity</label>
                                <input 
                                    type="email" 
                                    required 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm focus:border-indigo-500 focus:bg-white/10 outline-none transition-all"
                                    placeholder="name@institution.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Master Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm focus:border-indigo-500 focus:bg-white/10 outline-none transition-all mb-2"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                />
                                {/* Password Strength Indicator */}
                                {form.password.length > 0 && (
                                    <div className="flex items-center gap-2">
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
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Confirm Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm focus:border-indigo-500 focus:bg-white/10 outline-none transition-all"
                                    placeholder="••••••••"
                                    value={form.confirmPassword}
                                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                />
                                {form.confirmPassword && form.password !== form.confirmPassword && (
                                    <p className="text-red-400 text-[10px] font-bold mt-2">Passwords do not match</p>
                                )}
                            </div>

                            {form.role !== 'consumer' && (
                                <div className="animate-fade-in pt-2">
                                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Detailed Entity Type</label>
                                    <select 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm focus:border-indigo-500 outline-none transition-all"
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    >
                                        <option value="client">Manufacturing Company</option>
                                        <option value="lab">Analytical Laboratory</option>
                                    </select>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={loading || form.password !== form.confirmPassword || pwdStrength.score < 2}
                                className="w-full py-5 mt-4 rounded-2xl bg-white text-[#020617] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl disabled:opacity-50"
                            >
                                {loading ? "Decrypting Protocol..." : "Finalize Registration"}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                By joining, you adhere to the QualiCore Sovereign Trust Accord.
                            </p>
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <a href="http://certification-rosy.vercel.app" className="text-teal-400 text-xs font-bold hover:underline">
                                    Are you a Technical Professional? →
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center mt-8">
                        <span className="text-slate-500 text-sm">Already a member?</span>{" "}
                        <Link to="/login" className="text-indigo-400 font-bold text-sm hover:text-indigo-300 transition-colors">Return to Gateway</Link>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}
