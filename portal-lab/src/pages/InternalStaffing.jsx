import { useState, useEffect } from "react";
import API from "../services/api";

export default function InternalStaffing() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        sub_role: "IQC_ANALYST"
    });

    const ROLES = [
        { key: "IQC_REGISTRAR", label: "Sample Registrar", unit: "Intake Unit" },
        { key: "IQC_ANALYST", label: "Technical Analyst", unit: "Technical Bench" },
        { key: "IQC_REVIEWER", label: "QA Validator", unit: "QA Unit" },
        { key: "IQC_MANAGER", label: "IQC Lab Manager", unit: "Operations" }
    ];

    const fetchStaff = async () => {
        try {
            // Reusing team API but filtering/marking internal roles
            const res = await API.get("/api/team");
            setStaff(res.data.data.filter(u => u.sub_role && u.sub_role.startsWith("IQC_")));
        } catch (e) {
            console.error("Failed to fetch internal staffing matrix");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStaff(); }, []);

    const handleInvite = async (e) => {
        e.preventDefault();
        try {
            await API.post("/api/team/invite", { ...formData, role: 'client' });
            alert(`Invitation sent to ${formData.email} for ${formData.sub_role} unit.`);
            setFormData({ email: "", sub_role: "IQC_ANALYST" });
            setShowInvite(false);
            fetchStaff();
        } catch (e) {
            alert("Invitation failed");
        }
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Technical Staffing Matrix</h2>
                    <p className="text-slate-400 text-sm mt-1">Manage competency assignments and technical unit access for the internal laboratory.</p>
                </div>
                <button 
                    onClick={() => setShowInvite(!showInvite)}
                    className="btn-primary px-8 py-3 bg-emerald-600 hover:bg-emerald-500 border-none font-bold uppercase tracking-widest text-xs"
                >
                    {showInvite ? "✕ Cancel" : "＋ Recruit Expert"}
                </button>
            </div>

            {showInvite && (
                <div className="glass-panel p-8 animate-slide-in border-emerald-500/20 bg-emerald-500/5">
                    <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Expert Email Address</label>
                            <input 
                                required
                                type="email"
                                className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-emerald-500 text-sm"
                                placeholder="analyst@company.com"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Functional Technical Unit</label>
                            <select 
                                className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-emerald-500 text-sm"
                                value={formData.sub_role}
                                onChange={e => setFormData({ ...formData, sub_role: e.target.value })}
                            >
                                {ROLES.map(r => (
                                    <option key={r.key} value={r.key}>{r.label} ({r.unit})</option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" className="btn-primary py-3.5 bg-emerald-600 font-bold">Send Activation Link</button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                <div className="glass-panel p-0 overflow-hidden">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Active Internal Matrix</h3>
                        <span className="text-[10px] font-bold text-slate-500">{staff.length} Active Personnel</span>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Personnel Email</th>
                                <th>Assigned Unit</th>
                                <th>Access Level</th>
                                <th className="text-right">OS Authorization</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-12 text-slate-500">No technical staff assigned. Use 'Recruit Expert' to begin.</td>
                                </tr>
                            ) : staff.map(member => {
                                const roleInfo = ROLES.find(r => r.key === member.sub_role) || { label: member.sub_role, unit: "N/A" };
                                return (
                                    <tr key={member.id} className="hover:bg-white/5 transition-colors">
                                        <td className="font-bold text-white">{member.email}</td>
                                        <td>
                                            <span className="text-xs text-blue-400 font-black uppercase tracking-tighter">{roleInfo.unit}</span>
                                        </td>
                                        <td>
                                            <span className="text-[10px] font-bold text-slate-400">{roleInfo.label}</span>
                                        </td>
                                        <td className="text-right">
                                            <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-widest">✅ OS ENABLED</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Matrix Competency Visualization (Manager Oversight) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {ROLES.map(r => (
                    <div key={r.key} className="glass-panel p-4 text-center border-white/5">
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-2">{r.unit}</div>
                        <div className="text-2xl font-black text-white">{staff.filter(s => s.sub_role === r.key).length}</div>
                        <div className="text-[10px] text-slate-600 mt-1 uppercase font-bold">Personnel</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
