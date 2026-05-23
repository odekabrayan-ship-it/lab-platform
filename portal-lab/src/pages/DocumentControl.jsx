import { useState, useEffect } from "react";
import API from "../services/api";

export default function DocumentControl() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: '', document_code: '', type: 'SOP', review_due_date: '', file_url: '' });

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const res = await API.get("/api/documents");
            setDocs(res.data.data || []);
        } catch { setDocs([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDocs(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await API.post("/api/documents", form);
            setShowModal(false);
            fetchDocs();
        } catch (err) { alert(err.response?.data?.message || "Failed"); }
    };

    const handleApprove = async (id) => {
        if(!confirm("Approve this document? This will archive any previous active versions.")) return;
        try {
            await API.patch(`/api/documents/${id}/approve`);
            fetchDocs();
        } catch (err) { alert(err.response?.data?.message || "Failed to approve"); }
    };

    const statusBadge = (s) => {
        if(s === 'ACTIVE') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        if(s === 'DRAFT') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        return 'bg-slate-800 text-slate-500 border-white/5';
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Document <span className="text-blue-500">Control</span></h2>
                    <p className="text-slate-400 text-sm mt-1">ISO 17025 §8.3 — Controlled registry of SOPs, policies, and manuals.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all">
                    + Upload Draft
                </button>
            </div>

            <div className="glass-panel p-0 overflow-hidden">
                <table className="data-table text-sm w-full">
                    <thead>
                        <tr>
                            <th>Document Code / Title</th>
                            <th>Version</th>
                            <th>Status</th>
                            <th>Author / Approver</th>
                            <th>Review Due</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr> : docs.map(doc => (
                            <tr key={doc.id}>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-white/5 text-slate-400 border border-white/10">{doc.type}</span>
                                        <div className="font-bold text-white">{doc.document_code}</div>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1">{doc.title}</div>
                                </td>
                                <td><span className="font-mono text-xs bg-slate-900 px-2 py-1 rounded">v{doc.version_major}.{doc.version_minor}</span></td>
                                <td><span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${statusBadge(doc.status)}`}>{doc.status}</span></td>
                                <td className="text-[10px] text-slate-500">
                                    <div><span className="font-bold text-slate-400">By:</span> {doc.author_email?.split('@')[0]}</div>
                                    {doc.approver_email && <div><span className="font-bold text-emerald-500">Approved:</span> {doc.approver_email?.split('@')[0]}</div>}
                                </td>
                                <td className={`font-mono text-xs ${doc.review_due_date && new Date(doc.review_due_date) < new Date() ? 'text-red-400' : 'text-slate-400'}`}>
                                    {doc.review_due_date || '--'}
                                </td>
                                <td>
                                    <div className="flex gap-3">
                                        {doc.file_url && <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-400 hover:underline">View PDF</a>}
                                        {doc.status === 'DRAFT' && <button onClick={() => handleApprove(doc.id)} className="text-[10px] font-bold text-emerald-400 hover:underline">Approve</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="glass-panel w-full max-w-lg p-6">
                        <h3 className="text-xl font-black text-white mb-4">Upload Draft Document</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input required className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="Doc Code (e.g. SOP-001)" value={form.document_code} onChange={e => setForm({...form, document_code: e.target.value})} />
                                <select className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                                    <option value="SOP">SOP</option>
                                    <option value="POLICY">Policy</option>
                                    <option value="FORM">Form</option>
                                    <option value="MANUAL">Manual</option>
                                </select>
                            </div>
                            <input required className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="Document Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                            <input className="w-full p-3 bg-slate-900 border border-white/10 rounded-lg text-sm" placeholder="File URL (e.g. Sharepoint Link)" value={form.file_url} onChange={e => setForm({...form, file_url: e.target.value})} />
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase">Review Due Date</label>
                                <input type="date" required className="w-full mt-1 p-3 bg-slate-900 border border-white/10 rounded-lg text-sm text-slate-300" value={form.review_due_date} onChange={e => setForm({...form, review_due_date: e.target.value})} />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-800 text-white font-black text-[10px] uppercase rounded-xl">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-black text-[10px] uppercase rounded-xl">Upload Draft</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
