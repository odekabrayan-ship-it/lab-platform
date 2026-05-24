import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { API_BASE } from '../services/api';

const CERT_TYPES = [
  { value: 'Industrial Chemist', icon: '⚗️', desc: 'Petrochemicals, heavy manufacturing & industrial synthesis' },
  { value: 'Molecular Biologist', icon: '🧬', desc: 'Genomics, PCR testing & molecular diagnostics' },
  { value: 'Food & Beverage Analyst', icon: '🍎', desc: 'Nutritional testing, food safety & pathogen screening' },
  { value: 'Forensic Scientist', icon: '🕵️', desc: 'Trace evidence analysis, toxicology & criminalistics' },
  { value: 'Microbiologist (QA/QC)', icon: '🧫', desc: 'Sterility testing, environmental monitoring & bioprocessing' },
  { value: 'Formulation Scientist', icon: '💊', desc: 'Drug development, compounding & therapeutic design' },
  { value: 'Materials Scientist', icon: '🏗️', desc: 'Polymer testing, structural integrity & material properties' },
  { value: 'Clinical Laboratory Scientist', icon: '⚕️', desc: 'Medical pathology, diagnostic assays & patient testing' },
  { value: 'Regulatory Compliance (GLP/GMP)', icon: '📜', desc: 'Laboratory audits, FDA/EMA standards & QA' },
  { value: 'LIMS Specialist', icon: '💻', desc: 'Data management, lab automation & systems architecture' },
  // ISO & International Standards
  { value: 'ISO/IEC 17025 Assessor', icon: '📐', desc: 'Testing & calibration laboratory accreditation' },
  { value: 'ISO 15189 Medical Assessor', icon: '🏥', desc: 'Medical laboratory quality & competence' },
  { value: 'ISO 9001 Lead Auditor', icon: '✅', desc: 'Quality management systems auditing' },
  { value: 'ISO 13485 Auditor', icon: '🩺', desc: 'Medical device manufacturing compliance' },
  { value: 'ISO 14001/45001 EHS Auditor', icon: '🌍', desc: 'Environmental, health & safety management' },
  // Keeping some original core modules
  { value: 'Laboratory Analyst', icon: '🔬', desc: 'Clinical & analytical laboratory testing' },
  { value: 'Quality Manager', icon: '📋', desc: 'Quality assurance & management systems' },
  { value: 'Safety Officer', icon: '⚠️', desc: 'Laboratory health, safety & compliance' },
  { value: 'Metrology Specialist', icon: '📏', desc: 'Measurement science & calibration' },
];

const REQUIRED_DOCS = {
  'Industrial Chemist': ['Chemistry Degree', 'Chemical Handling Certificate', 'Work Experience Letter'],
  'Molecular Biologist': ['Biology/Genetics Degree', 'Molecular Training Log', 'Experience Letter'],
  'Food & Beverage Analyst': ['Food Science Degree', 'Food Safety Certificate', 'Experience Letter'],
  'Forensic Scientist': ['Forensic Science Degree', 'Chain of Custody Training', 'Experience Letter'],
  'Microbiologist (QA/QC)': ['Microbiology Degree', 'Sterility Training Log', 'Work Experience Letter'],
  'Formulation Scientist': ['Pharmaceutical Science Degree', 'Formulation Portfolio', 'Experience Letter'],
  'Materials Scientist': ['Materials Science Degree', 'NDT Training Certificate', 'Experience Letter'],
  'Clinical Laboratory Scientist': ['Clinical Lab Degree', 'State/National Board License', 'Experience Letter'],
  'Regulatory Compliance (GLP/GMP)': ['Regulatory Training Certificate', 'Audit Log History', 'Experience Letter'],
  'LIMS Specialist': ['IT/Informatics Degree', 'Database Administration Certificate', 'Experience Letter'],
  'ISO/IEC 17025 Assessor': ['ISO 17025 Lead Assessor Certificate', 'Technical Degree', 'Audit Log History'],
  'ISO 15189 Medical Assessor': ['ISO 15189 Training Certificate', 'Medical Lab Degree', 'Audit Log History'],
  'ISO 9001 Lead Auditor': ['ISO 9001 Lead Auditor Certificate', 'Quality Management Experience', 'Audit Log'],
  'ISO 13485 Auditor': ['ISO 13485 Auditor Training', 'Medical Device Experience', 'Audit Log History'],
  'ISO 14001/45001 EHS Auditor': ['EHS Management Certificate', 'ISO 14001/45001 Training', 'Audit Log History'],
  'Laboratory Analyst': ['Academic Degree Certificate', 'Laboratory Training Certificate', 'Work Experience Letter'],
  'Quality Manager': ['Academic Degree Certificate', 'ISO Training Certificate', 'Work Experience Letter (5+ years)'],
  'Safety Officer': ['Safety Training Certificate', 'Work Experience Letter', 'Government ID'],
  'Metrology Specialist': ['Metrology Training Certificate', 'Calibration Competency Record', 'Work Experience Letter'],
};

export default function CertApplication() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [form, setForm] = useState({ certification_type: '', professional_statement: '' });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    API.get('/api/cert/profile')
      .then(r => setProfile(r.data.data))
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  const handleFiles = (newFiles) => {
    const arr = Array.from(newFiles);
    const valid = arr.filter(f => f.size <= 10 * 1024 * 1024);
    setFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (i) => setFiles(f => f.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setError('');
    if (!form.professional_statement.trim()) { setError('A professional statement is required.'); return; }
    if (files.length === 0) { setError('At least one document is required.'); return; }
    setSubmitting(true);
    try {
      // 1. Upload mock documents
      for (const f of files) {
        await API.post('/api/professional/documents', {
          document_type: form.certification_type || 'General',
          file_url: `/uploads/${f.name}`,
          file_name: f.name
        });
      }

      // 2. Submit Application
      await API.post('/api/professional/submit', {});

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 4000);
    } catch (e) {
      setError(e.response?.data?.error || 'Submission failed. Please make sure your profile is fully complete (Name, Bio, Experience, Location, Phone, Specialty).');
    }
    setSubmitting(false);
  };

  if (profileLoading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Profile gate
  if (!profile || !profile.full_name) return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">👤</div>
      <h2 className="text-2xl font-black text-white mb-3">Professional Profile Required</h2>
      <p className="text-slate-400 text-sm mb-8">You must complete your professional profile before submitting a certification application. Your name and institution will appear on your credential.</p>
      <a href="/profile" className="px-8 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all">
        Complete Profile →
      </a>
    </div>
  );

  if (success) return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
        <div className="relative w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center text-4xl">✓</div>
      </div>
      <h2 className="text-2xl font-black text-white mb-3">Application Submitted</h2>
      <p className="text-slate-400 text-sm text-center max-w-sm">Your application is under review. You will receive an email notification once a decision has been made.</p>
      <div className="mt-6 text-xs text-slate-600">Redirecting to dashboard...</div>
    </div>
  );

  const requiredDocs = REQUIRED_DOCS[form.certification_type] || [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight mb-2">Apply for Certification</h1>
        <div className="flex items-center gap-2 text-xs text-teal-400 font-bold">
          <span className="w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center text-white text-[10px]">✓</span>
          Applying as: <span className="text-white">{profile.full_name}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500">{profile.institution || 'No institution set'}</span>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-10">
        {[
          { n: 1, label: 'Certification Type' },
          { n: 2, label: 'Documents' },
          { n: 3, label: 'Statement' },
          { n: 4, label: 'Review & Submit' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step > s.n ? 'bg-emerald-600 text-white' : step === s.n ? 'bg-teal-600 text-white' : 'bg-white/5 text-slate-600'}`}>
              {step > s.n ? '✓' : s.n}
            </div>
            <span className={`text-xs font-bold hidden sm:block ${step >= s.n ? 'text-teal-400' : 'text-slate-700'}`}>{s.label}</span>
            {i < 3 && <div className={`w-8 h-px ${step > s.n ? 'bg-emerald-500' : step === s.n ? 'bg-teal-500/50' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-8">
        {/* Step 1: Certification Type */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-black mb-6">Select Certification Type</h2>
            <div className="grid grid-cols-1 gap-3">
              {CERT_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setForm({ ...form, certification_type: type.value })}
                  className={`p-4 rounded-xl border text-left transition-all ${form.certification_type === type.value ? 'border-teal-500 bg-teal-500/10' : 'border-white/10 hover:border-white/20'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <div className={`font-bold text-sm ${form.certification_type === type.value ? 'text-teal-400' : 'text-white/80'}`}>{type.value}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{type.desc}</div>
                    </div>
                    {form.certification_type === type.value && <span className="ml-auto text-teal-400 text-lg">✓</span>}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => form.certification_type && setStep(2)}
              disabled={!form.certification_type}
              className="mt-8 px-8 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all disabled:opacity-30"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Document Upload */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-black mb-2">Upload Supporting Documents</h2>
            <p className="text-slate-500 text-sm mb-6">
              For <strong className="text-teal-400">{form.certification_type}</strong>, please upload the following:
            </p>

            {/* Required docs checklist */}
            <div className="mb-6 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Required Documents</div>
              {requiredDocs.map(doc => {
                const uploaded = files.some(f => f.name.toLowerCase().includes(doc.split(' ')[0].toLowerCase()));
                return (
                  <div key={doc} className="flex items-center gap-2 text-xs py-1">
                    <span className={uploaded ? 'text-emerald-400' : 'text-slate-700'}>{uploaded ? '✓' : '○'}</span>
                    <span className={uploaded ? 'text-slate-400' : 'text-slate-600'}>{doc}</span>
                  </div>
                );
              })}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => document.getElementById('file-input').click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-teal-500 bg-teal-500/5' : 'border-white/10 hover:border-teal-500/40'}`}
            >
              <div className="text-3xl mb-3">📂</div>
              <div className="text-sm font-bold text-white/60">Drag & drop files here, or click to browse</div>
              <div className="text-xs text-slate-600 mt-1">PDF, JPG, PNG, DOC, DOCX · Max 10MB each</div>
              <input id="file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={e => handleFiles(e.target.files)} />
            </div>

            {/* Uploaded files */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                    <span className="text-lg">{f.type.includes('pdf') ? '📄' : f.type.includes('image') ? '🖼️' : '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{f.name}</div>
                      <div className="text-[11px] text-slate-600">{(f.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-red-400/60 hover:text-red-400 text-lg transition-colors">×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep(1)} className="px-6 py-3 bg-white/5 text-white font-bold text-xs rounded-xl border border-white/10">← Back</button>
              <button onClick={() => setStep(3)} className="px-8 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all">Continue →</button>
            </div>
          </div>
        )}

        {/* Step 3: Professional Statement */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-black mb-2">Professional Statement</h2>
            <p className="text-slate-500 text-sm mb-6">Describe your qualifications, relevant experience, and why you are applying for this certification.</p>
            <textarea
              rows={8}
              value={form.professional_statement}
              onChange={e => setForm({ ...form, professional_statement: e.target.value })}
              placeholder="I am applying for the Laboratory Analyst certification because... My experience includes... My qualifications include..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-teal-500 transition-all placeholder:text-slate-700 resize-none"
            />
            <div className="text-right text-[11px] text-slate-600 mt-1">{form.professional_statement.length} characters</div>
            {error && <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
            <div className="flex gap-4 mt-6">
              <button onClick={() => setStep(2)} className="px-6 py-3 bg-white/5 text-white font-bold text-xs rounded-xl border border-white/10">← Back</button>
              <button onClick={() => { if (!form.professional_statement.trim()) { setError('Statement required.'); } else { setError(''); setStep(4); } }} className="px-8 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all">Review →</button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-black mb-6">Review & Submit</h2>
            <div className="space-y-4 mb-8">
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Applicant</div>
                <div className="font-bold text-white">{profile.full_name}</div>
                <div className="text-xs text-slate-500">{profile.institution} · {profile.specialization}</div>
              </div>
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Certification Type</div>
                <div className="font-bold text-teal-400">{form.certification_type}</div>
              </div>
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Documents ({files.length})</div>
                {files.length === 0 ? <div className="text-slate-600 text-sm">No files attached</div> : (
                  <div className="space-y-1">
                    {files.map((f, i) => <div key={i} className="text-xs text-slate-400 flex items-center gap-2"><span>📄</span>{f.name}</div>)}
                  </div>
                )}
              </div>
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Professional Statement</div>
                <div className="text-sm text-slate-300 leading-relaxed">{form.professional_statement}</div>
              </div>
            </div>

            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl mb-6 text-xs text-teal-300">
              By submitting, you confirm that all information and documents provided are authentic and accurate. False declarations may result in permanent disqualification.
            </div>

            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

            <div className="flex gap-4">
              <button onClick={() => setStep(3)} className="px-6 py-3 bg-white/5 text-white font-bold text-xs rounded-xl border border-white/10">← Back</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-teal-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</> : '🎓 Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
