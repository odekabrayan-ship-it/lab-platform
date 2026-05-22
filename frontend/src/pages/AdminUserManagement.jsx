import React, { useState, useEffect, useCallback } from 'react';
import API from '../services/api';

const ROLE_OPTIONS = [
  { value: 'admin', label: '⚙️ Platform Admin', color: 'text-red-400 bg-red-500/10' },
  { value: 'lab', label: '🧪 Laboratory', color: 'text-blue-400 bg-blue-500/10' },
  { value: 'client', label: '🏭 Industrial Client', color: 'text-emerald-400 bg-emerald-500/10' },
  { value: 'professional', label: '🎓 Professional', color: 'text-purple-400 bg-purple-500/10' },
  { value: 'consumer', label: '👤 Consumer', color: 'text-slate-400 bg-slate-500/10' },
];

const SUB_ROLE_MAP = {
  admin: ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ACCREDITATION_AUTHORITY', 'TREASURY_ADMIN'],
  lab: ['LAB_ADMIN', 'LAB_MANAGER', 'QUALITY_MANAGER', 'ANALYST', 'REVIEWER', 'LAB_TECHNICIAN', 'ACCOUNTANT'],
  client: ['COMPANY_ADMIN', 'QA_MANAGER', 'CORPORATE_USER', 'PRODUCTION_STAFF'],
  professional: ['CONSULTANT', 'AUDITOR', 'SPECIALIST', 'EXPERT'],
  consumer: [],
};

const pillStyle = (role) => {
  const found = ROLE_OPTIONS.find(r => r.value === role);
  return found ? found.color : 'text-slate-400 bg-slate-500/10';
};

const EMPTY_FORM = {
  email: '', password: '', role: 'lab', sub_role: '',
  parent_lab_id: '', parent_client_id: ''
};

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [labs, setLabs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [linkingUser, setLinkingUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState({});
  const [linkForm, setLinkForm] = useState({ type: 'lab', lab_id: '', client_id: '' });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterRole) params.role = filterRole;
      if (search) params.search = search;
      if (activeTab === 'platform') params.org_type = 'platform';
      else if (activeTab === 'lab') params.org_type = 'lab';
      else if (activeTab === 'client') params.org_type = 'client';

      const [usersRes, labsRes, clientsRes] = await Promise.all([
        API.get('/api/admin/users', { params }),
        API.get('/api/admin/laboratories'),
        API.get('/api/admin/clients'),
      ]);
      setUsers(usersRes.data.data || []);
      setLabs(labsRes.data.data || []);
      setClients(clientsRes.data.data || []);
    } catch (err) {
      showToast('Failed to load user data', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterRole, search, activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...createForm,
        parent_lab_id: createForm.parent_lab_id || null,
        parent_client_id: createForm.parent_client_id || null,
        sub_role: createForm.sub_role || null,
      };
      await API.post('/api/admin/users', body);
      showToast(`User "${createForm.email}" created successfully`);
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.patch(`/api/admin/users/${editingUser.id}`, editForm);
      showToast('User updated successfully');
      setEditingUser(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLink = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (linkForm.type === 'lab') {
        await API.post(`/api/admin/users/${linkingUser.id}/link-lab`, { lab_id: linkForm.lab_id });
        showToast('User linked to laboratory');
      } else {
        await API.post(`/api/admin/users/${linkingUser.id}/link-client`, { client_id: linkForm.client_id });
        showToast('User linked to client organization');
      }
      setLinkingUser(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Link failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post(`/api/admin/users/${resetUser.id}/reset-password`, { new_password: newPassword });
      showToast(`Password reset for ${resetUser.email}`);
      setResetUser(null);
      setNewPassword('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Reset failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (user, action) => {
    if (!window.confirm(`${action === 'deactivate' ? 'Deactivate' : 'Reactivate'} user "${user.email}"?`)) return;
    try {
      await API.post(`/api/admin/users/${user.id}/deactivate`, { action });
      showToast(`User ${action}d`);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Action failed', 'error');
    }
  };

  const orgLabel = (user) => {
    if (user.lab_name) return <span className="text-blue-400 text-[10px]">🧪 {user.lab_name}</span>;
    if (user.client_name) return <span className="text-emerald-400 text-[10px]">🏭 {user.client_name}</span>;
    if (user.role === 'admin') return <span className="text-red-400 text-[10px]">⚙️ Platform Level</span>;
    return <span className="text-slate-600 text-[10px]">— Unlinked</span>;
  };

  const TABS = [
    { id: 'all', label: `All Users (${users.length})` },
    { id: 'platform', label: '⚙️ Platform Admins' },
    { id: 'lab', label: '🧪 Lab Members' },
    { id: 'client', label: '🏭 Client Members' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* TOAST */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[500] px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-scale-up
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2">Platform Control · User Governance</div>
          <h2 className="text-3xl font-black">User Management</h2>
          <p className="text-slate-400 text-sm mt-1">Create, assign roles, link to organizations, and govern all platform users.</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateForm(EMPTY_FORM); }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 shrink-0"
        >
          + Create User
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by email or organization..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* TABS */}
      <div className="flex gap-1 border-b border-white/10">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-4 font-bold text-xs uppercase tracking-widest transition-all ${activeTab === tab.id ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* USER TABLE */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-20 text-slate-500 italic text-sm">Loading user registry...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-slate-500 italic text-sm">No users found matching your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Role / Sub-Role</th>
                  <th className="px-5 py-4">Organization</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Joined</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 text-slate-600 font-mono text-xs">#{user.id}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{user.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${pillStyle(user.role)}`}>
                        {user.role}
                      </span>
                      {user.sub_role && (
                        <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{user.sub_role}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">{orgLabel(user)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${user.is_verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {user.is_verified ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditingUser(user); setEditForm({ role: user.role, sub_role: user.sub_role || '', is_verified: user.is_verified }); }}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-bold rounded-lg transition-all border border-blue-500/20"
                          title="Edit Role"
                        >
                          Edit Role
                        </button>
                        <button
                          onClick={() => { setLinkingUser(user); setLinkForm({ type: user.role === 'client' ? 'client' : 'lab', lab_id: user.parent_lab_id || '', client_id: user.parent_client_id || '' }); }}
                          className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white text-[10px] font-bold rounded-lg transition-all border border-purple-500/20"
                          title="Link to Org"
                        >
                          Link Org
                        </button>
                        <button
                          onClick={() => { setResetUser(user); setNewPassword(''); }}
                          className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white text-[10px] font-bold rounded-lg transition-all border border-amber-500/20"
                          title="Reset Password"
                        >
                          Reset PWD
                        </button>
                        <button
                          onClick={() => handleDeactivate(user, user.is_verified ? 'deactivate' : 'reactivate')}
                          className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all border ${user.is_verified
                            ? 'bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border-red-500/20'
                            : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/20'}`}
                        >
                          {user.is_verified ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {showCreate && (
        <Modal title="Create New Platform User" onClose={() => setShowCreate(false)} color="blue">
          <form onSubmit={handleCreate} className="space-y-5">
            <Field label="Email Address">
              <input type="email" required value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})}
                className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm" placeholder="user@organization.com" />
            </Field>
            <Field label="Initial Password">
              <input type="password" required value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})}
                className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm" placeholder="Min 8 characters" minLength={8} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Platform Role">
                <select required value={createForm.role} onChange={e => setCreateForm({...createForm, role: e.target.value, sub_role: ''})}
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm">
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Sub-Role">
                <select value={createForm.sub_role} onChange={e => setCreateForm({...createForm, sub_role: e.target.value})}
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm">
                  <option value="">— None —</option>
                  {(SUB_ROLE_MAP[createForm.role] || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            {createForm.role !== 'admin' && createForm.role !== 'consumer' && createForm.role !== 'professional' && (
              <Field label={createForm.role === 'client' ? 'Link to Client Organization' : 'Link to Laboratory'}>
                {createForm.role === 'client' ? (
                  <select value={createForm.parent_client_id} onChange={e => setCreateForm({...createForm, parent_client_id: e.target.value})}
                    className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm">
                    <option value="">— Platform Level (no org) —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                ) : (
                  <select value={createForm.parent_lab_id} onChange={e => setCreateForm({...createForm, parent_lab_id: e.target.value})}
                    className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm">
                    <option value="">— Platform Level (no org) —</option>
                    {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                )}
              </Field>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-colors">
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT ROLE MODAL */}
      {editingUser && (
        <Modal title={`Edit: ${editingUser.email}`} onClose={() => setEditingUser(null)} color="blue">
          <form onSubmit={handleEdit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Platform Role">
                <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value, sub_role: ''})}
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm">
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Sub-Role">
                <select value={editForm.sub_role} onChange={e => setEditForm({...editForm, sub_role: e.target.value})}
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm">
                  <option value="">— None —</option>
                  {(SUB_ROLE_MAP[editForm.role] || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Account Status">
              <select value={editForm.is_verified} onChange={e => setEditForm({...editForm, is_verified: parseInt(e.target.value)})}
                className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm">
                <option value={1}>✅ Active</option>
                <option value={0}>🚫 Inactive / Deactivated</option>
              </select>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-colors">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* LINK ORG MODAL */}
      {linkingUser && (
        <Modal title={`Link Organization: ${linkingUser.email}`} onClose={() => setLinkingUser(null)} color="purple">
          <form onSubmit={handleLink} className="space-y-5">
            <Field label="Organization Type">
              <div className="flex gap-3">
                <button type="button" onClick={() => setLinkForm({...linkForm, type: 'lab'})}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${linkForm.type === 'lab' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                  🧪 Laboratory
                </button>
                <button type="button" onClick={() => setLinkForm({...linkForm, type: 'client'})}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-all ${linkForm.type === 'client' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                  🏭 Industrial Client
                </button>
              </div>
            </Field>
            {linkForm.type === 'lab' ? (
              <Field label="Select Laboratory">
                <select required value={linkForm.lab_id} onChange={e => setLinkForm({...linkForm, lab_id: e.target.value})}
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm">
                  <option value="">— Choose a laboratory —</option>
                  {labs.map(l => <option key={l.id} value={l.id}>{l.name} ({l.verification_status})</option>)}
                </select>
              </Field>
            ) : (
              <Field label="Select Client Organization">
                <select required value={linkForm.client_id} onChange={e => setLinkForm({...linkForm, client_id: e.target.value})}
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm">
                  <option value="">— Choose a client org —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </Field>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setLinkingUser(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-colors">
                {saving ? 'Linking...' : 'Link Organization'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetUser && (
        <Modal title={`Reset Password: ${resetUser.email}`} onClose={() => setResetUser(null)} color="amber">
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
              ⚠️ This will immediately change the user's password. They will need to be notified.
            </div>
            <Field label="New Password">
              <input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-amber-500 text-sm" placeholder="Min 8 characters" />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setResetUser(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm transition-colors">
                {saving ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Modal({ title, onClose, children, color = 'blue' }) {
  const borderColor = { blue: 'border-blue-500', purple: 'border-purple-500', amber: 'border-amber-500' }[color] || 'border-blue-500';
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[300] p-6" onClick={onClose}>
      <div
        className={`bg-[#0a1628] border ${borderColor} border-t-4 rounded-2xl w-full max-w-lg p-8 shadow-2xl animate-scale-up`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-7">
          <h3 className="text-xl font-black">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl transition-colors">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{label}</label>
      {children}
    </div>
  );
}
