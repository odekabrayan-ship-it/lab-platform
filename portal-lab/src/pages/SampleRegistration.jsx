import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../services/api";

export default function SampleRegistration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestId = searchParams.get("requestId");

  const [samples, setSamples] = useState([{ 
      description: "", condition_notes: "", storage_location: "", hazard_flags: "",
      tests_requested: "", test_specs: "", client_notes: "",
      // P2-4: ISO 17025 §7.4.3 receipt condition fields
      receipt_temperature: "", transport_condition: "AMBIENT", integrity_status: "OK",
      integrity_notes: "", required_temp_min: "", required_temp_max: ""
  }]);
  const [storage, setStorage] = useState([]);
  const [requestDetails, setRequestDetails] = useState(null);
  const [batchInfo, setBatchInfo] = useState({
      source_company: "",
      source_contact: "",
      sampling_date: new Date().toISOString().split('T')[0],
      sampling_location: ""
  });
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [showQuickStorage, setShowQuickStorage] = useState(false);
  const [newStorage, setNewStorage] = useState({ name: "", description: "", capacity: 100 });

  useEffect(() => {
    const initPage = async () => {
      try {
        const [storageRes, requestRes] = await Promise.all([
          API.get("/api/lab/storage"),
          API.get(`/api/requests`)
        ]);
        
        setStorage(storageRes.data.data);
        const req = requestRes.data.data.find(r => r.id === parseInt(requestId));
        if (req) {
          setRequestDetails(req);
          setBatchInfo({
            source_company: req.company_name || "",
            source_contact: req.contact_person || "",
            sampling_date: new Date().toISOString().split('T')[0],
            sampling_location: req.city || ""
          });
        }
      } catch (err) { 
          console.error("Initialization failed", err);
          // Don't alert here to avoid spamming 403s on load
      }
      finally { setInitLoading(false); }
    };
    initPage();
  }, [requestId]);

  const syncData = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/lab/storage");
      setStorage(res.data.data);
    } catch (err) {
      console.error("Sync failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuickStorage = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await API.post("/api/lab/storage", newStorage);
      setNewStorage({ name: "", description: "", capacity: 100 });
      setShowQuickStorage(false);
      await syncData();
    } catch (err) {
      alert("Failed to add storage location. Ensure unique name.");
    } finally {
      setLoading(false);
    }
  };

  const addSampleRow = () => {
    setSamples([...samples, { 
        description: "", condition_notes: "", storage_location: "", hazard_flags: "",
        tests_requested: requestDetails?.test_description || "", test_specs: "", client_notes: "",
        receipt_temperature: "", transport_condition: "AMBIENT", integrity_status: "OK",
        integrity_notes: "", required_temp_min: "", required_temp_max: ""
    }]);
  };

  const updateSample = (idx, field, val) => {
    const newSamples = [...samples];
    newSamples[idx][field] = val;
    setSamples(newSamples);
  };

  const fillDown = (field) => {
      const firstVal = samples[0][field];
      if (!firstVal) return alert(`Fill the first row's ${field} first.`);
      setSamples(samples.map(s => ({...s, [field]: firstVal})));
  };

  const handleBulkCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split("\n").filter(l => l.trim() !== "");
      const imported = lines.slice(1).map(line => {
        const parts = line.split(",").map(s => s.trim());
        return { description: parts[0] || "", condition_notes: parts[1] || "", storage_location: parts[2] || "", hazard_flags: parts[3] || "" };
      });
      setSamples([...samples.filter(s => s.description !== ""), ...imported]);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      for (const s of samples) {
        if (!s.description) continue;
        const result = await API.post("/api/samples", { 
            test_request_id: requestId, 
            ...batchInfo,
            ...s 
        });
        // P2-4: After registering, record receipt condition check (ISO 17025 §7.4.3)
        if (result.data?.data?.id && (s.receipt_temperature || s.integrity_status !== 'OK')) {
          await API.patch(`/api/samples/${result.data.data.id}/receipt-check`, {
            receipt_temperature: s.receipt_temperature || null,
            transport_condition: s.transport_condition,
            integrity_status: s.integrity_status,
            integrity_notes: s.integrity_notes,
            required_temp_min: s.required_temp_min || undefined,
            required_temp_max: s.required_temp_max || undefined
          });
        }
      }
      alert("All samples registered with receipt conditions documented.");
      navigate("/dashboard");
    } catch (err) { alert("Registration failed"); }
    finally { setLoading(false); }
  };

  if (initLoading) return <div className="p-10 text-center text-muted">Initialising Accessioning Engine...</div>;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-gradient">Professional Accessioning & Receipt</h2>
          <p className="text-muted">High-trust registration for Work Order #{requestId}. Log all technical specifications.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase mr-2">Bulk Tools:</span>
            <button type="button" className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold uppercase rounded border border-white/10 flex items-center gap-1 transition-all" onClick={() => fillDown('condition_notes')}>⬇️ Condition</button>
            <button type="button" className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold uppercase rounded border border-white/10 flex items-center gap-1 transition-all" onClick={() => fillDown('tests_requested')}>⬇️ Tests</button>
            <button type="button" className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold uppercase rounded border border-white/10 flex items-center gap-1 transition-all" onClick={() => fillDown('test_specs')}>⬇️ Specs</button>
            <button type="button" className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold uppercase rounded border border-white/10 flex items-center gap-1 transition-all" onClick={() => fillDown('storage_location')}>⬇️ Storage</button>
            <button type="button" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase rounded shadow-lg flex items-center gap-1 transition-all" onClick={syncData}>🔄 Sync Repository</button>
            <button type="button" className="px-3 py-1.5 bg-slate-100 hover:bg-white text-slate-900 text-[10px] font-bold uppercase rounded shadow flex items-center gap-1 transition-all" onClick={() => setShowQuickStorage(true)}>➕ New Location</button>
            <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase rounded shadow-lg cursor-pointer flex items-center gap-1 transition-all">
                📥 CSV Import
                <input type="file" accept=".csv" className="hidden" onChange={handleBulkCSV} />
            </label>
        </div>
      </div>

      <div className="glass-panel mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Source Company</label>
              <input 
                className="w-full p-2 bg-slate-900 border border-white/10 rounded text-sm" 
                value={batchInfo.source_company} 
                onChange={e => setBatchInfo({...batchInfo, source_company: e.target.value})} 
              />
          </div>
          <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Primary Contact</label>
              <input 
                className="w-full p-2 bg-slate-900 border border-white/10 rounded text-sm" 
                value={batchInfo.source_contact} 
                onChange={e => setBatchInfo({...batchInfo, source_contact: e.target.value})} 
              />
          </div>
          <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sampling Date</label>
              <input 
                type="date"
                className="w-full p-2 bg-slate-900 border border-white/10 rounded text-sm" 
                value={batchInfo.sampling_date} 
                onChange={e => setBatchInfo({...batchInfo, sampling_date: e.target.value})} 
              />
          </div>
          <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sampling Location</label>
              <input 
                className="w-full p-2 bg-slate-900 border border-white/10 rounded text-sm" 
                value={batchInfo.sampling_location} 
                onChange={e => setBatchInfo({...batchInfo, sampling_location: e.target.value})} 
              />
          </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="glass-panel p-0 overflow-hidden">
          <table className="data-table text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="w-10">#</th>
                <th>Sample Description *</th>
                <th>Tests Requested</th>
                <th>Specifications</th>
                <th>Condition *</th>
                <th>Storage</th>
                <th>Hazards</th>
                <th title="ISO 17025 §7.4.3">Receipt Temp / Integrity</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {samples.map((s, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td><input required className="w-full p-2 border-none bg-transparent" placeholder="e.g. Surface Water" value={s.description} onChange={e => updateSample(idx, 'description', e.target.value)} /></td>
                  <td><input className="w-full p-2 border-none bg-transparent" placeholder="e.g. pH, TDS, Heavy Metals" value={s.tests_requested} onChange={e => updateSample(idx, 'tests_requested', e.target.value)} /></td>
                  <td><input className="w-full p-2 border-none bg-transparent" placeholder="e.g. ISO 10523" value={s.test_specs} onChange={e => updateSample(idx, 'test_specs', e.target.value)} /></td>
                  <td><input required className="w-full p-2 border-none bg-transparent" placeholder="Sealed" value={s.condition_notes} onChange={e => updateSample(idx, 'condition_notes', e.target.value)} /></td>
                  <td>
                    <select required className="w-full p-1 text-[10px] border rounded" value={s.storage_location} onChange={e => updateSample(idx, 'storage_location', e.target.value)}>
                        <option value="">Loc...</option>
                        {storage.map(loc => (
                            <option key={loc.id} value={loc.name}>{loc.name}</option>
                        ))}
                    </select>
                  </td>
                  <td>
                    <select className="w-full p-1 text-[10px] border rounded" value={s.hazard_flags} onChange={e => updateSample(idx, 'hazard_flags', e.target.value)}>
                        <option value="">Safe</option>
                        <option value="TOXIC">Toxic</option>
                        <option value="BIOLOGICAL">Biological</option>
                        <option value="RADIOACTIVE">Radioactive</option>
                        <option value="FLAMMABLE">Flammable</option>
                        <option value="CORROSIVE">Corrosive</option>
                    </select>
                  </td>
                  {/* P2-4: Receipt temperature and integrity status (ISO 17025 §7.4.3) */}
                  <td>
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="0.1"
                          className={`w-1/2 p-1 text-[10px] border rounded ${s.integrity_status === 'COMPROMISED' ? 'border-red-400' : ''}`}
                          placeholder="°C"
                          title="Receipt Temperature (°C)"
                          value={s.receipt_temperature}
                          onChange={e => updateSample(idx, 'receipt_temperature', e.target.value)}
                        />
                        <select
                          className={`w-1/2 p-1 text-[9px] border rounded ${s.integrity_status === 'COMPROMISED' ? 'border-red-400 bg-red-50' : ''}`}
                          value={s.integrity_status}
                          onChange={e => updateSample(idx, 'integrity_status', e.target.value)}
                        >
                          <option value="OK">✅ OK</option>
                          <option value="QUERY_RAISED">⚠️ Query</option>
                          <option value="COMPROMISED">🚨 Compromised</option>
                        </select>
                      </div>
                      <div className="flex gap-1">
                        <input type="number" step="0.1" className="w-1/3 p-1 text-[9px] border rounded" placeholder="Min°C" title="Required Min Temp" value={s.required_temp_min} onChange={e => updateSample(idx, 'required_temp_min', e.target.value)} />
                        <input type="number" step="0.1" className="w-1/3 p-1 text-[9px] border rounded" placeholder="Max°C" title="Required Max Temp" value={s.required_temp_max} onChange={e => updateSample(idx, 'required_temp_max', e.target.value)} />
                        <select className="w-1/3 p-1 text-[9px] border rounded" value={s.transport_condition} onChange={e => updateSample(idx, 'transport_condition', e.target.value)}>
                          <option value="AMBIENT">Ambient</option>
                          <option value="COLD_CHAIN">Cold Chain</option>
                          <option value="FROZEN">Frozen</option>
                          <option value="DRY_ICE">Dry Ice</option>
                        </select>
                      </div>
                      {s.integrity_status !== 'OK' && (
                        <input className="w-full p-1 text-[9px] border rounded border-amber-300" placeholder="Integrity notes..." value={s.integrity_notes} onChange={e => updateSample(idx, 'integrity_notes', e.target.value)} />
                      )}
                    </div>
                  </td>
                  <td>
                    <button type="button" onClick={() => setSamples(samples.filter((_, i) => i !== idx))} className="text-red-400 font-bold">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-slate-50 flex justify-between items-center">
                <button type="button" className="btn-sm btn-secondary" onClick={addSampleRow}>➕ Add Row</button>
                <div className="text-[10px] text-muted uppercase font-bold flex gap-4">
                    <span>Scan Barcode (Simulated)</span>
                    <span>Labels: AUTO-GENERATE ON SAVE</span>
                </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Accessioning..." : `Register & Print ${samples.length} Labels`}
          </button>
        </div>
      </form>

      {showQuickStorage && (
        <div className="modal-overlay">
          <div className="glass-panel w-full max-w-md animate-scale-up">
            <h3 className="text-gradient mb-4">Define Storage Location</h3>
            <form onSubmit={handleAddQuickStorage}>
              <div className="mb-4">
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Location Name *</label>
                <input 
                    required 
                    className="w-full p-2 bg-slate-900 border border-white/10 rounded" 
                    placeholder="e.g. Deep Freezer B-12" 
                    value={newStorage.name} 
                    onChange={e => setNewStorage({...newStorage, name: e.target.value})} 
                />
              </div>
              <div className="mb-4">
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Description</label>
                <textarea 
                    className="w-full p-2 bg-slate-900 border border-white/10 rounded text-sm" 
                    placeholder="Storage conditions..." 
                    value={newStorage.description} 
                    onChange={e => setNewStorage({...newStorage, description: e.target.value})} 
                />
              </div>
              <div className="mb-6">
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Capacity (Units)</label>
                <input 
                    type="number" 
                    className="w-full p-2 bg-slate-900 border border-white/10 rounded" 
                    value={newStorage.capacity} 
                    onChange={e => setNewStorage({...newStorage, capacity: parseInt(e.target.value)})} 
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowQuickStorage(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>Register Location</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
