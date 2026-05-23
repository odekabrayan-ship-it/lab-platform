import { useState, useEffect } from "react";
import API from "../services/api";
import NotificationBell from "../components/NotificationBell";
import PaymentGateway from "../components/PaymentGateway";
import DocumentUpload from "../components/DocumentUpload";

export default function ProfessionalProfile() {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Onboarding Wizard State
  const [onboardingStep, setOnboardingStep] = useState(1);
  
  // Forms
  const [basicForm, setBasicForm] = useState({ 
    full_name: "", 
    specialty: "Microbiologist", 
    experience_years: "", 
    bio: "", 
    location: "", 
    contact_phone: "" 
  });
  const [expForm, setExpForm] = useState({ organization_name: "", role_title: "", start_date: "", end_date: "", responsibilities: "", is_current: false });
  const [skillForm, setSkillForm] = useState({ skill_name: "", category: "INSTRUMENT", proficiency: "INTERMEDIATE" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profileRes, broadcastRes, membershipRes] = await Promise.all([
                API.get("/api/professional/profile"),
                API.get("/api/professional/broadcasts"),
                API.get("/api/membership/status")
            ]);
            
            const profData = profileRes.data.data;
            if (profData) {
                setProfile(profData);
                setBasicForm({
                    full_name: profData.full_name || "",
                    specialty: profData.specialty || "Microbiologist",
                    experience_years: profData.experience_years || "",
                    bio: profData.bio || "",
                    location: profData.location || "",
                    contact_phone: profData.contact_phone || ""
                });
                
                // Determine onboarding step based on status
                if (profData.certification_status === 'payment_pending') {
                    setOnboardingStep(5);
                } else if (profData.certification_status === 'pending_review') {
                    setOnboardingStep(6);
                } else if (profData.certification_status === 'rejected') {
                    setOnboardingStep(7);
                } else if (profData.certification_status === 'approved') {
                    setOnboardingStep(0); 
                } else if (profData.full_name) {
                    setOnboardingStep(3);
                } else {
                    setOnboardingStep(1);
                }
            }
            setBroadcasts(broadcastRes.data.data || []);
            setMembershipStatus(membershipRes.data.data);
        } catch (err) {
            console.error("Failed to sync dossier");
        } finally {
            setLoading(false);
        }
    };

  useEffect(() => { 
      fetchData();
  }, []);

  const handleSaveBasic = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/professional/profile", basicForm);
      setOnboardingStep(3);
      fetchData();
    } catch (err) { alert("Save failed"); }
  };

    const handleSubmitApplication = async () => {
        try {
            const res = await API.post('/api/professional/submit');
            if (res.data.data.status === 'payment_pending') {
                setOnboardingStep(5);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Submission failed');
        }
    };

    const handleVerificationPayment = async () => {
        try {
            setPayLoading(true);
            const phone = prompt("Enter M-Pesa Phone Number (254...)", "2547");
            if (!phone) return;

            await API.post('/api/payments/verification/mpesa', { phone });
            setPayStep('processing');
            
            // Poll for status change or just show success message
            setTimeout(() => {
                fetchData();
            }, 3000);
        } catch (err) {
            alert('Payment initiation failed');
        } finally {
            setPayLoading(false);
        }
    };

  const handleAddExperience = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/professional/experience", expForm);
      setExpForm({ organization_name: "", role_title: "", start_date: "", end_date: "", responsibilities: "", is_current: false });
      fetchData();
    } catch (err) { alert("Failed to add experience"); }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/professional/skills", skillForm);
      setSkillForm({ skill_name: "", category: "INSTRUMENT", proficiency: "INTERMEDIATE" });
      fetchData();
    } catch (err) { alert("Failed to add skill"); }
  };

  const handleDelete = async (type, id) => {
      if (!confirm("Remove this entry?")) return;
      try {
          await API.delete(`/api/professional/${type}/${id}`);
          fetchData();
      } catch (err) { alert("Delete failed"); }
  };

  if (loading) return <div className="p-20 text-center text-muted italic">Syncing Expert Dossier...</div>;

  // --- STEP 1: LANDING ---
  if (onboardingStep === 1) {
      return (
          <div className="max-w-2xl mx-auto py-20 text-center animate-fade-in">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex-center text-3xl mx-auto mb-8 border border-blue-500/20">🏅</div>
              <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Become a Certified Professional</h1>
              <p className="text-slate-400 text-lg mb-10 leading-relaxed">Join the elite network of laboratory experts. Get verified, access high-value opportunities, and work with top accredited labs.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                  <div className="glass-panel p-4 text-center">
                      <div className="text-xl mb-2">💎</div>
                      <div className="text-xs font-bold uppercase tracking-widest text-blue-400">Verified Badge</div>
                  </div>
                  <div className="glass-panel p-4 text-center">
                      <div className="text-xl mb-2">🚀</div>
                      <div className="text-xs font-bold uppercase tracking-widest text-blue-400">Job Access</div>
                  </div>
                  <div className="glass-panel p-4 text-center">
                      <div className="text-xl mb-2">🔬</div>
                      <div className="text-xs font-bold uppercase tracking-widest text-blue-400">Accredited Labs</div>
                  </div>
              </div>

              <button 
                  onClick={() => setOnboardingStep(2)}
                  className="btn-primary px-12 py-4 text-lg font-bold shadow-[0_0_30px_rgba(59,130,246,0.3)]"
              >
                  Start Application
              </button>
              <p className="mt-6 text-xs text-slate-500">👉 This increases completion rate.</p>
          </div>
      );
  }

  // --- STEP 2: BASIC FORM ---
  if (onboardingStep === 2) {
      return (
          <div className="max-w-2xl mx-auto py-10 animate-slide-up">
              <div className="mb-10 flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Step 2: Basic Profile</h2>
                  <span className="text-xs text-muted">Progress: 25%</span>
              </div>
              
              <form onSubmit={handleSaveBasic} className="glass-panel space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Full Name</label>
                          <input className="w-full p-3 border rounded bg-soft" value={basicForm.full_name} onChange={e => setBasicForm({...basicForm, full_name: e.target.value})} required />
                      </div>
                      <div>
                          <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Phone Number</label>
                          <input className="w-full p-3 border rounded bg-soft" value={basicForm.contact_phone} onChange={e => setBasicForm({...basicForm, contact_phone: e.target.value})} required />
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Field of Expertise</label>
                          <select className="w-full p-3 border rounded bg-soft" value={basicForm.specialty} onChange={e => setBasicForm({...basicForm, specialty: e.target.value})} required>
                              <option value="Microbiologist">Microbiologist</option>
                              <option value="Chemist">Chemist</option>
                              <option value="Pathologist">Pathologist</option>
                              <option value="Lab Technician">Lab Technician</option>
                              <option value="Quality Manager">Quality Manager</option>
                          </select>
                      </div>
                      <div>
                          <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Years of Experience</label>
                          <input type="number" className="w-full p-3 border rounded bg-soft" value={basicForm.experience_years} onChange={e => setBasicForm({...basicForm, experience_years: e.target.value})} required />
                      </div>
                  </div>
                  <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Location</label>
                      <input className="w-full p-3 border rounded bg-soft" value={basicForm.location} onChange={e => setBasicForm({...basicForm, location: e.target.value})} required placeholder="e.g. Nairobi, Kenya" />
                  </div>
                  <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Short Bio</label>
                      <textarea rows={4} className="w-full p-3 border rounded bg-soft" value={basicForm.bio} onChange={e => setBasicForm({...basicForm, bio: e.target.value})} required />
                  </div>
                  <button type="submit" className="btn-primary w-full py-4 text-lg font-bold">Save & Continue</button>
              </form>
          </div>
      );
  }

  // --- STEP 3: DOCUMENTS ---
  if (onboardingStep === 3) {
      return (
          <div className="max-w-2xl mx-auto py-10 animate-slide-up">
              <div className="mb-10 flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Step 3: Document Verification</h2>
                  <span className="text-xs text-muted">Progress: 50%</span>
              </div>
              
              <DocumentUpload 
                onUploadSuccess={fetchData} 
                existingDocs={profile?.documents || []} 
              />

              <div className="mt-10 flex gap-4">
                  <button onClick={() => setOnboardingStep(2)} className="btn-secondary flex-1">Back</button>
                  <button 
                    onClick={() => setOnboardingStep(4)} 
                    disabled={!profile?.documents || profile.documents.length === 0}
                    className="btn-primary flex-[2] py-4 font-bold"
                  >
                      Review Application
                  </button>
              </div>
          </div>
      );
  }

  // --- STEP 4: REVIEW ---
  if (onboardingStep === 4) {
      return (
          <div className="max-w-2xl mx-auto py-10 animate-slide-up">
              <div className="mb-10 text-center">
                  <h2 className="text-3xl font-black mb-2">Review Your Application</h2>
                  <p className="text-muted">Ensure all details are accurate before final submission.</p>
              </div>

              <div className="glass-panel space-y-6 mb-8">
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                      <div className="text-slate-500 uppercase font-bold text-[10px]">Full Name</div>
                      <div className="font-bold">{profile.full_name}</div>
                      
                      <div className="text-slate-500 uppercase font-bold text-[10px]">Expertise</div>
                      <div className="font-bold">{profile.specialty}</div>
                      
                      <div className="text-slate-500 uppercase font-bold text-[10px]">Experience</div>
                      <div className="font-bold">{profile.experience_years} Years</div>
                      
                      <div className="text-slate-500 uppercase font-bold text-[10px]">Documents</div>
                      <div className="font-bold">{profile.documents?.length || 0} Uploaded</div>
                  </div>
              </div>

              <div className="flex gap-4">
                  <button onClick={() => setOnboardingStep(3)} className="btn-secondary flex-1">Edit Documents</button>
                  <button onClick={handleSubmitApplication} className="btn-primary flex-[2] py-4 font-bold text-lg">Submit & Pay Fee</button>
              </div>
          </div>
      );
  }

  // --- STEP 5: PAYMENT ---
  if (onboardingStep === 5) {
      return (
          <div className="max-w-2xl mx-auto py-20 animate-fade-in text-center">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex-center text-3xl mx-auto mb-8 border border-green-500/20">📱</div>
              <h1 className="text-3xl font-black mb-4">Verification Fee Required</h1>
              <p className="text-slate-400 mb-10 leading-relaxed max-w-md mx-auto">
                  To proceed with certification, please complete the mandatory verification payment. 
                  Amount: <strong>KES 1,000</strong>
              </p>

              <div className="glass-panel border-amber-500/30 p-6 mb-10 text-left bg-amber-500/5">
                  <div className="text-[10px] font-bold text-amber-500 uppercase mb-2">Critical Rule</div>
                  <div className="text-sm font-bold text-white">NO PAYMENT → NO REVIEW</div>
              </div>

              {payStep === 'idle' ? (
                  <button 
                      onClick={handleVerificationPayment}
                      disabled={payLoading}
                      className="btn-primary w-full py-4 text-lg font-bold flex-center gap-3"
                  >
                      {payLoading ? "Initiating..." : "🚀 Pay with M-Pesa (KES 1,000)"}
                  </button>
              ) : (
                  <div className="space-y-6">
                      <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mx-auto"></div>
                      <p className="text-sm text-slate-400">Awaiting payment confirmation from M-Pesa...</p>
                  </div>
              )}
          </div>
      );
  }

  // --- STEP 6: PENDING STATE ---
  if (onboardingStep === 6) {
      return (
          <div className="max-w-2xl mx-auto py-20 text-center animate-fade-in">
              <div className="w-24 h-24 bg-amber-500/10 rounded-full flex-center text-4xl mx-auto mb-8 border border-amber-500/20">⏳</div>
              <h1 className="text-4xl font-black text-white mb-4">Under Review</h1>
              <div className="inline-block px-4 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-500 rounded-full text-xs font-bold mb-8 uppercase tracking-widest">
                  Status: Pending Audit
              </div>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed max-w-md mx-auto">Your verification fee has been received. Our team is now auditing your credentials.</p>
              
              <div className="glass-panel border-amber-500/20 bg-amber-500/5 p-6 mb-10 max-w-md mx-auto text-amber-500 font-bold text-sm">
                  ⚠️ Access to the marketplace is restricted until approval.
              </div>
          </div>
      );
  }

  // --- STEP 7: REJECTED STATE ---
  if (onboardingStep === 7) {
      return (
          <div className="max-w-2xl mx-auto py-20 text-center animate-fade-in">
              <div className="w-24 h-24 bg-red-500/10 rounded-full flex-center text-4xl mx-auto mb-8 border border-red-500/20">❌</div>
              <h1 className="text-4xl font-black text-white mb-4">Application Rejected</h1>
              <p className="text-slate-400 text-lg mb-10 leading-relaxed max-w-md mx-auto">Unfortunately, your application for expert certification has been rejected. Please review your documents and contact support for more details.</p>
              
              <button 
                  onClick={() => setOnboardingStep(2)}
                  className="btn-secondary px-8 py-3"
              >
                  Restart Application
              </button>
          </div>
      );
  }

  // --- FINAL DASHBOARD (STEP 0) ---
  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-10 flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-gradient">Expert Professional Dossier</h2>
          <p className="text-muted">A comprehensive technical passport for laboratory professionals.</p>
        </div>
        <div className="text-right">
            <span className={`pill ${profile?.certification_status === 'APPROVED' ? 'pill-paid' : 'pill-review'}`}>
                Status: {profile?.certification_status || 'NOT CREATED'}
            </span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-8 mb-8 overflow-x-auto">
        {[
            { id: 'profile', label: '👤 Basic Identity' },
            { id: 'experience', label: '🏢 Work History' },
            { id: 'skills', label: '🛠️ Technical Matrix' },
            { id: 'certs', label: '📜 Credentials' },
            { id: 'notices', label: '📢 Notice Board' }
        ].map(tab => (
                <button 
                    key={tab.id}
                    className={`pb-4 px-2 font-bold uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'text-blue-400 border-b-2 border-blue-400' : 'text-muted hover:text-white'}`}
                    onClick={() => setActiveTab(tab.id)}
                >
                    {tab.label}
                    {tab.id === 'notices' && hasUnread && <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.8)]"></span>}
                </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
            
            {/* BASIC PROFILE */}
            {activeTab === 'profile' && (
                <form onSubmit={handleSaveBasic} className="glass-panel space-y-6 animate-slide-up">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Full Name</label>
                            <input className="w-full p-3 border rounded bg-soft" value={basicForm.full_name} onChange={e => setBasicForm({...basicForm, full_name: e.target.value})} required />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Specialty</label>
                            <input className="w-full p-3 border rounded bg-soft" value={basicForm.specialty} onChange={e => setBasicForm({...basicForm, specialty: e.target.value})} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Years of Experience</label>
                            <input type="number" className="w-full p-3 border rounded bg-soft" value={basicForm.experience_years} onChange={e => setBasicForm({...basicForm, experience_years: e.target.value})} required />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Location / Region</label>
                            <input className="w-full p-3 border rounded bg-soft" value={basicForm.location} onChange={e => setBasicForm({...basicForm, location: e.target.value})} required />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Biography & Expertise Statement</label>
                        <textarea rows={6} className="w-full p-3 border rounded bg-soft" value={basicForm.bio} onChange={e => setBasicForm({...basicForm, bio: e.target.value})} required />
                    </div>
                    <button type="submit" className="btn-primary w-full py-3">Update Identity Ledger</button>
                </form>
            )}

            {/* EXPERIENCE, SKILLS, etc. (Omitted for brevity, keep existing logic) */}
            {activeTab === 'experience' && (
                <div className="space-y-8 animate-slide-up">
                    <form onSubmit={handleAddExperience} className="glass-panel border-l-4 border-blue-500">
                        <h3 className="text-sm font-bold uppercase mb-4">Add Professional Experience</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <input placeholder="Organization Name" className="p-2 border rounded" value={expForm.organization_name} onChange={e => setExpForm({...expForm, organization_name: e.target.value})} required />
                            <input placeholder="Role Title" className="p-2 border rounded" value={expForm.role_title} onChange={e => setExpForm({...expForm, role_title: e.target.value})} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <input type="date" className="p-2 border rounded" value={expForm.start_date} onChange={e => setExpForm({...expForm, start_date: e.target.value})} required />
                            <input type="date" className="p-2 border rounded" disabled={expForm.is_current} value={expForm.end_date} onChange={e => setExpForm({...expForm, end_date: e.target.value})} />
                        </div>
                        <textarea placeholder="Key Responsibilities..." className="w-full p-2 border rounded mb-4" rows={3} value={expForm.responsibilities} onChange={e => setExpForm({...expForm, responsibilities: e.target.value})} />
                        <button type="submit" className="btn-primary btn-sm">Add Record</button>
                    </form>
                    <div className="space-y-4">
                        {profile?.experience?.map(exp => (
                            <div key={exp.id} className="glass-panel flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold">{exp.role_title}</h4>
                                    <p className="text-sm text-blue-400 font-bold">{exp.organization_name}</p>
                                    <p className="text-[10px] text-muted uppercase mt-1">{exp.start_date} — {exp.is_current ? 'Present' : exp.end_date}</p>
                                </div>
                                <button className="text-red-400 text-xs hover:underline" onClick={() => handleDelete('experience', exp.id)}>Remove</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'skills' && (
                <div className="space-y-8 animate-slide-up">
                    <form onSubmit={handleAddSkill} className="glass-panel border-l-4 border-purple-500">
                        <h3 className="text-sm font-bold uppercase mb-4">Add Technical Skill</h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <input placeholder="Skill Name" className="p-2 border rounded" value={skillForm.skill_name} onChange={e => setSkillForm({...skillForm, skill_name: e.target.value})} required />
                            <select className="p-2 border rounded" value={skillForm.category} onChange={e => setSkillForm({...skillForm, category: e.target.value})}>
                                <option value="INSTRUMENT">Instrument</option>
                                <option value="METHOD">Method</option>
                            </select>
                            <select className="p-2 border rounded" value={skillForm.proficiency} onChange={e => setSkillForm({...skillForm, proficiency: e.target.value})}>
                                <option value="ADVANCED">Advanced</option>
                                <option value="EXPERT">Expert</option>
                            </select>
                        </div>
                        <button type="submit" className="btn-primary btn-sm">Register Skill</button>
                    </form>
                </div>
            )}
            
            {activeTab === 'notices' && (
                <div className="space-y-6 animate-fade-in">
                    {broadcasts.length === 0 ? (
                        <div className="glass-panel text-center py-20 text-slate-500 italic">No global broadcasts at this time.</div>
                    ) : (
                        <div className="space-y-6">
                            {broadcasts.map(bc => (
                                <div key={bc.id} className={`glass-panel border-l-4 p-6 transition-all ${bc.is_restricted ? 'border-amber-500 opacity-80' : 'border-blue-500 hover:border-blue-400'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-xl font-bold">{bc.subject}</h4>
                                        {bc.is_restricted && (
                                            <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-full border border-amber-500/20 uppercase tracking-widest">
                                                🔐 Certified Only
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Job Metadata Pills */}
                                    {bc.metadata && (
                                        <div className="flex gap-2 mb-4">
                                            {(() => {
                                                try {
                                                    const meta = typeof bc.metadata === 'string' ? JSON.parse(bc.metadata) : bc.metadata;
                                                    return (
                                                        <>
                                                            <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase font-bold">{meta.department}</span>
                                                            {meta.expertise && <span className="text-[9px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 uppercase font-bold">{meta.expertise}</span>}
                                                            <span className="text-[9px] bg-white/5 text-slate-400 px-2 py-0.5 rounded border border-white/10 uppercase font-bold">{meta.employment_type}</span>
                                                        </>
                                                    );
                                                } catch(e) { return null; }
                                            })()}
                                        </div>
                                    )}

                                    <p className="text-slate-300 text-sm mb-6 leading-relaxed">{bc.content}</p>
                                    
                                    <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                        <div className="flex items-center gap-4">
                                            {bc.application_status ? (
                                                <span className="text-xs font-bold text-green-500 uppercase tracking-widest flex items-center gap-1">
                                                    ✓ Applied ({bc.application_status})
                                                </span>
                                            ) : (
                                                <button 
                                                    onClick={() => handleApply(bc.id)}
                                                    disabled={bc.is_restricted}
                                                    className={`px-6 py-2 rounded font-bold uppercase text-[10px] tracking-widest transition-all ${bc.is_restricted ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg'}`}
                                                >
                                                    {bc.is_restricted ? "Unlock via Certification" : "Express Interest"}
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-500">{new Date(bc.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* SIDEBAR */}
        <div>
            {/* Subscription & Billing Section */}
            <div className="glass-panel border-l-4 border-emerald-500 mb-6 sticky top-8">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Subscription & Billing</h4>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        profile?.subscription_status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                        {profile?.subscription_status || 'INACTIVE'}
                    </span>
                </div>

                <div className="space-y-4 mb-6">
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Current Plan</div>
                        <div className="text-sm font-bold text-white">{profile?.subscription_tier || 'PRO EXPERT'}</div>
                    </div>
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Membership Expiry</div>
                        <div className="text-sm font-bold text-blue-400">
                            {profile?.subscription_expiry ? new Date(profile.subscription_expiry).toLocaleDateString() : 'Immediate Action Required'}
                        </div>
                    </div>
                </div>

                {/* Renewal Actions */}
                <div className="space-y-2">
                    <button 
                        onClick={() => setPayTarget({ amount: 1500, tier: 'MONTHLY' })}
                        className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-bold uppercase transition-all"
                    >
                        Renew Monthly (KES 1,500)
                    </button>
                    <button 
                        onClick={() => setPayTarget({ amount: 15000, tier: 'ANNUAL' })}
                        className="w-full py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 rounded text-[10px] font-bold uppercase text-emerald-400 transition-all"
                    >
                        Save with Annual (KES 15k)
                    </button>
                </div>
            </div>

            <div className="glass-panel border-l-4 border-blue-500 mb-6">
                <h4 className="text-xs font-bold uppercase mb-6 tracking-widest">Dossier Quality</h4>
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex-center text-blue-400 text-xs">✓</div>
                        <div className="text-xs font-bold text-slate-300">Identity Verified</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex-center text-xs ${profile?.documents?.length >= 3 ? 'bg-green-500/10 text-green-500' : 'bg-slate-800 text-slate-500'}`}>
                            {profile?.documents?.length >= 3 ? '✓' : '!'}
                        </div>
                        <div className="text-xs font-bold text-slate-300">Credentials Audit</div>
                    </div>
                </div>
            </div>

            {/* Payment Modal Integration */}
            {payTarget && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex-center p-6">
                    <div className="max-w-md w-full">
                        <PaymentGateway 
                            amount={payTarget.amount}
                            paymentType="SUBSCRIPTION"
                            metadata={{ tier: payTarget.tier }}
                            onSuccess={() => {
                                setPayTarget(null);
                                fetchData();
                            }}
                            onCancel={() => setPayTarget(null)}
                        />
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
