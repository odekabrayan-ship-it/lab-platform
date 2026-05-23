import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const CERT_TYPES = ['Laboratory Analyst', 'Quality Manager', 'Safety Officer', 'Metrology Specialist', 'Environmental Scientist', 'Calibration Technician'];

export default function CertApplication() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ certification_type: '', documents: [], professional_statement: '' });
  const [docName, setDocName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const addDoc = () => {
    if (docName.trim()) {
      setForm({ ...form, documents: [...form.documents, docName.trim()] });
      setDocName('');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await API.post('/api/cert/applications', form);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center text-4xl mb-6">✓</div>
        <h2 className="text-2xl font-black text-white mb-3">Application Submitted</h2>
        <p className="text-slate-400 text-sm">You will be notified of the review outcome. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black tracking-tight mb-2">Apply for Certification</h1>
      <p className="text-slate-500 text-sm mb-10">Complete the application process to receive your professional credential</p>

      <div className="flex items-center gap-4 mb-10">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${step >= s ? 'bg-teal-600 text-white' : 'bg-white/5 text-slate-500'}`}>{s}</div>
            <span className={`text-xs font-bold ${step >= s ? 'text-teal-400' : 'text-slate-600'}`}>{['Type', 'Documents', 'Review'][s-1]}</span>
            {s < 3 && <div className={`w-12 h-px ${step > s ? 'bg-teal-500' : 'bg-white/10'}`}></div>}
          </div>
        ))}
      </div>

      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-8">
        {step === 1 && (
          <div>
            <h2 className="text-lg font-black mb-6">Select Certification Type</h2>
            <div className="grid grid-cols-1 gap-3">
              {CERT_TYPES.map(type => (
                <button key={type} onClick={() => setForm({...form, certification_type: type})} className={`p-4 rounded-xl border text-left text-sm font-bold transition-all ${form.certification_type === type ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'border-white/10 text-white/60 hover:border-white/20'}`}>
                  {type}
                </button>
              ))}
            </div>
            <button onClick={() => form.certification_type && setStep(2)} disabled={!form.certification_type} className="mt-8 px-8 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all disabled:opacity-30">Continue →</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-black mb-6">Supporting Documents & Statement</h2>
            <div className="mb-6">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Upload Documents</label>
              <div className="flex gap-3">
                <input type="text" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Document name (e.g., Degree Certificate)" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal-500 placeholder:text-slate-700" />
                <button onClick={addDoc} className="px-4 py-3 bg-teal-600 text-white font-bold text-xs rounded-xl">Add</button>
              </div>
              {form.documents.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.documents.map((d, i) => (
                    <span key={i} className="px-3 py-1 bg-teal-500/10 text-teal-400 text-xs font-bold rounded-lg border border-teal-500/20">📄 {d}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="mb-6">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Professional Statement</label>
              <textarea rows={5} value={form.professional_statement} onChange={(e) => setForm({...form, professional_statement: e.target.value})} placeholder="Describe your qualifications and experience..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal-500 placeholder:text-slate-700 resize-none"></textarea>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 bg-white/5 text-white font-bold text-xs rounded-xl border border-white/10">← Back</button>
              <button onClick={() => setStep(3)} className="px-8 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all">Review →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-black mb-6">Review & Submit</h2>
            <div className="space-y-4 mb-8">
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Certification Type</div>
                <div className="text-sm font-bold text-teal-400">{form.certification_type}</div>
              </div>
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Documents ({form.documents.length})</div>
                <div className="text-sm text-slate-300">{form.documents.join(', ') || 'None attached'}</div>
              </div>
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Professional Statement</div>
                <div className="text-sm text-slate-300">{form.professional_statement || 'Not provided'}</div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="px-6 py-3 bg-white/5 text-white font-bold text-xs rounded-xl border border-white/10">← Back</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-8 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
