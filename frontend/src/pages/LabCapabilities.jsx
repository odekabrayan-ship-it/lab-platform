import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function LabCapabilities() {
  const [capabilities, setCapabilities] = useState([{ test_category: "", test_name: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const categories = ["Food", "Construction", "Environmental", "Medical", "Chemical", "Materials"];

  const addRow = () => setCapabilities([...capabilities, { test_category: "", test_name: "" }]);
  const removeRow = (index) => setCapabilities(capabilities.filter((_, i) => i !== index));
  
  const updateRow = (index, field, value) => {
    const newCaps = [...capabilities];
    newCaps[index][field] = value;
    setCapabilities(newCaps);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post("/api/labs/capabilities", { capabilities });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save capabilities");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center min-h-screen bg-soft py-12">
      <div className="glass-panel w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <h2 className="text-gradient">Define Capabilities</h2>
          <p className="text-muted mt-2">Specify the tests you are authorized to perform. This enables companies to find you.</p>
        </div>

        {error && <div className="banner banner-error mb-6">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="profile-section">
            <div className="flex justify-between items-center mb-4">
              <h4 className="section-title m-0">Test Scope</h4>
              <button type="button" className="btn-sm btn-success" onClick={addRow}>+ Add Test</button>
            </div>

            {capabilities.map((cap, index) => (
              <div key={index} className="form-grid mb-4 items-end" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                <div className="form-group">
                  <label>Category</label>
                  <select required value={cap.test_category} onChange={(e) => updateRow(index, "test_category", e.target.value)}>
                    <option value="">Select</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Test Name</label>
                  <input required value={cap.test_name} onChange={(e) => updateRow(index, "test_name", e.target.value)} placeholder="e.g. pH Analysis" />
                </div>
                <div className="form-group" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                   <button type="button" onClick={() => removeRow(index)} className="btn-sm btn-danger" style={{ background: '#ef4444' }} disabled={capabilities.length === 1}>
                     Delete
                   </button>
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions mt-10">
            <button type="submit" disabled={loading} className="btn-primary w-full py-4">
              {loading ? "Saving Scope..." : "Complete Onboarding"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
