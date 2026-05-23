import React, { useState, useEffect } from 'react';
import WorkspaceFrame from '../components/WorkspaceFrame';
import axios from 'axios';

const QualityLedger = () => {
    const tabs = [
        { id: 'environmental', label: '🌡️ Environmental', icon: '🌡️' },
        { id: 'sterilization', label: '🧼 Sterilization', icon: '🧼' },
        { id: 'equipment', label: '🛠️ Equipment', icon: '🛠️' },
        { id: 'reagents', label: '🧪 Reagents', icon: '🧪' },
        { id: 'sops', label: '📜 SOP Vault', icon: '📜' }
    ];

    const renderContent = (activeTab) => {
        switch (activeTab) {
            case 'environmental': return <EnvironmentalLogs />;
            case 'sterilization': return <SterilizationLogs />;
            case 'equipment': return <EquipmentLedger />;
            case 'reagents': return <ReagentInventory />;
            case 'sops': return <SOPVault />;
            default: return <EnvironmentalLogs />;
        }
    };

    return (
        <WorkspaceFrame 
            title="Sovereign Quality Ledger"
            subtitle="ISO 17025 Compliance & Forensic Record Keeping"
            tabs={tabs}
        >
            {(activeTab) => renderContent(activeTab)}
        </WorkspaceFrame>
    );
};

// --- SUB-COMPONENTS ---

const EnvironmentalLogs = () => {
    const [logs, setLogs] = useState([
        { id: 1, parameter: 'Temperature', value: 22.4, unit: '°C', recorded_at: '2026-04-29 08:00', recorded_by: 'Technician A' },
        { id: 2, parameter: 'Humidity', value: 45.2, unit: '%', recorded_at: '2026-04-29 08:00', recorded_by: 'Technician A' }
    ]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold">Environmental Monitoring</h2>
                    <p className="text-sm text-slate-400">Daily verification of laboratory climate conditions.</p>
                </div>
                <button className="px-6 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all">Log New Reading</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="glass-panel p-8 flex items-center justify-between border-l-4 border-emerald-500">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Live Temperature</div>
                        <div className="text-4xl font-black">22.4°C</div>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-bold">STABLE</div>
                </div>
                <div className="glass-panel p-8 flex items-center justify-between border-l-4 border-blue-500">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Live Humidity</div>
                        <div className="text-4xl font-black">45.2%</div>
                    </div>
                    <div className="text-[10px] text-blue-400 font-bold">IN RANGE</div>
                </div>
            </div>

            <div className="glass-panel p-0 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500">
                        <tr>
                            <th className="p-4">Timestamp</th>
                            <th className="p-4">Parameter</th>
                            <th className="p-4">Value</th>
                            <th className="p-4">Operator</th>
                            <th className="p-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-white/[0.02]">
                                <td className="p-4 font-mono text-xs text-slate-400">{log.recorded_at}</td>
                                <td className="p-4 font-bold">{log.parameter}</td>
                                <td className="p-4">{log.value}{log.unit}</td>
                                <td className="p-4 text-slate-400">{log.recorded_by}</td>
                                <td className="p-4 text-right"><span className="text-[10px] font-bold text-emerald-400">PASS</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SterilizationLogs = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold">Sterilization Vault</h2>
                    <p className="text-sm text-slate-400">Decontamination cycle records and biological indicator verification.</p>
                </div>
                <button className="px-6 py-3 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-500 transition-all">Log Autoclave Run</button>
            </div>

            <div className="glass-panel p-0 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500">
                        <tr>
                            <th className="p-4">Run ID</th>
                            <th className="p-4">Equipment</th>
                            <th className="p-4">Temp/Press</th>
                            <th className="p-4">Duration</th>
                            <th className="p-4">Biological Ind.</th>
                            <th className="p-4 text-right">Verification</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        <tr className="hover:bg-white/[0.02]">
                            <td className="p-4 font-mono text-xs">AC-2026-042</td>
                            <td className="p-4 font-bold">Autoclave-01 (Primus)</td>
                            <td className="p-4">121°C / 15 psi</td>
                            <td className="p-4">20 mins</td>
                            <td className="p-4 text-emerald-400 font-bold">NEGATIVE (PASS)</td>
                            <td className="p-4 text-right"><span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">VERIFIED</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const EquipmentLedger = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold">Equipment Sentinel</h2>
                    <p className="text-sm text-slate-400">Maintenance intervals, calibration curves, and audit readiness.</p>
                </div>
                <button className="px-6 py-3 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-500 transition-all">Register Asset</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { name: 'Analytical Balance', code: 'BAL-02', status: 'CALIBRATED', next: '2026-06-12' },
                    { name: 'Incubator (CO2)', code: 'INC-05', status: 'MAINTENANCE DUE', next: '2026-05-01' },
                    { name: 'Spectrophotometer', code: 'SPEC-01', status: 'CALIBRATED', next: '2026-08-15' }
                ].map((eq, i) => (
                    <div key={i} className="glass-panel p-8 border-t-4 border-slate-700 hover:border-amber-500 transition-all">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{eq.code}</div>
                        <h3 className="text-xl font-bold mb-4">{eq.name}</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Status</span>
                                <span className={`text-[10px] font-black uppercase ${eq.status.includes('DUE') ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>{eq.status}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Next Audit Date</span>
                                <span className="text-xs font-mono font-bold text-white">{eq.next}</span>
                            </div>
                        </div>
                        <button className="w-full mt-6 py-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">View Calibration Log</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ReagentInventory = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold">Reagent Inventory</h2>
                    <p className="text-sm text-slate-400">Lot number tracking, MSDS library, and expiry vigilance.</p>
                </div>
            </div>

            <div className="glass-panel p-0 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-slate-500">
                        <tr>
                            <th className="p-4">Chemical/Reagent</th>
                            <th className="p-4">Lot Number</th>
                            <th className="p-4">Opened At</th>
                            <th className="p-4">Expiry Date</th>
                            <th className="p-4 text-right">Vigilance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        <tr className="hover:bg-white/[0.02]">
                            <td className="p-4 font-bold">Ethanol 99% (Analytical Grade)</td>
                            <td className="p-4 font-mono text-xs">LOT-X-9902</td>
                            <td className="p-4 text-slate-400">2026-03-15</td>
                            <td className="p-4 text-slate-400">2027-03-15</td>
                            <td className="p-4 text-right"><span className="text-[10px] font-bold text-emerald-400">ACTIVE</span></td>
                        </tr>
                        <tr className="hover:bg-white/[0.02] bg-red-500/5">
                            <td className="p-4 font-bold">Culture Media (Agar Base)</td>
                            <td className="p-4 font-mono text-xs">LOT-M-8812</td>
                            <td className="p-4 text-slate-400">2026-01-10</td>
                            <td className="p-4 text-red-400 font-bold">2026-04-20</td>
                            <td className="p-4 text-right"><span className="text-[10px] font-bold text-red-500 uppercase">EXPIRED - DO NOT USE</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SOPVault = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold">SOP Vault</h2>
                    <p className="text-sm text-slate-400">Version-controlled standard operating procedures and technical manuals.</p>
                </div>
                <button className="px-6 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all">Upload New Version</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { title: 'Standard Sample Receiving Protocol', code: 'SOP-GEN-01', ver: 'v2.4', review: '2026-12-01' },
                    { title: 'Calibration of Analytical Balances', code: 'SOP-MET-05', ver: 'v1.1', review: '2026-10-15' },
                    { title: 'Sterilization Cycle Validation', code: 'SOP-BIO-12', ver: 'v3.0', review: '2027-01-20' }
                ].map((sop, i) => (
                    <div key={i} className="glass-panel p-8 flex justify-between items-center group">
                        <div className="flex gap-6 items-center">
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-blue-500/20 transition-all">📄</div>
                            <div>
                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{sop.code} • {sop.ver}</div>
                                <h3 className="text-lg font-bold">{sop.title}</h3>
                                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Next Review: {sop.review}</p>
                            </div>
                        </div>
                        <button className="px-4 py-2 text-blue-500 text-xs font-bold hover:underline">Download PDF</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QualityLedger;
