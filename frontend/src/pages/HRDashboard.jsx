import { useState, useEffect } from "react";
import API from "../services/api";

export default function HRDashboard({ activeSection: initialSection = "dashboard" }) {
    const [activeSection, setActiveSection] = useState(initialSection);
    const [jobs, setJobs] = useState([]);
    const [talentPool, setTalentPool] = useState([]);
    const [applications, setApplications] = useState([]);
    const [staff, setStaff] = useState([]);
    const [methods, setMethods] = useState([]);
    const [authorizations, setAuthorizations] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [poolFilters, setPoolFilters] = useState({ specialty: "", min_experience: "", location: "", method_expertise: "" });

    // Modals
    const [showJobForm, setShowJobForm] = useState(false);
    const [showMethodModal, setShowMethodModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(null); // stores professional object

    // Forms
    const [jobForm, setJobForm] = useState({ title: "", department: "Microbiology", expertise: "", experience: 2, location: "", employment_type: "Permanent", certification_enforced: true, description: "" });
    const [methodForm, setMethodForm] = useState({ name: "", code: "", description: "", category: "", equipment_needed: "" });
    const [authForm, setAuthForm] = useState({ user_id: "", method_id: "", expiry_at: "", notes: "" });
    const [inviteForm, setInviteForm] = useState({ broadcast_id: "", message: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [jobsList, talent, apps, staffList, methodList, authList] = await Promise.all([
                API.get("/api/hr/jobs"),
                API.get(`/api/hr/talent-pool?${new URLSearchParams(poolFilters)}`),
                API.get("/api/hr/applications"),
                API.get("/api/hr/staff"),
                API.get("/api/methods"),
                API.get("/api/lab/authorizations")
            ]);
            setJobs(jobsList.data.data);
            setTalentPool(talent.data.data);
            setApplications(apps.data.data);
            setStaff(staffList.data.data);
            setMethods(methodList.data.data);
            setAuthorizations(authList.data.data);
        } catch (e) { console.error("HR sync failed"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [poolFilters]);

    const handleJobSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post("/api/hr/jobs", jobForm);
            alert("🚀 Job opportunity broadcasted.");
            setShowJobForm(false);
            setJobForm({ title: "", department: "Microbiology", expertise: "", experience: 2, location: "", employment_type: "Permanent", certification_enforced: true, description: "" });
            fetchData();
        } catch (err) { alert("Job posting failed"); }
    };

    const handleUpdateAppStatus = async (appId, status) => {
        try {
            await API.patch(`/api/hr/applications/${appId}`, { status });
            fetchData();
        } catch (err) { alert("Status update failed"); }
    };

    const handleInviteSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post("/api/hr/invitations", { ...inviteForm, professional_id: showInviteModal.id });
            alert("Invitation sent to " + showInviteModal.full_name);
            setShowInviteModal(null);
            setInviteForm({ broadcast_id: "", message: "" });
        } catch (err) { alert("Invitation failed"); }
    };

    const handleMethodSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post("/api/methods", methodForm);
            setMethodForm({ name: "", code: "", description: "", category: "", equipment_needed: "" });
            fetchData();
        } catch (err) { alert("Method registration failed"); }
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post("/api/lab/authorizations", authForm);
            setShowAuthModal(false);
            setAuthForm({ user_id: "", method_id: "", expiry_at: "", notes: "" });
            fetchData();
        } catch (err) { alert(err.response?.data?.message || "Authorization failed"); }
    };

    const expiringStaff = authorizations.filter(a => a.expiry_at && new Date(a.expiry_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    const sidebarItems = [
        { id: 'dashboard', label: '🏠 HR Dashboard' },
        { id: 'postings', label: '📢 Job Postings' },
        { id: 'apps', label: '📄 Applications' },
        { id: 'pool', label: '👤 Talent Pool' },
        { id: 'staff', label: '🧾 Staff Roster' },
        { id: 'competence', label: '🎯 Competence' }
    ];

    return (
        <div className="flex gap-8 animate-fade-in min-h-[80vh]">
            {/* Sidebar Navigation */}
            <div className="w-64 space-y-2">
                <div className="p-4 mb-6">
                    <h2 className="text-xl font-black text-blue-500">HR Portal</h2>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Enterprise Talent Management</p>
                </div>
                {sidebarItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeSection === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
                {loading && activeSection === 'dashboard' ? (
                    <div className="h-full flex-center italic text-slate-500">Syncing Human Capital Ledger...</div>
                ) : (
                    <div className="space-y-8">
                        {/* 🏠 DASHBOARD */}
                        {activeSection === 'dashboard' && (
                            <div className="animate-slide-up space-y-8">
                                <div className="grid grid-cols-4 gap-6">
                                    <div className="glass-panel border-l-4 border-blue-500">
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Open Positions</div>
                                        <div className="text-3xl font-bold">{jobs.length}</div>
                                    </div>
                                    <div className="glass-panel border-l-4 border-purple-500">
                                        <div className="text-[10px] uppercase font-bold text-slate-500">New Applications</div>
                                        <div className="text-3xl font-bold">{applications.filter(a => a.status === 'PENDING').length}</div>
                                    </div>
                                    <div className="glass-panel border-l-4 border-green-500">
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Global Experts</div>
                                        <div className="text-3xl font-bold">{talentPool.length}</div>
                                    </div>
                                    <div className="glass-panel border-l-4 border-amber-500">
                                        <div className="text-[10px] uppercase font-bold text-slate-500">Expiring Competence</div>
                                        <div className="text-3xl font-bold text-amber-500">{expiringStaff.length}</div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="glass-panel">
                                        <h3 className="font-bold mb-6">Pipeline Velocity</h3>
                                        <div className="space-y-4">
                                            {applications.slice(0, 3).map(app => (
                                                <div key={app.id} className="flex justify-between items-center p-4 bg-white/5 rounded border border-white/5">
                                                    <div>
                                                        <div className="font-bold">{app.full_name}</div>
                                                        <div className="text-[10px] text-slate-500 uppercase">{app.job_title}</div>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${app.status === 'HIRED' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>{app.status}</span>
                                                </div>
                                            ))}
                                            {applications.length === 0 && <div className="text-sm italic text-slate-500 py-4">No active applications.</div>}
                                        </div>
                                    </div>
                                    <div className="glass-panel">
                                        <h3 className="font-bold mb-6">Staff Performance Risks</h3>
                                        <div className="space-y-4">
                                            {expiringStaff.slice(0, 3).map(auth => (
                                                <div key={auth.id} className="flex justify-between items-center p-3 bg-amber-500/5 rounded border border-amber-500/20">
                                                    <div className="text-xs">
                                                        <span className="font-bold text-amber-500">{auth.staff_email}</span>
                                                        <div className="text-slate-400">{auth.method_name} - Expires {new Date(auth.expiry_at).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {expiringStaff.length === 0 && <div className="text-sm italic text-green-500/60 py-4">✓ No competence risks detected.</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 📢 JOB POSTINGS */}
                        {activeSection === 'postings' && (
                            <div className="animate-slide-up space-y-6">
                                <div className="flex justify-between items-end">
                                    <h2 className="text-2xl font-bold">Active Recruitment</h2>
                                    <button onClick={() => setShowJobForm(true)} className="btn-primary py-2 px-6">Post New Role</button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {jobs.map(job => (
                                        <div key={job.id} className="glass-panel group border-white/5 hover:border-blue-500/20 transition-all">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{job.subject}</h3>
                                                    <div className="flex gap-3 mt-2">
                                                        <span className="pill text-[10px] bg-blue-500/10 text-blue-400">{job.metadata.department}</span>
                                                        <span className="pill text-[10px] bg-purple-500/10 text-purple-400">{job.metadata.employment_type}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-400 mt-4">{job.content}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-white">{applications.filter(a => a.broadcast_id === job.id).length}</div>
                                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Applicants</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 📄 APPLICATIONS */}
                        {activeSection === 'apps' && (
                            <div className="animate-slide-up space-y-6">
                                <h2 className="text-2xl font-bold">Application Management</h2>
                                <div className="glass-panel p-0 overflow-hidden">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Candidate</th>
                                                <th>Certification</th>
                                                <th>Experience</th>
                                                <th>Job Role</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {applications.map(app => (
                                                <tr key={app.id}>
                                                    <td>
                                                        <div className="font-bold">{app.full_name}</div>
                                                        <div className="text-[10px] text-slate-500 uppercase">{app.specialty}</div>
                                                    </td>
                                                    <td>
                                                        <span className={`pill text-[10px] ${app.certification_status === 'approved' ? 'pill-paid' : 'bg-slate-700 text-slate-400'}`}>
                                                            {app.certification_status === 'approved' ? 'VERIFIED' : 'PENDING'}
                                                        </span>
                                                    </td>
                                                    <td className="text-sm font-bold">{app.experience_years} Years</td>
                                                    <td className="text-sm text-blue-400">{app.job_title}</td>
                                                    <td>
                                                        <span className={`pill text-[10px] ${app.status === 'HIRED' ? 'pill-paid' : app.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                            {app.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="flex gap-2">
                                                            {app.status === 'PENDING' && <button onClick={() => handleUpdateAppStatus(app.id, 'SHORTLISTED')} className="btn-sm py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all">Shortlist</button>}
                                                            {app.status === 'SHORTLISTED' && <button onClick={() => handleUpdateAppStatus(app.id, 'HIRED')} className="btn-sm py-1 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-all">Hire</button>}
                                                            {app.status !== 'REJECTED' && app.status !== 'HIRED' && <button onClick={() => handleUpdateAppStatus(app.id, 'REJECTED')} className="btn-sm py-1 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all">Reject</button>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 👤 TALENT POOL */}
                        {activeSection === 'pool' && (
                            <div className="animate-slide-up space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold">Expert Talent Sourcing</h2>
                                </div>
                                
                                <div className="grid grid-cols-4 gap-4 p-4 glass-panel bg-white/5 border-white/10">
                                    <input placeholder="Filter Specialty..." className="p-2 bg-black/20 border border-white/10 rounded text-xs" value={poolFilters.specialty} onChange={e => setPoolFilters({...poolFilters, specialty: e.target.value})} />
                                    <input type="number" placeholder="Min Exp..." className="p-2 bg-black/20 border border-white/10 rounded text-xs" value={poolFilters.min_experience} onChange={e => setPoolFilters({...poolFilters, min_experience: e.target.value})} />
                                    <input placeholder="Location..." className="p-2 bg-black/20 border border-white/10 rounded text-xs" value={poolFilters.location} onChange={e => setPoolFilters({...poolFilters, location: e.target.value})} />
                                    <input placeholder="Method Expertise..." className="p-2 bg-black/20 border border-white/10 rounded text-xs" value={poolFilters.method_expertise} onChange={e => setPoolFilters({...poolFilters, method_expertise: e.target.value})} />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    {talentPool.map(pro => (
                                        <div key={pro.id} className="glass-panel group hover:border-blue-500/20 transition-all">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex-center text-xl grayscale group-hover:grayscale-0 transition-all">🔬</div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-white">{pro.full_name}</h4>
                                                    <p className="text-xs text-blue-400 font-bold">{pro.specialty}</p>
                                                    <div className="text-[10px] text-slate-500 uppercase mt-1">{pro.experience_years}y Exp • {pro.location}</div>
                                                    <button 
                                                        onClick={() => setShowInviteModal(pro)}
                                                        className="mt-4 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors"
                                                    >
                                                        Invite to Apply →
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 🧾 STAFF ROSTER */}
                        {activeSection === 'staff' && (
                            <div className="animate-slide-up space-y-6">
                                <h2 className="text-2xl font-bold">Organizational Staffing</h2>
                                <div className="glass-panel p-0 overflow-hidden">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Employee</th>
                                                <th>Role</th>
                                                <th>Status</th>
                                                <th>Joined Network</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {staff.map(member => (
                                                <tr key={member.id}>
                                                    <td>
                                                        <div className="font-bold">{member.email}</div>
                                                        <div className="text-[10px] text-slate-500 uppercase font-mono">UID: {member.user_id}</div>
                                                    </td>
                                                    <td className="text-sm font-bold text-blue-400">{member.role || 'Staff'}</td>
                                                    <td><span className={`pill text-[10px] ${member.status === 'active' ? 'pill-paid' : 'bg-red-500/20 text-red-400'}`}>{member.status.toUpperCase()}</span></td>
                                                    <td className="text-xs text-slate-500">{new Date(member.joined_at).toLocaleDateString()}</td>
                                                    <td><button className="text-blue-400 text-xs font-bold hover:underline">Manage</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 🎯 COMPETENCE & AUTHORIZATION */}
                        {activeSection === 'competence' && (
                            <div className="animate-slide-up space-y-8">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold">Technical Competence Matrix</h2>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowMethodModal(true)} className="btn-sm btn-secondary text-blue-400">Manage Methods</button>
                                        <button onClick={() => setShowAuthModal(true)} className="btn-sm btn-primary">Issue Authorization</button>
                                    </div>
                                </div>
                                <div className="glass-panel p-0 overflow-hidden">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Staff Member</th>
                                                <th>Authorized Method</th>
                                                <th>Status</th>
                                                <th>Expiry</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {authorizations.map(auth => (
                                                <tr key={auth.id}>
                                                    <td className="font-bold">{auth.staff_email}</td>
                                                    <td>
                                                        <div className="text-sm font-bold text-blue-400">{auth.method_name}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">{auth.method_code}</div>
                                                    </td>
                                                    <td><span className="pill text-[10px] pill-paid">{auth.status}</span></td>
                                                    <td className="text-xs text-slate-400">{auth.expiry_at ? new Date(auth.expiry_at).toLocaleDateString() : 'N/A'}</td>
                                                    <td><button className="text-slate-500 hover:text-red-400 transition-colors">Revoke</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex-center p-6">
                    <div className="glass-panel w-full max-w-md animate-scale-up">
                        <h3 className="text-xl font-bold mb-6 text-blue-400">Targeted Sourcing: {showInviteModal.full_name}</h3>
                        <form onSubmit={handleInviteSubmit} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Select Open Role</label>
                                <select className="w-full p-3 bg-white/5 border border-white/10 rounded" value={inviteForm.broadcast_id} onChange={e => setInviteForm({...inviteForm, broadcast_id: e.target.value})} required>
                                    <option value="">-- Choose Job Posting --</option>
                                    {jobs.map(j => <option key={j.id} value={j.id}>{j.subject}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Invitation Message</label>
                                <textarea className="w-full p-3 bg-white/5 border border-white/10 rounded h-32" placeholder="Explain why they are a good fit..." value={inviteForm.message} onChange={e => setInviteForm({...inviteForm, message: e.target.value})} />
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowInviteModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
                                <button type="submit" className="btn-primary flex-1 py-3">Send Invitation</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Other Modals (Omitted for brevity, keep existing JobForm, MethodModal, AuthModal logic) */}
            {showJobForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex-center p-6">
                    <div className="glass-panel w-full max-w-2xl animate-scale-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">New Recruitment Opportunity</h3>
                            <button onClick={() => setShowJobForm(false)} className="text-slate-500 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleJobSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Job Title</label>
                                    <input className="w-full p-3 bg-white/5 border border-white/10 rounded" value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} required />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Department</label>
                                    <select className="w-full p-3 bg-white/5 border border-white/10 rounded" value={jobForm.department} onChange={e => setJobForm({...jobForm, department: e.target.value})}>
                                        <option value="Microbiology">Microbiology</option>
                                        <option value="Chemistry">Chemistry</option>
                                        <option value="Molecular Biology">Molecular Biology</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Required Expertise</label>
                                    <select className="w-full p-3 bg-white/5 border border-white/10 rounded" value={jobForm.expertise} onChange={e => setJobForm({...jobForm, expertise: e.target.value})}>
                                        <option value="">-- Select Method --</option>
                                        {methods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Job Description</label>
                                    <textarea className="w-full p-3 bg-white/5 border border-white/10 rounded h-32" value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} />
                                </div>
                            </div>
                            <button type="submit" className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-widest">Broadcast Job Opportunity</button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* ... Other modals like Method and Auth ... */}
        </div>
    );
}
