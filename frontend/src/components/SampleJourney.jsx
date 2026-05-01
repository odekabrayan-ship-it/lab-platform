import { useState, useEffect } from "react";
import API from "../services/api";

const STAGES = [
    { key: 'REGISTERED', label: 'Registered', icon: '📝', desc: 'Sample entry created' },
    { key: 'IN_CUSTODY', label: 'In Custody', icon: '📥', desc: 'Arrived at Laboratory' },
    { key: 'PREP', label: 'Prep', icon: '🧪', desc: 'Homogenization/Extraction' },
    { key: 'ANALYZING', label: 'Analyzing', icon: '🔬', desc: 'Instrumental Data Capture' },
    { key: 'REVIEW', label: 'Review', icon: '⚖️', desc: 'Technical Data Validation' },
    { key: 'CERTIFIED', label: 'Certified', icon: '📜', desc: 'Final Report Issued' }
];

export default function SampleJourney({ sampleId }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJourney = async () => {
            try {
                const res = await API.get(`/api/samples/${sampleId}/journey`);
                setHistory(res.data.data);
            } catch (err) {
                console.error("Failed to load journey");
            } finally {
                setLoading(false);
            }
        };
        fetchJourney();
    }, [sampleId]);

    if (loading) return <div className="p-4 text-center text-muted italic">Syncing Analytical Journey...</div>;

    const currentStatus = history.length > 0 ? history[history.length - 1].status : 'REGISTERED';
    const currentIndex = STAGES.findIndex(s => s.key === currentStatus);

    return (
        <div className="glass-panel p-8 animate-fade-in">
            <h3 className="text-sm font-bold uppercase mb-10 text-slate-500 tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Analytical Sample Journey
            </h3>

            <div className="relative flex justify-between">
                {/* Connecting Line */}
                <div className="absolute top-5 left-0 w-full h-1 bg-slate-800 -z-0">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.6)]" 
                        style={{ width: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
                    ></div>
                </div>

                {STAGES.map((stage, idx) => {
                    const isCompleted = idx < currentIndex;
                    const isCurrent = idx === currentIndex;
                    const isPending = idx > currentIndex;
                    const log = history.find(h => h.status === stage.key);

                    return (
                        <div key={stage.key} className="relative z-10 flex flex-col items-center w-1/6">
                            {/* Node */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                                isCompleted ? 'bg-blue-500 border-blue-400 text-white shadow-lg' : 
                                isCurrent ? 'bg-slate-900 border-blue-500 text-blue-400 scale-125 shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 
                                'bg-slate-900 border-slate-700 text-slate-600'
                            }`}>
                                {isCompleted ? '✓' : stage.icon}
                            </div>

                            {/* Label */}
                            <div className="mt-4 text-center">
                                <p className={`text-[10px] font-bold uppercase tracking-tighter ${isCurrent ? 'text-blue-400' : isCompleted ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {stage.label}
                                </p>
                                {log ? (
                                    <p className="text-[8px] text-muted font-mono mt-1">
                                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                ) : (
                                    <p className="text-[8px] text-slate-700 uppercase mt-1">Pending</p>
                                )}
                            </div>

                            {/* Tooltip-like Info */}
                            {isCurrent && (
                                <div className="absolute -top-12 bg-blue-500 text-white text-[9px] font-bold py-1 px-3 rounded whitespace-nowrap animate-bounce">
                                    Current Phase: {stage.desc}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* History Feed */}
            <div className="mt-12 pt-8 border-t border-white/5">
                <h4 className="text-[10px] font-bold uppercase text-slate-600 mb-4">Milestone Log</h4>
                <div className="space-y-3">
                    {[...history].reverse().map(log => (
                        <div key={log.id} className="flex justify-between items-center text-[10px] p-2 hover:bg-white/5 rounded transition-all">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-blue-400">[{log.status}]</span>
                                <span className="text-slate-400">{log.notes}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                                <span className="block text-[8px] text-muted">{log.actor_email}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
