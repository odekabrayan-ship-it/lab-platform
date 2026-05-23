import { useState, useEffect } from "react";
import API from "../services/api";

export default function TreasurySettings() {
    const [config, setConfig] = useState({
        mpesa_shortcode: "",
        mpesa_passkey: "",
        bank_name: "",
        bank_account_name: "",
        bank_account_number: "",
        bank_swift_code: "",
        flw_public_key: "",
        flw_secret_key: ""
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await API.get("/api/lab/treasury-config");
                if (res.data.data) {
                    setConfig(prev => ({ ...prev, ...res.data.data }));
                }
            } catch (e) {
                console.error("Treasury access restricted or failed.");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await API.put("/api/lab/treasury-config", config);
            alert("✅ Financial Sovereignty configurations updated successfully.");
        } catch (err) {
            alert(err.response?.data?.error || "Treasury update failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 text-center italic text-slate-500">Accessing Secure Vault...</div>;

    return (
        <div className="p-8 animate-fade-in max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-white">🏦 Treasury & Settlement Configuration</h1>
                <p className="text-slate-400">Configure your direct settlement channels. These accounts will receive automated payments from clients and the Super Admin.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                {/* M-PESA SECTION */}
                <div className="glass-panel border-l-4 border-green-500">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex-center text-xl text-green-500">📱</div>
                        <h3 className="text-xl font-bold text-white">M-Pesa Business Configuration</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Shortcode / Paybill</label>
                            <input 
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-green-500 font-mono"
                                placeholder="e.g. 174379"
                                value={config.mpesa_shortcode || ""}
                                onChange={e => setConfig({...config, mpesa_shortcode: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Daraja Passkey (Secure)</label>
                            <input 
                                type="password"
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-green-500 font-mono"
                                placeholder="••••••••••••••••"
                                value={config.mpesa_passkey || ""}
                                onChange={e => setConfig({...config, mpesa_passkey: e.target.value})}
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-4 italic">* This configuration enables real-time automated payment reconciliation via the M-Pesa Daraja API.</p>
                </div>

                {/* BANK SECTION */}
                <div className="glass-panel border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex-center text-xl text-blue-500">🏛️</div>
                        <h3 className="text-xl font-bold text-white">Global Bank Settlement</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Bank Name</label>
                            <input 
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-blue-500"
                                placeholder="e.g. Standard Chartered Bank"
                                value={config.bank_name || ""}
                                onChange={e => setConfig({...config, bank_name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Account Name</label>
                            <input 
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-blue-500"
                                placeholder="e.g. QualiLab Solutions Ltd"
                                value={config.bank_account_name || ""}
                                onChange={e => setConfig({...config, bank_account_name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Account Number</label>
                            <input 
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-blue-500 font-mono"
                                placeholder="0123456789"
                                value={config.bank_account_number || ""}
                                onChange={e => setConfig({...config, bank_account_number: e.target.value})}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">SWIFT / BIC Code</label>
                            <input 
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-blue-500 font-mono"
                                placeholder="SCBLKENXXX"
                                value={config.bank_swift_code || ""}
                                onChange={e => setConfig({...config, bank_swift_code: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                {/* FLUTTERWAVE SECTION */}
                <div className="glass-panel border-l-4 border-orange-500">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-full flex-center text-xl text-orange-500">💳</div>
                        <h3 className="text-xl font-bold text-white">Flutterwave International Configuration</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Public Key</label>
                            <input 
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-orange-500 font-mono"
                                placeholder="FLWPUBK_TEST-..."
                                value={config.flw_public_key || ""}
                                onChange={e => setConfig({...config, flw_public_key: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Secret Key</label>
                            <input 
                                type="password"
                                className="w-full p-4 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-orange-500 font-mono"
                                placeholder="FLWSECK_TEST-..."
                                value={config.flw_secret_key || ""}
                                onChange={e => setConfig({...config, flw_secret_key: e.target.value})}
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-4 italic">* Enables global card payments and international settlement. Leave empty to use platform default.</p>
                </div>

                <div className="flex justify-end pt-4">
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="btn-primary px-12 py-4 text-sm font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                    >
                        {saving ? "⏳ Securing Config..." : "🔒 Authorize & Save Treasury Details"}
                    </button>
                </div>
            </form>
        </div>
    );
}
