import { useState } from "react";
import API from "../services/api";

export default function MpesaPayment({ amount, requestId, onSuccess, onClose }) {
    const [phone, setPhone] = useState("254");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState("input"); // input, processing, success, error
    const [error, setError] = useState("");

    const handlePay = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setStep("processing");

        try {
            const res = await API.post("/api/payments/mpesa", {
                phone: phone.trim(),
                amount: amount,
                request_id: requestId
            });

            if (res.data.data.ResponseCode === "0") {
                // STK Push initiated successfully
                // In a real app, we might poll for status, but for now we wait for callback
                setStep("awaiting-pin");
            } else {
                setStep("error");
                setError("Failed to initiate STK Push. Please try again.");
            }
        } catch (err) {
            setStep("error");
            setError(err.response?.data?.message || "Payment initiation failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex-center z-[100] p-6">
            <div className="glass-panel w-full max-w-md animate-scale-up border-t-4 border-green-500">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex-center text-white font-bold text-xl">M</div>
                        <div>
                            <h3 className="font-bold text-lg">M-Pesa Secure Pay</h3>
                            <p className="text-[10px] text-muted uppercase tracking-widest">Safaricom Daraja API</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
                </div>

                {step === "input" && (
                    <form onSubmit={handlePay} className="space-y-6">
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-white/5">
                            <div className="text-[10px] text-muted uppercase mb-1">Amount to Pay</div>
                            <div className="text-2xl font-bold text-green-400">{amount.toFixed(2)} USD</div>
                            <div className="text-[9px] text-slate-500 mt-1 italic">Currency conversion applied at checkout</div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">M-Pesa Phone Number</label>
                            <input 
                                type="tel" 
                                className="w-full p-4 bg-slate-900 border border-white/10 rounded-lg text-xl font-mono tracking-wider focus:border-green-500 outline-none transition-all"
                                placeholder="2547XXXXXXXX"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                            <p className="text-[9px] text-slate-500 mt-2">Enter number in format: 2547XXXXXXXX</p>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.2)] bg-green-600 hover:bg-green-500 border-none">
                            {loading ? "Initializing..." : "🚀 Pay with M-Pesa"}
                        </button>
                    </form>
                )}

                {step === "processing" && (
                    <div className="text-center py-10 space-y-4">
                        <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mx-auto"></div>
                        <h4 className="font-bold text-lg">Requesting STK Push...</h4>
                        <p className="text-muted text-sm px-10">We are communicating with Safaricom to trigger the payment prompt on your phone.</p>
                    </div>
                )}

                {step === "awaiting-pin" && (
                    <div className="text-center py-10 space-y-6">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex-center mx-auto mb-4">
                            <span className="text-4xl animate-bounce">📱</span>
                        </div>
                        <h4 className="font-bold text-xl text-green-400">Check Your Phone!</h4>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            An M-Pesa prompt has been sent to <strong>{phone}</strong>.<br/>
                            Enter your <strong>M-Pesa PIN</strong> to authorize the payment of <strong>{amount} USD</strong>.
                        </p>
                        <div className="bg-slate-900/80 p-4 rounded border border-white/10 text-xs text-muted italic">
                            Once you enter your PIN, the system will automatically unlock your request workflow.
                        </div>
                        <button onClick={onClose} className="btn-secondary w-full py-3">I've Finished Paying</button>
                    </div>
                )}

                {step === "error" && (
                    <div className="text-center py-10 space-y-4">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex-center mx-auto text-3xl">✕</div>
                        <h4 className="font-bold text-lg text-red-400">Payment Error</h4>
                        <p className="text-muted text-sm">{error}</p>
                        <button onClick={() => setStep("input")} className="btn-primary px-8">Try Again</button>
                    </div>
                )}
            </div>
        </div>
    );
}
