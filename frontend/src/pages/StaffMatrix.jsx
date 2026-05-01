import { useState, useEffect } from "react";
import API from "../services/api";

export default function StaffMatrix() {
  const [team, setTeam] = useState([]);
  const [methods, setMethods] = useState([]);
  const [auths, setAuths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantForm, setGrantForm] = useState({ user_id: "", method_id: "", expiry_date: "" });

  const loadData = async () => {
    try {
      const [teamRes, methodsRes, authsRes] = await Promise.all([
        API.get("/api/lab/team"),
        API.get("/api/methods"),
        API.get("/api/lab/authorizations")
      ]);
      setTeam(teamRes.data.data.filter(u => u.sub_role === 'LAB_TECHNICIAN'));
      setMethods(methodsRes.data.data);
      setAuths(authsRes.data.data);
    } catch (err) {
      console.error("Failed to load competency data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGrant = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/lab/authorizations", grantForm);
      alert("Staff authorization granted successfully!");
      setShowGrantModal(false);
      loadData();
    } catch (err) {
      alert("Authorization failed");
    }
  };

  const handleSuspend = async (id) => {
    if (!confirm("Suspend this technical authorization?")) return;
    try {
      await API.patch(`/api/lab/authorizations/${id}/suspend`);
      loadData();
    } catch (err) {
      alert("Suspension failed");
    }
  };

  return (
    <div className="animate-fade-in p-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold">Staff Authorization Matrix</h2>
          <p className="text-slate-400 mt-1">
            Formally link personnel to technical test methods (ISO 17025:2017 Requirement 6.2).
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowGrantModal(true)}>
          🛡️ Grant New Authorization
        </button>
      </div>

      <div className="glass-panel p-0 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
              <th className="p-4">Analyst</th>
              <th className="p-4">Authorized Method</th>
              <th className="p-4">Authorization Date</th>
              <th className="p-4">Expiry / Re-eval</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-500">Scanning competency vault...</td></tr>
            ) : auths.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-500">No personnel authorizations defined.</td></tr>
            ) : auths.map(auth => (
              <tr key={auth.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-sm text-slate-200">{auth.staff_email}</div>
                  <div className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">Certified Analyst</div>
                </td>
                <td className="p-4">
                  <span className="text-sm font-semibold text-slate-300 bg-slate-800 px-2 py-1 rounded">
                    {auth.method_name}
                  </span>
                </td>
                <td className="p-4 text-xs text-slate-400">
                  {new Date(auth.authorized_at).toLocaleDateString()}
                </td>
                <td className="p-4">
                    <span className={`text-xs ${new Date(auth.expiry_date) < new Date() ? 'text-red-400 font-bold animate-pulse' : 'text-slate-400'}`}>
                        {auth.expiry_date || "Continuous"}
                    </span>
                </td>
                <td className="p-4">
                  <span className={`pill text-[10px] ${auth.status === 'ACTIVE' ? 'pill-paid' : 'pill-cancelled'}`}>
                    {auth.status}
                  </span>
                </td>
                <td className="p-4">
                  {auth.status === 'ACTIVE' && (
                    <button onClick={() => handleSuspend(auth.id)} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-widest transition-colors">
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showGrantModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex-center p-6">
          <div className="glass-panel w-full max-w-md animate-scale-up border-white/10">
            <h3 className="text-xl font-bold mb-6">Authorize Personnel</h3>
            <form onSubmit={handleGrant} className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Select Technical Staff</label>
                <select 
                  required
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                  value={grantForm.user_id}
                  onChange={e => setGrantForm({ ...grantForm, user_id: e.target.value })}
                >
                  <option value="">Choose analyst...</option>
                  {team.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Authorized Test Method</label>
                <select 
                  required
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                  value={grantForm.method_id}
                  onChange={e => setGrantForm({ ...grantForm, method_id: e.target.value })}
                >
                  <option value="">Choose SOP / Parameter...</option>
                  {methods.map(m => <option key={m.id} value={m.id}>{m.parameter_name} ({m.method_reference})</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Authorization Expiry (Re-evaluation)</label>
                <input 
                  type="date"
                  required
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 text-sm"
                  value={grantForm.expiry_date}
                  onChange={e => setGrantForm({ ...grantForm, expiry_date: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowGrantModal(false)} className="btn-secondary flex-1">Abort</button>
                <button type="submit" className="btn-primary flex-1">Issue Authorization</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
