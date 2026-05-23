import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/api/login", form);
      const { token, user } = res.data.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Intelligent Portal Routing
      if (user.role === "admin") navigate("/admin/nexus");
      else if (user.role === "client") navigate(user.verification_status === "NEW" ? "/complete-profile" : "/company-dashboard");
      else if (user.role === "lab") navigate(user.verification_status === "NEW" ? "/complete-lab-profile" : "/dashboard");
      else if (user.role === "professional") navigate("/professional-profile");
      else if (user.role === "consumer") navigate("/consumer-hub");
      else navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials or unauthorized access.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] relative flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* Cinematic Authority Background */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(99,102,241,0.03)_0%,_transparent_50%)] pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 blur-[150px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10 animate-scale-up">
            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-8 flex items-center justify-center text-4xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] rotate-3 hover:rotate-0 transition-transform duration-500">
                    <span className="font-black text-white italic">Q</span>
                </div>
                <h1 className="text-4xl font-bold tracking-tighter mb-3">Gateway Entry</h1>
                <p className="text-slate-500 font-medium uppercase text-[10px] tracking-[0.3em]">QualiCore Sovereign Network</p>
            </div>

            <div className="glass-panel p-10 border-white/5 bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-500"></div>
                
                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold mb-8 animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Identity Reference</label>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">📧</span>
                            <input 
                                type="email" 
                                required 
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm focus:border-indigo-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700"
                                placeholder="name@institution.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-3 ml-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Master Key</label>
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest cursor-pointer hover:text-indigo-300">Lost Key?</span>
                        </div>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">🔑</span>
                            <input 
                                type="password" 
                                required 
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm focus:border-indigo-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>Authorize Entry <span className="text-lg">→</span></>
                        )}
                    </button>
                </form>

                <div className="mt-12 pt-8 border-t border-white/5 text-center">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
                        Secure Transmission Encrypted <br />
                        AES-256 Authority Standard
                    </p>
                </div>
            </div>
            
            <div className="text-center mt-10">
                <span className="text-slate-500 text-sm">New to the Authority?</span>{" "}
                <Link to="/register" className="text-emerald-400 font-bold text-sm hover:text-emerald-300 transition-colors">Register Identity</Link>
            </div>
        </div>
    </div>
  );
}
