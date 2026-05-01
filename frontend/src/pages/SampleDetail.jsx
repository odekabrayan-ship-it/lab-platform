import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import SampleJourney from "../components/SampleJourney";
import ClarificationThread from "../components/ClarificationThread";

export default function SampleDetail() {
  const { id } = useParams(); // Test Request ID
  const navigate = useNavigate();
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSampleId, setActiveSampleId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [rightTab, setRightTab] = useState("JOURNEY"); // JOURNEY or CHAT
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchSamples = async () => {
    try {
      const res = await API.get(`/api/samples/request/${id}`);
      setSamples(res.data.data);
      if (res.data.data.length > 0) {
        setActiveSampleId(res.data.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch samples", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (sampleId) => {
    try {
      const res = await API.get(`/api/samples/${sampleId}/logs`);
      setLogs(res.data.data);
    } catch (err) {
      console.error("Failed to fetch custody logs", err);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [id]);

  useEffect(() => {
    if (activeSampleId) {
      fetchLogs(activeSampleId);
    }
  }, [activeSampleId]);

  const handleBulkForward = async () => {
    const ids = samples.filter(s => s.status === 'REGISTERED').map(s => s.id);
    if (ids.length === 0) return alert("No new samples in 'REGISTERED' state found.");
    
    const notes = prompt(`Forwarding ${ids.length} samples to the Lab Section. Enter notes:`, "Batch forwarded from Accessioning Desk.");
    if (notes === null) return;

    try {
      setLoading(true);
      await API.patch('/api/samples/bulk-status', { sampleIds: ids, status: 'IN_CUSTODY', notes });
      fetchSamples();
    } catch (err) {
      alert("Bulk forwarding failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (sampleId, status) => {
    let promptMsg = `Enter a technical note for transitioning to ${status}:`;
    let defaultNote = `Proceeding to ${status} stage.`;

    if (status === 'PREP') {
        promptMsg = "Enter PRE-TREATMENT / PREP METHOD ID (ISO 17025 requirement):";
        defaultNote = "Standard Extraction Protocol v1.2";
    } else if (status === 'ANALYZING') {
        promptMsg = "Confirm Analytical Run / Equipment Calibration Status:";
        defaultNote = "Equipment pre-checks complete. Commencing analytical run.";
    }

    const notes = prompt(promptMsg, defaultNote);
    if (notes === null) return; // Cancelled
    
    try {
      await API.patch(`/api/samples/${sampleId}/status`, { status, notes });
      fetchSamples(); // Refresh
    } catch (err) {
      alert("Status update failed");
    }
  };

  const handleAddLog = async (sampleId) => {
    const action = prompt("Action (transferred, tested, stored, disposed):");
    if (!action) return;
    const notes = prompt("Notes/Details:");
    try {
      await API.post(`/api/samples/${sampleId}/log`, { action, notes });
      if (activeSampleId === sampleId) fetchLogs(sampleId);
    } catch (err) {
      alert("Failed to add log");
    }
  };

  const handleHandover = async (sampleId, action) => {
    const notes = prompt(`Enter handover notes (e.g., Received from Accessioning Fridge B):`, `Physical handover of sample.`);
    if (notes === null) return;
    try {
      await API.post(`/api/samples/${sampleId}/custody`, { action, notes });
      fetchSamples();
    } catch (err) { alert("Handover failed"); }
  };

  const activeSample = samples.find(s => s.id === activeSampleId);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
      {/* Left Column: Sample List */}
      <div className="flex-1">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-gradient">Samples</h2>
            <p className="text-muted">Request #{id}</p>
          </div>
          {user.role === 'lab' && (
            <div className="flex gap-2">
              <button 
                onClick={handleBulkForward}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase rounded border border-white/10 shadow-lg transition-all"
              >
                📦 Forward Batch to Lab
              </button>
              <Link to={`/samples?requestId=${id}`} className="btn-primary px-4 py-2 rounded-md font-semibold text-sm">
                + Register Sample
              </Link>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {loading ? <p>Loading samples...</p> : samples.length === 0 ? (
            <div className="glass-panel text-center py-8 text-muted">No samples registered yet.</div>
          ) : (
            samples.map(sample => (
              <div 
                key={sample.id} 
                onClick={() => setActiveSampleId(sample.id)}
                className={`glass-panel p-4 cursor-pointer transition-all duration-200 border-l-4 ${activeSampleId === sample.id ? 'border-primary bg-white/10' : 'border-transparent hover:bg-white/5'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{sample.sample_code}</h4>
                    <p className="text-sm text-muted line-clamp-1">{sample.description}</p>
                    <div className="text-[9px] mt-1 text-blue-400 font-bold uppercase tracking-wider">
                        Custody: {sample.custody_status?.replace('_', ' ') || 'UNTRACKED'}
                    </div>
                  </div>
                  <span className={`status-badge status-${sample.status}`}>{sample.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Custody Log */}
      <div className="flex-1 md:flex-[1.5]">
        {activeSample ? (
          <div className="glass-panel sticky top-24">
            <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-4">
              <div>
                <h3 className="font-bold text-lg mb-1">{activeSample.sample_code}</h3>
                <div className="flex flex-col gap-1 text-[11px] text-muted mb-3">
                    <p><span className="font-bold text-slate-400">Condition:</span> {activeSample.condition_notes}</p>
                    <p><span className="font-bold text-slate-400">Hazard:</span> <span className={activeSample.hazard_flags ? 'text-red-400 font-bold' : ''}>{activeSample.hazard_flags || 'None (Safe)'}</span></p>
                    <p><span className="font-bold text-slate-400">Source:</span> {activeSample.source_company} ({activeSample.source_contact})</p>
                    <p><span className="font-bold text-slate-400">Sampling:</span> {activeSample.sampling_date} at {activeSample.sampling_location}</p>
                    <p><span className="font-bold text-blue-400">Current Custodian:</span> {activeSample.current_custodian_id ? `Internal User #${activeSample.current_custodian_id}` : 'Laboratory Storage'}</p>
                </div>
                
                <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-lg mb-4">
                    <h4 className="text-[10px] font-bold uppercase text-blue-400 tracking-wider mb-2">Technical Specifications</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[9px] text-slate-500 uppercase">Tests Requested</p>
                            <p className="text-xs font-semibold text-slate-200">{activeSample.tests_requested || 'Refer to Work Order'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 uppercase">Reference Method / Spec</p>
                            <p className="text-xs font-semibold text-slate-200">{activeSample.test_specs || 'Internal Protocol'}</p>
                        </div>
                    </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                    <div className="flex flex-col gap-3 w-full bg-slate-900/50 p-4 rounded-xl border border-blue-500/20">
                        <h4 className="text-[10px] font-bold uppercase text-blue-400 tracking-widest mb-1">Laboratory Command Console</h4>
                        <div className="flex gap-2 flex-wrap">
                            {/* Custody Action */}
                            {user.sub_role === 'TECHNICIAN' && activeSample.custody_status !== 'IN_TESTING' && (
                                <button className="btn-sm bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded shadow-lg transition-all animate-pulse" onClick={() => handleHandover(activeSample.id, 'accept')}>🤝 Accept Custody (Physical Sign-off)</button>
                            )}
                            {user.sub_role === 'TECHNICIAN' && activeSample.custody_status === 'IN_TESTING' && (
                                <button className="btn-sm bg-slate-600 text-white font-bold px-4 py-2 rounded" onClick={() => handleHandover(activeSample.id, 'return')}>📤 Return to Storage</button>
                            )}

                            {activeSample.status === 'REGISTERED' && (
                            <button className="btn-sm bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded shadow-lg transition-all" onClick={() => handleStatusChange(activeSample.id, 'IN_CUSTODY')}>📥 Mark Received</button>
                            )}
                            {activeSample.status === 'IN_CUSTODY' && (
                            <button className="btn-sm bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded shadow-lg transition-all" onClick={() => handleStatusChange(activeSample.id, 'PREP')}>🧪 Start Prep</button>
                            )}
                            {activeSample.status === 'PREP' && (
                            <button className="btn-sm bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded shadow-lg transition-all" onClick={() => handleStatusChange(activeSample.id, 'ANALYZING')}>🔬 Start Analysis</button>
                            )}
                            {activeSample.status === 'ANALYZING' && (
                            <>
                                {(user.sub_role === 'TECHNICIAN' || user.role === 'admin') ? (
                                    <Link to={`/results?sampleId=${activeSample.id}&code=${activeSample.sample_code}&requestId=${id}`} className="btn-sm bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded shadow-lg transition-all no-underline">
                                    📊 Enter Results
                                    </Link>
                                ) : (
                                    <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded text-[9px] text-amber-400 font-bold max-w-[150px]">
                                        ⚠️ Result Entry restricted to Authorized Technicians
                                    </div>
                                )}
                                <button className="btn-sm bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded shadow-lg transition-all" onClick={() => handleStatusChange(activeSample.id, 'REVIEW')}>⚖️ Submit for Review</button>
                            </>
                            )}
                            {activeSample.status === 'REVIEW' && (
                                <>
                                    {(user.sub_role === 'LAB_MANAGER' || user.role === 'admin') ? (
                                        <>
                                            {activeSample.received_by === user.id ? (
                                                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded text-xs text-red-400 font-bold max-w-[200px]">
                                                    ⚠️ Impartiality Conflict: As the registrar of this sample, you cannot perform the final certification.
                                                </div>
                                            ) : (
                                                <button className="btn-sm bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded shadow-lg transition-all" onClick={() => handleStatusChange(activeSample.id, 'CERTIFIED')}>📜 Certify & Close (Release CoA)</button>
                                            )}
                                        </>
                                    ) : (
                                        <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded text-[9px] text-amber-400 font-bold max-w-[150px]">
                                            ⚠️ Certification restricted to Quality Managers
                                        </div>
                                    )}
                                </>
                            )}
                            {activeSample.status === 'CERTIFIED' && (
                            <Link to={`/results?sampleId=${activeSample.id}&code=${activeSample.sample_code}`} className="btn-sm bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded shadow-lg transition-all no-underline">
                                📊 View Results
                            </Link>
                            )}
                            {activeSample.status !== 'DISPOSED' && (
                            <button className="btn-sm bg-red-900/50 hover:bg-red-800 text-red-200 text-[10px] px-3 py-1 rounded border border-red-500/30" onClick={() => handleStatusChange(activeSample.id, 'DISPOSED')}>Dispose Sample</button>
                            )}
                            <button className="btn-sm border border-white/10 text-slate-400 text-[10px] px-3 py-1 rounded" onClick={() => handleAddLog(activeSample.id)}>+ Manual Log</button>
                        </div>
                    </div>
                {user.role === 'client' && (activeSample.status === 'ANALYZING' || activeSample.status === 'REVIEW' || activeSample.status === 'CERTIFIED') && (
                  <Link to={`/results?sampleId=${activeSample.id}&code=${activeSample.sample_code}&requestId=${id}`} className="btn-sm btn-secondary font-semibold no-underline">
                    📊 View Results
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-6">
                <div className="flex gap-4 border-b border-white/10 mb-4">
                    <button 
                        className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all ${rightTab === 'JOURNEY' ? 'border-b-2 border-primary text-white' : 'text-slate-500'}`}
                        onClick={() => setRightTab('JOURNEY')}
                    >
                        🛣️ Technical Journey
                    </button>
                    <button 
                        className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all ${rightTab === 'CHAT' ? 'border-b-2 border-primary text-white' : 'text-slate-500'}`}
                        onClick={() => setRightTab('CHAT')}
                    >
                        💬 Order Clarifications
                    </button>
                </div>

                {rightTab === 'JOURNEY' ? (
                    <SampleJourney key={activeSample.id} sampleId={activeSample.id} />
                ) : (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <ClarificationThread requestId={id} />
                    </div>
                )}
            </div>
          </div>
        ) : (
          <div className="glass-panel text-center py-20 text-muted border-dashed h-full flex flex-col items-center justify-center">
            <span className="text-4xl mb-4 opacity-50">🔬</span>
            <p>Select a sample to view its chain of custody.</p>
          </div>
        )}
      </div>
    </div>
  );
}
