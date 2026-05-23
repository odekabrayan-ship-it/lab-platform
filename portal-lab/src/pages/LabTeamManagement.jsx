import { useState, useEffect } from "react";
import API from "../services/api";

export default function LabTeamManagement() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", password: "", sub_role: "" });
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const loadTeam = async () => {
    try {
      const res = await API.get("/api/lab/team");
      setTeam(res.data.data);
    } catch (err) {
      console.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/lab/team/invite", inviteForm);
      alert("Team member invited successfully!");
      setInviteForm({ email: "", password: "", sub_role: "" });
      setShowInviteModal(false);
      loadTeam();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to invite user");
    }
  };

  const handleRemove = async (id) => {
    if (!confirm("Are you sure you want to remove this user's access?")) return;
    try {
      await API.delete(`/api/lab/team/${id}`);
      setTeam(team.filter(u => u.id !== id));
    } catch (err) {
      alert("Failed to remove user");
    }
  };

  const isDirector = !user.sub_role;
  const isHR = user.sub_role === 'HR_MANAGER';
  const isManager = user.sub_role === 'LAB_MANAGER';

  if (!isDirector && !isHR && !isManager) {
    return <div style={{ padding: 40, textAlign: 'center' }}>You do not have permission to view this page. Administrative authority is required.</div>;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 className="text-gradient" style={{ margin: 0 }}>🔬 Laboratory Team Management</h2>
          <p className="text-muted" style={{ marginTop: 6 }}>
            Manage Role-Based Access Control (RBAC) for your laboratory staff.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
          ➕ Add Staff Member
        </button>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff Email</th>
              <th>Role</th>
              <th>Access Level</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>{user.email} (You)</td>
              <td><span className="pill pill-paid">Lab Director</span></td>
              <td className="text-xs text-muted">Administrative / Full Access</td>
              <td className="text-muted">—</td>
              <td>—</td>
            </tr>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Loading team...</td></tr>
            ) : team.map(member => (
              <tr key={member.id}>
                <td style={{ fontWeight: 600 }}>{member.email}</td>
                <td>
                  <span className={`pill ${
                    member.sub_role === 'LAB_MANAGER' ? 'pill-paid' : 
                    member.sub_role === 'LAB_REVIEWER' ? 'pill-review' : 'pill-completed'
                  }`}>
                    {member.sub_role.replace('LAB_', '').replace('_', ' ')}
                  </span>
                </td>
                <td className="text-xs">
                    {member.sub_role === 'LAB_TECHNICIAN' && "Sample Entry & Testing"}
                    {member.sub_role === 'LAB_REVIEWER' && "Maker-Checker / Validation"}
                    {member.sub_role === 'LAB_MANAGER' && "Operations & Quality Oversight"}
                </td>
                <td className="text-muted">{new Date(member.created_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleRemove(member.id)} className="btn-sm btn-danger text-xs px-2 py-1">
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInviteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 450, position: 'relative' }}>
            <h3 style={{ margin: '0 0 16px' }}>Add Staff Member</h3>
            
            <form onSubmit={handleInvite}>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#475569' }}>Email Address</label>
                    <input
                        type="email"
                        required
                        className="w-full p-2 rounded border border-slate-200"
                        value={inviteForm.email}
                        onChange={e => setInviteForm({...inviteForm, email: e.target.value})}
                        placeholder="staff@lab.com"
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#475569' }}>Temporary Password</label>
                    <input
                        type="password"
                        required
                        className="w-full p-2 rounded border border-slate-200"
                        value={inviteForm.password}
                        onChange={e => setInviteForm({...inviteForm, password: e.target.value})}
                    />
                </div>
                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#475569' }}>Assign Role</label>
                    <select
                        required
                        className="w-full p-2 rounded border border-slate-200"
                        value={inviteForm.sub_role}
                        onChange={e => setInviteForm({...inviteForm, sub_role: e.target.value})}
                    >
                        <option value="">-- Select Professional Role --</option>
                        {isDirector && (
                            <option value="HR_MANAGER">HR Manager (Recruitment & Talent)</option>
                        )}
                        {isHR && (
                            <>
                                <option value="LAB_MANAGER">Laboratory Manager (Operations)</option>
                                <option value="ACCOUNTANT">Lab Accountant (Finance)</option>
                                <option value="REGISTRAR">Sample Registrar (Intake)</option>
                                <option value="PROCUREMENT_OFFICER">Procurement Officer (Supply Chain)</option>
                            </>
                        )}
                        {isManager && (
                            <>
                                <option value="LAB_TECHNICIAN">Lab Technician (Testing)</option>
                                <option value="LAB_REVIEWER">Technical Reviewer (Maker-Checker)</option>
                                <option value="QUALITY_MANAGER">Quality Manager (QA/QC)</option>
                                <option value="EQUIPMENT_SPECIALIST">Equipment Specialist</option>
                            </>
                        )}
                    </select>
                    <p className="text-xs text-muted mt-2">
                        * Technicians can enter data but cannot validate their own work (ISO 17025).
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => setShowInviteModal(false)} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Create Account</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
