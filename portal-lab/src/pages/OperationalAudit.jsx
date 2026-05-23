import { useState, useEffect } from "react";
import API from "../services/api";

export default function OperationalAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAudit = async () => {
    try {
      const res = await API.get("/api/lab/audit-ledger");
      setLogs(res.data.data);
    } catch (err) {
      console.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  return (
    <div className="animate-fade-in p-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold">Operational Audit Ledger</h2>
          <p className="text-slate-400 mt-1">
            "Flight Data Recorder" for all laboratory technical and financial events.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadAudit}>
          🔄 Refresh Logs
        </button>
      </div>

      <div className="glass-panel p-0 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
              <th className="p-4">Timestamp</th>
              <th className="p-4">Actor</th>
              <th className="p-4">Action</th>
              <th className="p-4">Scope</th>
              <th className="p-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-500">Retrieving secure logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-500">No audit events recorded yet.</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="p-4 text-xs font-mono text-slate-400">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="p-4">
                  <div className="text-sm font-semibold">{log.actor_email}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Authorized Performer</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-sm text-[10px] font-bold ${
                    log.action.includes('REJECTED') || log.action.includes('FAILED') ? 'bg-red-500/20 text-red-400' :
                    log.action.includes('INVITED') || log.action.includes('CREATED') ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-4 text-xs text-slate-300 uppercase font-mono">
                  {log.entity_type}
                </td>
                <td className="p-4">
                  <div className="max-w-md truncate text-xs text-slate-400 italic">
                    {log.new_value || "—"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
