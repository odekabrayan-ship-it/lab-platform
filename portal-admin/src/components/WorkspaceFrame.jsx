import { useState } from "react";

export default function WorkspaceFrame({ title, icon, tabs, children }) {
    const [activeTab, setActiveTab] = useState(tabs[0].key);

    return (
        <div className="animate-fade-in">
            {/* ── Workspace Header ── */}
            <div className="bg-slate-900/50 border-b border-white/5 p-6 mb-1">
                <div className="flex items-center gap-4 mb-6">
                    <span className="text-3xl drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">{icon}</span>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter m-0">{title}</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Operational Workspace · ISO-17025 Verified</p>
                    </div>
                </div>

                {/* ── Operational Tab Bar ── */}
                <div className="flex gap-1 bg-black/20 p-1 rounded-xl w-fit border border-white/5">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.key 
                                ? 'bg-blue-600 text-white shadow-lg' 
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Active Operation Rendering ── */}
            <div className="p-2">
                {tabs.find(t => t.key === activeTab)?.component}
            </div>
        </div>
    );
}
