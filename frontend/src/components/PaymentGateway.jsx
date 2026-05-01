import { useState } from "react";
import API from "../services/api";

export default function PaymentGateway({ amount, requestId, paymentType, metadata, onSuccess, onClose }) {
    const [method, setMethod] = useState(null); // 'mpesa', 'flutterwave', 'bank'
    const [phone, setPhone] = useState("254");
    const [bankDetails, setBankDetails] = useState(null);
    const [proofRef, setProofRef] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState("select"); // select, mpesa-input, mpesa-processing, mpesa-awaiting, bank-info, success, error
    const [error, setError] = useState("");

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const handleMpesa = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStep("mpesa-processing");
        try {
            const res = await API.post("/api/payments/mpesa", { 
                phone: phone.trim(), 
                amount, 
                request_id: requestId,
                payment_type: paymentType || 'TEST_REQUEST',
                metadata: metadata || {}
            });
            if (res.data.data.ResponseCode === "0") setStep("mpesa-awaiting");
            else throw new Error("Failed to initiate STK Push");
        } catch (err) {
            setStep("error");
            setError(err.response?.data?.message || "M-Pesa initiation failed.");
        } finally { setLoading(false); }
    };

    const handleFlutterwave = async () => {
        setLoading(true);
        try {
            const res = await API.post("/api/payments/flutterwave", {
                amount,
                request_id: requestId,
                email: user.email,
                full_name: user.full_name,
                payment_type: paymentType || 'TEST_REQUEST',
                metadata: metadata || {}
            });
            if (res.data.data.link) {
                window.location.href = res.data.data.link; // Redirect to Flutterwave
            }
        } catch (err) {
            setStep("error");
            setError("Flutterwave checkout failed to initialize.");
        } finally { setLoading(false); }
    };

    const loadBankDetails = async () => {
        setLoading(true);
        try {
            const res = await API.get(`/api/payments/bank-details/${requestId}`);
            setBankDetails(res.data.data);
            setStep("bank-info");
        } catch (err) {
            setStep("error");
            setError(err.response?.data?.message || "Laboratory bank details not available.");
        } finally { setLoading(false); }
    };

    const handleSubmitBankProof = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await API.post("/api/payments/bank-transfer/submit-proof", {
                request_id: requestId,
                amount: amount,
                proof_reference: proofRef
            });
            setStep("success");
        } catch (err) {
            setStep("error");
            setError("Failed to submit payment proof.");
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex-center z-[100] p-6">
            <div className="glass-panel w-full max-w-md animate-scale-up border-t-4 border-blue-500">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-lg">Secure Payment Gateway</h3>
                        <p className="text-[10px] text-muted uppercase tracking-widest">Multi-Channel Settlement</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg border border-white/5 mb-6">
                    <div className="text-[10px] text-muted uppercase mb-1">Total Settlement</div>
                    <div className="text-2xl font-bold text-blue-400">{amount.toFixed(2)} USD</div>
                </div>

                {step === "select" && (
                    <div className="space-y-4">
                        <button 
                            onClick={() => setStep("mpesa-input")}
                            className="w-full flex items-center justify-between p-4 glass-panel border-white/5 hover:border-green-500/50 hover:bg-green-500/5 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-green-500 rounded-lg flex-center text-white font-bold">M</div>
                                <div className="text-left">
                                    <div className="font-bold">M-Pesa STK Push</div>
                                    <div className="text-[10px] text-muted">Kenya · Mobile Money</div>
                                </div>
                            </div>
                            <span className="text-slate-500 group-hover:text-green-500">→</span>
                        </button>

                        <button 
                            onClick={handleFlutterwave}
                            disabled={loading}
                            className="w-full flex items-center justify-between p-4 glass-panel border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-600 rounded-lg flex-center text-white text-xl">💳</div>
                                <div className="text-left">
                                    <div className="font-bold">Card / Bank Transfer</div>
                                    <div className="text-[10px] text-muted uppercase">Visa · Mastercard · International</div>
                                </div>
                            </div>
                            <span className="text-slate-500 group-hover:text-blue-500">{loading ? "..." : "→"}</span>
                        </button>

                        <button 
                            onClick={loadBankDetails}
                            className="w-full flex items-center justify-between p-4 glass-panel border-white/5 hover:border-slate-500/50 hover:bg-slate-500/5 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-700 rounded-lg flex-center text-white text-xl">🏛️</div>
                                <div className="text-left">
                                    <div className="font-bold">Direct Bank Transfer</div>
                                    <div className="text-[10px] text-muted uppercase">Manual Verification · B2B / Large Clients</div>
                                </div>
                            </div>
                            <span className="text-slate-500 group-hover:text-white">→</span>
                        </button>

                        <div className="pt-4 border-t border-white/5 flex justify-center gap-4 opacity-40 grayscale hover:grayscale-0 transition-all">
                            <span className="text-[10px] font-bold">VISA</span>
                            <span className="text-[10px] font-bold">MASTERCARD</span>
                            <span className="text-[10px] font-bold">AMEX</span>
                            <span className="text-[10px] font-bold">MPESA</span>
                        </div>
                    </div>
                )}

                {step === "mpesa-input" && (
                    <form onSubmit={handleMpesa} className="space-y-6">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Phone Number</label>
                            <input 
                                type="tel" className="w-full p-4 bg-slate-900 border border-white/10 rounded-lg text-xl font-mono tracking-wider outline-none focus:border-green-500"
                                placeholder="2547XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required
                            />
                        </div>
                        <button type="submit" className="btn-primary w-full py-4 bg-green-600 hover:bg-green-500 border-none uppercase font-bold text-xs tracking-widest">
                            🚀 Initiate STK Push
                        </button>
                    </form>
                )}

                {step === "mpesa-awaiting" && (
                    <div className="text-center py-10 space-y-6">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex-center mx-auto animate-bounce text-4xl">📱</div>
                        <h4 className="font-bold text-xl text-green-400">Check Your Phone!</h4>
                        <p className="text-slate-300 text-sm">Enter your PIN on <strong>{phone}</strong> to authorize.</p>
                        <button onClick={onClose} className="btn-secondary w-full py-3">I've Finished Paying</button>
                    </div>
                )}

                {step === "bank-info" && bankDetails && (
                    <div className="space-y-6">
                        <div className="bg-slate-900/50 p-6 rounded-lg border border-white/10 space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Laboratory Bank Instructions</h4>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <div className="text-slate-500 mb-1">Bank Name</div>
                                    <div className="font-bold">{bankDetails.bank_name}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 mb-1">SWIFT / BIC</div>
                                    <div className="font-bold font-mono">{bankDetails.bank_swift_code}</div>
                                </div>
                                <div className="col-span-2">
                                    <div className="text-slate-500 mb-1">Account Name</div>
                                    <div className="font-bold">{bankDetails.bank_account_name}</div>
                                </div>
                                <div className="col-span-2">
                                    <div className="text-slate-500 mb-1">Account Number</div>
                                    <div className="font-bold font-mono text-lg tracking-wider">{bankDetails.bank_account_number}</div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitBankProof} className="space-y-4">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Transfer Reference / Proof Ref</label>
                            <input 
                                className="w-full p-3 bg-slate-900 border border-white/10 rounded outline-none focus:border-blue-500" 
                                placeholder="Enter Transaction ID or Reference"
                                value={proofRef}
                                onChange={e => setProofRef(e.target.value)}
                                required
                            />
                            <p className="text-[9px] text-muted italic">After making the transfer, enter the reference number here. The laboratory will verify the funds within 24-48 hours.</p>
                            <button type="submit" className="btn-primary w-full py-3">Confirm Transfer Initiated</button>
                        </form>
                    </div>
                )}

                {step === "success" && (
                    <div className="flex-1 overflow-y-auto p-8 flex flex-col justify-center items-center text-center">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex-center text-green-500 text-4xl mb-6 border border-green-500/20 animate-scale-up">✓</div>
            <h2 className="text-2xl font-bold mb-2">Settlement Complete</h2>
            <p className="text-slate-400 mb-8">The transaction has been forensically verified. Your account/request has been activated.</p>
            
            <div className="flex gap-3 w-full max-w-xs">
                <button 
                    onClick={() => {
                        window.open(`http://localhost:3000/api/payments/${paymentId}/receipt?token=${localStorage.getItem('token')}`, '_blank');
                    }}
                    className="btn-secondary flex-1"
                >
                    View Receipt
                </button>
                <button onClick={onSuccess} className="btn-primary flex-1">Continue</button>
            </div>
          </div>
                )}

                {step === "error" && (
                    <div className="text-center py-10 space-y-4">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex-center mx-auto text-3xl">✕</div>
                        <h4 className="font-bold text-lg text-red-400">Transaction Failed</h4>
                        <p className="text-muted text-sm">{error}</p>
                        <button onClick={() => setStep("select")} className="btn-primary px-8">Try Another Method</button>
                    </div>
                )}
            </div>
        </div>
    );
}
