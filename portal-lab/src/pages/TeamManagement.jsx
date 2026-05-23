import { useState, useEffect } from "react";
import API from "../services/api";

export default function TeamManagement() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("QA_TECHNICIAN");
  const [tempPassword, setTempPassword] = useState(null);
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const loadTeam = async () => {
    try {
      const res = await API.get("/api/team");
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
      const res = await API.post("/api/team/invite", { email: inviteEmail, sub_role: inviteRole });
      setTempPassword({ email: inviteEmail, password: res.data.data.tempPassword });
      setInviteEmail("");
      loadTeam();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to invite user");
    }
  };

  const handleRemove = async (id) => {
    if (!confirm("Are you sure you want to remove this user's access?")) return;
    try {
      await API.delete(`/api/team/${id}`);
      setTeam(team.filter(u => u.id !== id));
    } catch (err) {
      alert("Failed to remove user");
    }
  };

  if (user.sub_role) {
    return <div style={{ padding: 40, textAlign: 'center' }}>You do not have permission to view this page.</div>;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 className="text-gradient" style={{ margin: 0 }}>👥 Enterprise Team Management</h2>
          <p className="text-muted" style={{ marginTop: 6 }}>
            Manage Role-Based Access Control (RBAC) for your company's users.
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setShowInviteModal(true); setTempPassword(null); }}>
          ➕ Invite Team Member
        </button>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>User Email</th>
              <th>Role</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>{user.email} (You)</td>
              <td><span className="pill pill-review">Company Owner</span></td>
              <td className="text-muted">—</td>
              <td>—</td>
            </tr>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: 'center' }}>Loading team...</td></tr>
            ) : team.map(member => (
              <tr key={member.id}>
                <td style={{ fontWeight: 600 }}>{member.email}</td>
                <td>
                  <span className={`pill ${
                    member.sub_role === 'PROCUREMENT_MANAGER' ? 'pill-paid' : 
                    member.sub_role === 'QA_TECHNICIAN' ? 'pill-review' : 'pill-completed'
                  }`}>
                    {member.sub_role.replace('_', ' ')}
                  </span>
                </td>
                <td className="text-muted">{new Date(member.created_at).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleRemove(member.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Revoke Access
                  </button>
                </td>
              </tr>
            ))}
            {!loading && team.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  No team members added yet. Invite someone to collaborate!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showInviteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 450, position: 'relative', animation: 'fadeInUp 0.3s ease-out' }}>
            <h3 style={{ margin: '0 0 16px' }}>Invite Team Member</h3>
            
            {tempPassword ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                <h4 style={{ color: '#166534', margin: '0 0 10px' }}>User Created Successfully!</h4>
                <p style={{ fontSize: 14, color: '#15803d', marginBottom: 20 }}>
                  Please share these credentials securely with your team member. For security, this password will not be shown again.
                </p>
                <div style={{ background: '#fff', border: '1px dashed #22c55e', padding: 12, borderRadius: 6, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Email</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>{tempPassword.email}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Temporary Password</div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', letterSpacing: 2 }}>{tempPassword.password}</div>
                </div>
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowInviteModal(false)}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#475569' }}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    placeholder="colleague@company.com"
                  />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#475569' }}>Access Role</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  >
                    <option value="QA_TECHNICIAN">QA Technician (Manage Requests & Samples)</option>
                    <option value="PROCUREMENT_MANAGER">Procurement Manager (Manage Billing & Network)</option>
                    <option value="DIRECTOR">Director (Read-Only Analytics & Reports)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ padding: '10px 16px' }}>Invite User</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
