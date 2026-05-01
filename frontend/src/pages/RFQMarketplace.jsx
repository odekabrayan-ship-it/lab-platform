import { useState, useEffect } from "react";
import API from "../services/api";

export default function RFQMarketplace() {
    const [rfqs, setRfqs] = useState([]);
    const [selectedRFQ, setSelectedRFQ] = useState(null);
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBidModal, setShowBidModal] = useState(false);
    const [showComparison, setShowComparison] = useState(false);
    
    const [newRFQ, setNewRFQ] = useState({
        title: "",
        description: "",
        sample_type: "",
        required_standards: "",
        deadline: ""
    });

    const [newBid, setNewBid] = useState({
        price: "",
        turnaround_time: "",
        capability_statement: "",
        method_proposal: ""
    });

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    useEffect(() => {
        fetchRFQs();
    }, []);

    const fetchRFQs = async () => {
        setLoading(true);
        try {
            const res = await API.get("/api/rfqs");
            setRfqs(res.data.data);
        } catch (e) {
            console.error("Failed to fetch RFQs");
        } finally {
            setLoading(false);
        }
    };

    const fetchRFQDetails = async (id) => {
        try {
            const res = await API.get(`/api/rfqs/${id}`);
            setSelectedRFQ(res.data.data.rfq);
            setBids(res.data.data.bids);
        } catch (e) {
            alert("Failed to load details");
        }
    };

    const handleCreateRFQ = async (e) => {
        e.preventDefault();
        try {
            await API.post("/api/rfqs", newRFQ);
            setShowCreateModal(false);
            fetchRFQs();
            setNewRFQ({ title: "", description: "", sample_type: "", required_standards: "", deadline: "" });
        } catch (e) {
            alert("Failed to create RFQ");
        }
    };

    const handleSubmitBid = async (e) => {
        e.preventDefault();
        try {
            await API.post(`/api/rfqs/${selectedRFQ.id}/bids`, newBid);
            setShowBidModal(false);
            fetchRFQDetails(selectedRFQ.id);
            setNewBid({ price: "", turnaround_time: "", capability_statement: "", method_proposal: "" });
            alert("Bid submitted successfully!");
        } catch (e) {
            alert("Failed to submit bid");
        }
    };

    const handleAwardBid = async (bidId) => {
        if (!confirm("Are you sure you want to award this contract? All other bids will be rejected.")) return;
        try {
            await API.post(`/api/bids/${bidId}/accept`);
            fetchRFQDetails(selectedRFQ.id);
            alert("Contract awarded!");
        } catch (e) {
            alert("Failed to award bid");
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">RFQ Bidding Marketplace</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {user.role === 'client' 
                            ? "Publish your testing requirements and receive competitive bids from verified labs."
                            : "Discover testing opportunities and submit competitive proposals to corporate clients."}
                    </p>
                </div>
                {user.role === 'client' && (
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary py-3 px-6"
                    >
                        + Create New RFQ
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* RFQ List */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                        {user.role === 'client' ? "Your Active RFQs" : "Open Opportunities"}
                    </h3>
                    
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-800/50 rounded-xl" />)}
                        </div>
                    ) : rfqs.length === 0 ? (
                        <div className="glass-panel p-10 text-center text-slate-500">
                            No RFQs found.
                        </div>
                    ) : (
                        rfqs.map(rfq => (
                            <div 
                                key={rfq.id}
                                onClick={() => fetchRFQDetails(rfq.id)}
                                className={`p-4 glass-panel cursor-pointer transition-all border-l-4 ${
                                    selectedRFQ?.id === rfq.id ? 'border-blue-500 bg-blue-500/5' : 'border-transparent hover:border-white/20'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-sm">{rfq.title}</h4>
                                    <span className={`text-[8px] px-2 py-1 rounded-full uppercase font-bold ${
                                        rfq.status === 'open' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                                    }`}>
                                        {rfq.status}
                                    </span>
                                </div>
                                <div className="text-[10px] text-slate-400 flex gap-4">
                                    <span>📦 {rfq.sample_type}</span>
                                    <span>📅 {new Date(rfq.deadline).toLocaleDateString()}</span>
                                </div>
                                {user.role === 'client' && (
                                    <div className="mt-3 pt-3 border-t border-white/5 text-[10px] font-bold text-blue-400">
                                        {rfq.bid_count} Bids Received
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* RFQ Details & Bids */}
                <div className="lg:col-span-2">
                    {selectedRFQ ? (
                        <div className="glass-panel p-8 animate-scale-up">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">{selectedRFQ.title}</h2>
                                    <div className="flex gap-4 text-xs text-slate-400">
                                        <span>Published by: <strong className="text-white">{selectedRFQ.company_name}</strong></span>
                                        <span>Location: <strong className="text-white">{selectedRFQ.city}, {selectedRFQ.country}</strong></span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {user.role === 'client' && bids.length > 1 && (
                                        <button 
                                            onClick={() => setShowComparison(true)}
                                            className="btn-secondary py-2 px-6 flex items-center gap-2"
                                        >
                                            📊 Compare Bids
                                        </button>
                                    )}
                                    {user.role === 'lab' && selectedRFQ.status === 'open' && !bids.some(b => b.lab_id === user.id) && (
                                        <button 
                                            onClick={() => setShowBidModal(true)}
                                            className="btn-primary py-2 px-6"
                                        >
                                            Submit Proposal
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Requirement Description</label>
                                        <p className="text-sm text-slate-300 leading-relaxed">{selectedRFQ.description}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sample Type</label>
                                        <p className="text-sm text-white font-semibold">{selectedRFQ.sample_type}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Required Standards</label>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRFQ.required_standards?.split(',').map(s => (
                                                <span key={s} className="bg-slate-800 px-3 py-1 rounded text-[10px] border border-white/5">{s.trim()}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Deadline for Submission</label>
                                        <p className="text-sm text-red-400 font-bold">{new Date(selectedRFQ.deadline).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/10">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Received Proposals</h3>
                                
                                <div className="space-y-4">
                                    {bids.length === 0 ? (
                                        <div className="p-10 text-center border-2 border-dashed border-white/5 rounded-xl text-slate-500 text-sm">
                                            No proposals received yet.
                                        </div>
                                    ) : (
                                        bids.map(bid => (
                                            <div key={bid.id} className={`p-6 rounded-xl border ${bid.status === 'accepted' ? 'border-green-500/50 bg-green-500/5' : 'border-white/5 bg-slate-900/50'}`}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <h4 className="font-bold">{bid.lab_name}</h4>
                                                            <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">{bid.accreditation_status}</span>
                                                            <button 
                                                                onClick={() => window.open(`/explore?labId=${bid.lab_id}`, '_blank')}
                                                                className="text-[10px] text-slate-500 hover:text-blue-400 transition-colors underline"
                                                            >
                                                                View Full Profile
                                                            </button>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400">{bid.lab_city}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-white">KES {bid.price.toLocaleString()}</div>
                                                        <div className="text-[10px] text-green-400 font-bold uppercase tracking-widest">{bid.turnaround_time} TAT</div>
                                                    </div>
                                                </div>
                                                
                                                <p className="text-xs text-slate-400 mb-2 italic leading-relaxed">
                                                    "{bid.capability_statement}"
                                                </p>
                                                
                                                {bid.method_proposal && (
                                                    <div className="bg-slate-950/50 p-4 rounded border border-white/5 mb-4">
                                                        <label className="text-[9px] font-bold text-blue-400 uppercase block mb-1">Proposed Methodology</label>
                                                        <p className="text-[11px] text-slate-300 leading-relaxed font-mono">{bid.method_proposal}</p>
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                                    <span className={`text-[10px] font-bold uppercase ${
                                                        bid.status === 'accepted' ? 'text-green-500' : bid.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                                                    }`}>
                                                        Status: {bid.status}
                                                    </span>
                                                    {user.role === 'client' && selectedRFQ.status === 'open' && (
                                                        <button 
                                                            onClick={() => handleAwardBid(bid.id)}
                                                            className="btn-primary py-2 px-6 bg-green-600 hover:bg-green-500 border-none"
                                                        >
                                                            Award Contract
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex-center flex-col glass-panel p-20 text-center opacity-50">
                            <div className="text-6xl mb-6">📈</div>
                            <h2 className="text-xl font-bold">Select an RFQ to view details</h2>
                            <p className="text-sm text-slate-400 mt-2">Browse the marketplace and track real-time proposals.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create RFQ Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex-center p-6">
                    <form onSubmit={handleCreateRFQ} className="glass-panel w-full max-w-lg p-8 animate-scale-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Publish New RFQ</h3>
                            <button onClick={() => setShowCreateModal(false)} type="button" className="text-slate-500 hover:text-white">✕</button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Testing Goal / Title</label>
                                <input 
                                    className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500"
                                    placeholder="e.g., Annual Microbiological Water Quality Audit"
                                    value={newRFQ.title} onChange={e => setNewRFQ({...newRFQ, title: e.target.value})} required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Detailed Requirements</label>
                                <textarea 
                                    className="w-full p-3 bg-slate-900 border border-white/10 rounded h-32 outline-none focus:border-blue-500"
                                    placeholder="Describe your testing needs, specific parameters, and compliance goals..."
                                    value={newRFQ.description} onChange={e => setNewRFQ({...newRFQ, description: e.target.value})} required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sample Type</label>
                                    <input 
                                        className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500"
                                        placeholder="e.g., Potable Water"
                                        value={newRFQ.sample_type} onChange={e => setNewRFQ({...newRFQ, sample_type: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Deadline</label>
                                    <input 
                                        type="date"
                                        className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500"
                                        value={newRFQ.deadline} onChange={e => setNewRFQ({...newRFQ, deadline: e.target.value})} required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Required Standards (comma separated)</label>
                                <input 
                                    className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500"
                                    placeholder="ISO 17025, KEBS, WHO Guidelines"
                                    value={newRFQ.required_standards} onChange={e => setNewRFQ({...newRFQ, required_standards: e.target.value})}
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn-primary w-full py-4 mt-8 uppercase font-bold text-xs tracking-widest">
                            🚀 Publish RFQ to Network
                        </button>
                    </form>
                </div>
            )}

            {/* Submit Bid Modal */}
            {showBidModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex-center p-6">
                    <form onSubmit={handleSubmitBid} className="glass-panel w-full max-w-lg p-8 animate-scale-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Submit Technical Proposal</h3>
                            <button onClick={() => setShowBidModal(false)} type="button" className="text-slate-500 hover:text-white">✕</button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Quote Price (KES)</label>
                                    <input 
                                        type="number"
                                        className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500 font-mono"
                                        placeholder="0.00"
                                        value={newBid.price} onChange={e => setNewBid({...newBid, price: e.target.value})} required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Estimated TAT</label>
                                    <input 
                                        className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500"
                                        placeholder="e.g., 3-5 Working Days"
                                        value={newBid.turnaround_time} onChange={e => setNewBid({...newBid, turnaround_time: e.target.value})} required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Proposed Analytical Methodology</label>
                                <textarea 
                                    className="w-full p-3 bg-slate-900 border border-white/10 rounded h-24 outline-none focus:border-blue-500 font-mono text-sm"
                                    placeholder="Specify methods (e.g., ISO 9308-1 for E.coli, ICP-OES for heavy metals)..."
                                    value={newBid.method_proposal} onChange={e => setNewBid({...newBid, method_proposal: e.target.value})} required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Capacity Statement / Proposal Notes</label>
                                <textarea 
                                    className="w-full p-3 bg-slate-900 border border-white/10 rounded h-24 outline-none focus:border-blue-500"
                                    placeholder="Explain why your lab is the best choice for this audit..."
                                    value={newBid.capability_statement} onChange={e => setNewBid({...newBid, capability_statement: e.target.value})} required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn-primary w-full py-4 mt-8 bg-blue-600 hover:bg-blue-500 border-none uppercase font-bold text-xs tracking-widest">
                            📤 Submit Competitive Bid
                        </button>
                    </form>
                </div>
            )}
            {/* Comparison Matrix Modal */}
            {showComparison && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[250] flex-center p-12">
                    <div className="glass-panel w-full max-w-6xl p-10 animate-scale-up border-blue-500/30">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-2xl font-bold">Strategic Bid Comparison</h3>
                                <p className="text-slate-400 text-sm">Side-by-side technical and financial analysis for RFQ #{selectedRFQ.id}</p>
                            </div>
                            <button onClick={() => setShowComparison(false)} className="w-12 h-12 rounded-full bg-white/5 flex-center text-xl hover:bg-white/10 transition-all">✕</button>
                        </div>

                        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="text-left border-b border-white/10">
                                        <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Criterion</th>
                                        {bids.map(bid => (
                                            <th key={bid.id} className="p-4 text-[10px] font-bold text-blue-400 uppercase text-center min-w-[200px]">
                                                {bid.lab_name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    <tr className="border-b border-white/5 bg-white/2">
                                        <td className="p-4 font-bold text-slate-400">Total Quote (KES)</td>
                                        {bids.map(bid => (
                                            <td key={bid.id} className="p-4 text-center font-mono text-lg text-white font-bold">
                                                {bid.price.toLocaleString()}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="p-4 font-bold text-slate-400">Turnaround (TAT)</td>
                                        {bids.map(bid => (
                                            <td key={bid.id} className="p-4 text-center text-green-400 font-bold">
                                                {bid.turnaround_time}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-white/5 bg-white/2">
                                        <td className="p-4 font-bold text-slate-400">Accreditation</td>
                                        {bids.map(bid => (
                                            <td key={bid.id} className="p-4 text-center">
                                                <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-500/20">
                                                    {bid.accreditation_status}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="p-4 font-bold text-slate-400">Methodology</td>
                                        {bids.map(bid => (
                                            <td key={bid.id} className="p-4 text-[10px] text-slate-400 leading-relaxed italic">
                                                {bid.method_proposal || "Not specified"}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="p-4"></td>
                                        {bids.map(bid => (
                                            <td key={bid.id} className="p-4 text-center">
                                                {selectedRFQ.status === 'open' && (
                                                    <button 
                                                        onClick={() => {
                                                            handleAwardBid(bid.id);
                                                            setShowComparison(false);
                                                        }}
                                                        className="btn-primary py-2 px-6 w-full text-[10px]"
                                                    >
                                                        Award Contract
                                                    </button>
                                                )}
                                                {bid.status === 'accepted' && (
                                                    <div className="text-green-500 font-bold text-[10px] uppercase">✓ Contract Awarded</div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
