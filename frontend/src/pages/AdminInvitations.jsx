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
  email: '', role: 'lab', sub_role: '',
  tenant_lab_id: '', tenant_client_id: ''
};

export default function AdminInvitations() {
  const [invites, setInvites] = useState([]);
  const [labs, setLabs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, labsRes, clientsRes] = await Promise.all([
        API.get('/api/admin/invitations'),
        API.get('/api/admin/laboratories'),
        API.get('/api/admin/clients'),
      ]);
      setInvites(invRes.data.data || []);
      setLabs(labsRes.data.data || []);
      setClients(clientsRes.data.data || []);
    } catch (err) {
      showToast('Failed to load invitations', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...createForm,
        tenant_lab_id: createForm.tenant_lab_id || null,
        tenant_client_id: createForm.tenant_client_id || null,
        sub_role: createForm.sub_role || null,
      };
      const res = await API.post('/api/admin/invitations', body);
      showToast(\`Invitation sent to "\${createForm.email}"\`);
      setGeneratedLink(window.location.origin + res.data.data.inviteLink);
      setCreateForm(EMPTY_FORM);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create invitation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this invitation? It will no longer be usable.')) return;
    try {
      await API.delete(\`/api/admin/invitations/\${id}\`);
      showToast('Invitation revoked');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to revoke', 'error');
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* TOAST */}
      {toast && (
        <div className={\`fixed top-6 right-6 z-[500] px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-scale-up
          \${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}\`}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Platform Control · Onboarding</div>
          <h2 className="text-3xl font-black">User Invitations</h2>
          <p className="text-slate-400 text-sm mt-1">Send and manage secure onboarding links for new platform users.</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setGeneratedLink(null); }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 shrink-0"
        >
          + Send Invitation
        </button>
      </div>

      {/* INVITATION TABLE */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-20 text-slate-500 italic text-sm">Loading invitations...</div>
        ) : invites.length === 0 ? (
          <div className="text-center py-20 text-slate-500 italic text-sm">No invitations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Role / Sub-Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Invited By</th>
                  <th className="px-5 py-4">Expires At</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invites.map(inv => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 text-slate-600 font-mono text-xs">#{inv.id}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{inv.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={\`px-2 py-1 rounded text-[10px] font-black uppercase \${pillStyle(inv.role)}\`}>
                        {inv.role}
                      </span>
                      {inv.sub_role && (
                        <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{inv.sub_role}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={\`px-2 py-1 rounded text-[10px] font-black uppercase 
                        \${inv.status === 'pending' ? 'bg-blue-500/10 text-blue-400' : 
                          inv.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' : 
                          'bg-red-500/10 text-red-400'}\`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{inv.invited_by_email}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {inv.status === 'pending' && (
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-[10px] font-bold rounded-lg transition-all border border-red-500/20"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE INVITATION MODAL */}
      {showCreate && (
        <Modal title="Send User Invitation" onClose={() => setShowCreate(false)} color="blue">
          {generatedLink ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-sm">
                Invitation created successfully! Since email delivery is mocked, please share this link with the user:
              </div>
              <input 
                type="text" 
                readOnly 
                value={generatedLink} 
                className="w-full p-4 bg-slate-900 border border-white/20 rounded-xl font-mono text-xs outline-none"
                onClick={(e) => e.target.select()}
              />
              <button 
                onClick={() => setShowCreate(false)} 
                className="w-full py-3 mt-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-5">
              <Field label="Email Address">
                <input type="email" required value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})}
                  className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm" placeholder="user@organization.com" />
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
                    <select value={createForm.tenant_client_id} onChange={e => setCreateForm({...createForm, tenant_client_id: e.target.value})}
                      className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg outline-none focus:border-blue-500 text-sm">
                      <option value="">— Platform Level (no org) —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  ) : (
                    <select value={createForm.tenant_lab_id} onChange={e => setCreateForm({...createForm, tenant_lab_id: e.target.value})}
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
                  {saving ? 'Creating...' : 'Generate Invitation'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children, color = 'blue' }) {
  const borderColor = { blue: 'border-blue-500', purple: 'border-purple-500', amber: 'border-amber-500' }[color] || 'border-blue-500';
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[300] p-6" onClick={onClose}>
      <div
        className={\`bg-[#0a1628] border \${borderColor} border-t-4 rounded-2xl w-full max-w-lg p-8 shadow-2xl animate-scale-up\`}
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
