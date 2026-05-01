import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../services/api";

export default function BatchResultEntry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestId = searchParams.get("requestId");

  const [samples, setSamples] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [methods, setMethods] = useState([]);
  const [reagents, setReagents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sampleRes, equipRes, methodRes, reagentRes] = await Promise.all([
          API.get(`/api/samples/request/${requestId}`),
          API.get("/api/equipment"),
          API.get("/api/methods"),
          API.get("/api/reagents")
        ]);
        setSamples(sampleRes.data.data);
        setEquipment(equipRes.data.data);
        setMethods(methodRes.data.data);
        setReagents(reagentRes.data.data);
        
        setResults(sampleRes.data.data.map(s => ({
          sample_id: s.id,
          sample_code: s.sample_code,
          parameter_name: "",
          value: "",
          unit: "",
          method_reference: "",
          measurement_uncertainty: "",
          specification_limit: "",
          pass_fail: "N/A",
          equipment_id: "",
          positive_control: "",
          negative_control: "",
          incubation_time: "",
          incubation_temp: "",
          reagent_lot: "",
          reagent_id: ""
        })));
      } catch (err) {
        console.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    if (requestId) fetchData();
  }, [requestId]);

  const updateResult = (idx, field, val) => {
    const newResults = [...results];
    newResults[idx][field] = val;

    // SOP Auto-fill
    if (field === 'parameter_name') {
        const method = methods.find(m => m.parameter_name.toLowerCase() === val.toLowerCase());
        if (method) {
            newResults[idx].unit = method.default_unit || "";
            newResults[idx].method_reference = method.method_reference || "";
            newResults[idx].specification_limit = method.specification_limit || "";
        }
    }

    // Auto Pass/Fail
    if (field === 'value' && newResults[idx].specification_limit) {
        const valNum = parseFloat(val);
        const limitStr = newResults[idx].specification_limit;
        if (!isNaN(valNum)) {
            if (limitStr.includes('<')) {
                const limit = parseFloat(limitStr.replace('<', '').trim());
                newResults[idx].pass_fail = valNum < limit ? "Pass" : "Fail";
            } else if (limitStr.includes('>')) {
                const limit = parseFloat(limitStr.replace('>', '').trim());
                newResults[idx].pass_fail = valNum > limit ? "Pass" : "Fail";
            } else if (limitStr.includes('-')) {
                const [min, max] = limitStr.split('-').map(s => parseFloat(s.trim()));
                newResults[idx].pass_fail = (valNum >= min && valNum <= max) ? "Pass" : "Fail";
            }
        }
    }

    // Reagent Lot Auto-fill
    if (field === 'reagent_id' && val) {
        const reagent = reagents.find(reg => reg.id === parseInt(val));
        if (reagent) {
            newResults[idx].reagent_lot = reagent.lot_number || "";
        }
    }

    setResults(newResults);
  };

  const smartFillDown = (field) => {
      if (results.length < 2) return;
      const firstVal = results[0][field];
      if (!firstVal) return alert(`Please fill the first row's ${field} first.`);
      setResults(results.map(r => ({...r, [field]: firstVal})));
  };

  const handleBulkCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split("\n").filter(l => l.trim() !== "");
      const imported = lines.slice(1).map(line => {
        const p = line.split(",").map(s => s.trim());
        const sample = samples.find(s => s.sample_code === p[0]);
        if (!sample) return null;
        return {
          sample_id: sample.id,
          sample_code: p[0],
          parameter_name: p[1],
          value: p[2],
          unit: p[3],
          measurement_uncertainty: p[4],
          specification_limit: p[5],
          pass_fail: p[6] || "N/A",
          equipment_id: p[7],
          reagent_id: "",
          method_reference: "",
          positive_control: p[8] || "",
          negative_control: p[9] || "",
          incubation_time: p[10] || "",
          incubation_temp: p[11] || "",
          reagent_lot: p[12] || ""
        };
      }).filter(x => x !== null);
      
      setResults(imported);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valid = results.filter(r => r.parameter_name && r.value);
    
    // Check for expired reagents
    for (const r of valid) {
        if (r.reagent_id) {
            const reagent = reagents.find(reg => reg.id === parseInt(r.reagent_id));
            if (reagent && new Date(reagent.expiry_date) < new Date()) {
                return alert(`FATAL ERROR: Reagent ${reagent.name} (Lot: ${reagent.lot_number}) is EXPIRED. Results cannot be saved with non-compliant supplies.`);
            }
        }
    }

    setSaving(true);
    try {
      await API.post("/api/results/batch", { results: valid });
      alert(`Saved ${valid.length} draft results with full supply traceability.`);
      navigate(`/dashboard`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save batch");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading batch workspace...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-gradient">Professional Batch Resulting</h2>
          <p className="text-muted">Traceable entry with SOP auto-fill, Instrument validation, and Reagent tracking.</p>
        </div>
        <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => smartFillDown('parameter_name')}>⬇️ Fill Parameters</button>
            <button className="btn-secondary" onClick={() => smartFillDown('equipment_id')}>⬇️ Fill Instrument</button>
            <button className="btn-secondary" onClick={() => smartFillDown('reagent_id')}>⬇️ Fill Reagent</button>
            <label className="btn-secondary cursor-pointer">
                📥 CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleBulkCSV} />
            </label>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="glass-panel p-0 overflow-hidden">
          <table className="data-table text-[10px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="py-3">Sample</th>
                <th>Parameter *</th>
                <th>Value *</th>
                <th>Technical controls</th>
                <th>Unit</th>
                <th>Limits</th>
                <th>Status</th>
                <th>Instrument/Incubation</th>
                <th>Reagent/Supply</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={idx} className={r.pass_fail === 'Fail' ? 'bg-red-50' : ''}>
                  <td className="font-bold text-blue-500">{r.sample_code}</td>
                  <td>
                    <input required list="method-list" className="w-full p-1 bg-transparent border-none" value={r.parameter_name} onChange={e => updateResult(idx, 'parameter_name', e.target.value)} />
                    <datalist id="method-list">
                        {methods.map(m => <option key={m.id} value={m.parameter_name} />)}
                    </datalist>
                  </td>
                  <td><input required className={`w-full p-1 rounded ${r.pass_fail === 'Fail' ? 'bg-red-100 text-red-700 font-bold' : 'bg-transparent border-none'}`} value={r.value} onChange={e => updateResult(idx, 'value', e.target.value)} /></td>
                  <td>
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                            <input className="w-1/2 p-0.5 bg-white/5 border border-white/5 rounded text-[8px]" placeholder="Pos" value={r.positive_control} onChange={e => updateResult(idx, 'positive_control', e.target.value)} />
                            <input className="w-1/2 p-0.5 bg-white/5 border border-white/5 rounded text-[8px]" placeholder="Neg" value={r.negative_control} onChange={e => updateResult(idx, 'negative_control', e.target.value)} />
                        </div>
                    </div>
                  </td>
                  <td><input className="w-full p-1 bg-transparent border-none" value={r.unit} onChange={e => updateResult(idx, 'unit', e.target.value)} /></td>
                  <td><input className="w-full p-1 bg-transparent border-none font-mono" value={r.specification_limit} onChange={e => updateResult(idx, 'specification_limit', e.target.value)} /></td>
                  <td>
                    <span className={`pill text-[9px] ${r.pass_fail === 'Pass' ? 'pill-paid' : r.pass_fail === 'Fail' ? 'pill-danger' : 'pill-review'}`}>
                        {r.pass_fail}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                        <select className="bg-transparent border-none w-28" value={r.equipment_id} onChange={e => updateResult(idx, 'equipment_id', e.target.value)}>
                        <option value="">Select</option>
                        {equipment.map(eq => (
                            <option key={eq.id} value={eq.serial_number} disabled={eq.status !== 'ACTIVE'}>
                                {eq.name}
                            </option>
                        ))}
                        </select>
                        <div className="flex gap-1">
                            <input className="w-1/2 p-0.5 bg-white/5 border border-white/5 rounded text-[8px]" placeholder="Hrs" value={r.incubation_time} onChange={e => updateResult(idx, 'incubation_time', e.target.value)} />
                            <input className="w-1/2 p-0.5 bg-white/5 border border-white/5 rounded text-[8px]" placeholder="°C" value={r.incubation_temp} onChange={e => updateResult(idx, 'incubation_temp', e.target.value)} />
                        </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                        <select className="bg-transparent border-none w-28" value={r.reagent_id} onChange={e => updateResult(idx, 'reagent_id', e.target.value)}>
                            <option value="">None</option>
                            {reagents.map(reg => {
                                const isExp = new Date(reg.expiry_date) < new Date();
                                return (
                                    <option key={reg.id} value={reg.id} disabled={reg.status !== 'ACTIVE' || isExp}>
                                        {isExp ? '⚠️ EXPIRED: ' : ''}{reg.name} ({reg.lot_number})
                                    </option>
                                );
                            })}
                        </select>
                        <input className="w-full p-0.5 bg-white/5 border border-white/5 rounded text-[8px] font-mono" placeholder="Lot #" value={r.reagent_lot} onChange={e => updateResult(idx, 'reagent_lot', e.target.value)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Processing..." : `Verify & Save ${results.length} Results`}
          </button>
        </div>
      </form>
    </div>
  );
}
