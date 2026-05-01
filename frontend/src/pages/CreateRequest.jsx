import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function CreateRequest() {
  const [engagements, setEngagements] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    engagement_id: "",
    test_description: "",
    po_number: "",
    batch_number: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [engRes, specRes] = await Promise.all([
          API.get("/api/engagements/active"),
          API.get("/api/specs")
        ]);
        setEngagements(engRes.data.data);
        setSpecs(specRes.data.data);
      } catch (err) {
        console.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/requests", formData);
      alert("Test request submitted successfully! The laboratory will review the scope.");
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit request");
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-gradient">Initiate Test Request</h2>
        <p className="text-muted">Create a formal testing order with your authorized laboratory partners.</p>
      </div>

      {loading ? (
        <p>Loading authorized partners...</p>
      ) : (
        <form className="glass-panel p-8" onSubmit={handleSubmit}>
          <div className="form-group mb-6">
            <label>Select Authorized Laboratory <span className="required">*</span></label>
            <select 
              required 
              value={formData.engagement_id} 
              onChange={(e) => setFormData({...formData, engagement_id: e.target.value})}
            >
              <option value="">-- Select a Partner --</option>
              {engagements.map(eng => (
                <option key={eng.id} value={eng.id}>
                  {eng.lab_name} (SLA: {eng.sla_tat || 'Standard'})
                </option>
              ))}
            </select>
            {engagements.length === 0 && (
              <p className="text-xs text-red-500 mt-2">You must establish a collaboration engagement before creating requests.</p>
            )}
          </div>

          <div className="form-group mb-6">
            <div className="flex justify-between items-center mb-2">
                <label className="mb-0">Detailed Test Description <span className="required">*</span></label>
                {specs.length > 0 && (
                    <select 
                        className="w-auto p-1 text-[10px] bg-blue-500/10 border-blue-500/20 text-blue-400 font-bold uppercase tracking-wider rounded"
                        onChange={(e) => {
                            if (!e.target.value) return;
                            const productName = e.target.value;
                            const productSpecs = specs.filter(s => s.product_name === productName);
                            const description = `[SOVEREIGN SPEC: ${productName}]\n` + 
                                productSpecs.map(s => `• ${s.parameter_name}: ${s.limit_type} ${s.limit_value} ${s.unit} (Method: ${s.method_reference || 'N/A'})`).join('\n');
                            setFormData({...formData, test_description: description});
                        }}
                    >
                        <option value="">-- Apply Sovereign Spec --</option>
                        {[...new Set(specs.map(s => s.product_name))].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                )}
            </div>
            <textarea 
              required
              rows="6"
              placeholder="Describe the sample type, parameters to be tested, and any specific technical requirements..."
              className="font-mono text-sm"
              value={formData.test_description}
              onChange={(e) => setFormData({...formData, test_description: e.target.value})}
            />
            <p className="text-xs text-muted mt-2">This description defines the formal scope of work for the laboratory.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group mb-8">
              <label>Purchase Order (PO) Number</label>
              <input 
                type="text"
                placeholder="e.g. PO-2026-001"
                value={formData.po_number}
                onChange={(e) => setFormData({...formData, po_number: e.target.value})}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <p className="text-xs text-muted mt-2">Internal accounting ID.</p>
            </div>
            <div className="form-group mb-8">
              <label>Batch / Lot Number</label>
              <input 
                type="text"
                placeholder="e.g. BATCH-A99"
                value={formData.batch_number}
                onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              <p className="text-xs text-muted mt-2">Production batch reference.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" className="secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={engagements.length === 0}>Submit Formal Request</button>
          </div>
        </form>
      )}
    </div>
  );
}
