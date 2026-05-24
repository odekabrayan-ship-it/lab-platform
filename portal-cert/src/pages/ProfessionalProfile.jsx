import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const FIELDS = [
  { key: 'full_name', label: 'Full Name', placeholder: 'Dr. Jane Smith', required: true },
  { key: 'specialty', label: 'Specialty / Discipline', placeholder: 'Clinical Chemistry, Microbiology...' },
  { key: 'location', label: 'Location / Institution', placeholder: 'National Reference Laboratory' },
  { key: 'experience_years', label: 'Years of Experience', placeholder: '0', type: 'number' },
  { key: 'contact_phone', label: 'Contact Phone', placeholder: '+1 555 000 0000' },
];

export default function ProfessionalProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', specialty: '', location: '', experience_years: '', contact_phone: '', bio: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/api/professional/profile').then(r => {
      if (r.data.data) setForm({ ...form, ...r.data.data });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError('');
    if (!form.full_name.trim()) { setError('Full name is required.'); return; }
    setSaving(true);
    try {
      await API.post('/api/professional/profile', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save profile. Please try again.');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-teal-600/20 border border-teal-500/30 rounded-2xl flex items-center justify-center text-2xl">👤</div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Professional Profile</h1>
            <p className="text-slate-500 text-sm">This profile is required before submitting a certification application.</p>
          </div>
        </div>
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <span className="text-amber-400 text-lg">⚠️</span>
          <p className="text-amber-300 text-xs leading-relaxed">Your name and institution will appear <strong>publicly</strong> on your credential in the registry. Please enter your full official name.</p>
        </div>
      </div>

      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-8">
        <div className="space-y-6">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                {f.label} {f.required && <span className="text-red-400">*</span>}
              </label>
              <input
                type={f.type || 'text'}
                value={form[f.key] || ''}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal-500 focus:bg-teal-500/5 transition-all placeholder:text-slate-700"
              />
            </div>
          ))}

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Professional Bio</label>
            <textarea
              rows={4}
              value={form.bio || ''}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              placeholder="A brief summary of your professional background, expertise, and key achievements..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal-500 transition-all placeholder:text-slate-700 resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : saved ? '✓ Saved!' : 'Save Profile'}
          </button>
          {saved && (
            <button
              onClick={() => navigate('/apply')}
              className="px-6 py-3 bg-white/5 text-teal-400 font-bold text-xs uppercase tracking-widest rounded-xl border border-teal-500/30 hover:bg-teal-500/10 transition-all"
            >
              Continue to Apply →
            </button>
          )}
        </div>
      </div>

      {/* Profile completeness tip */}
      <div className="mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Profile Checklist</div>
        <div className="space-y-1">
          {[
            { label: 'Full name', done: !!form.full_name },
            { label: 'Specialty', done: !!form.specialty },
            { label: 'Location', done: !!form.location },
            { label: 'Years of experience', done: !!form.experience_years },
            { label: 'Bio', done: !!form.bio },
            { label: 'Phone', done: !!form.contact_phone },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <span className={item.done ? 'text-emerald-400' : 'text-slate-700'}>{item.done ? '✓' : '○'}</span>
              <span className={item.done ? 'text-slate-400' : 'text-slate-700'}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
