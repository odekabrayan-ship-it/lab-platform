import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function CompleteProfile() {
  const [form, setForm] = useState({
    company_name: "",
    industry_type: "",
    country: "",
    city: "",
    full_address: "",
    tax_id: "",
    website: "",
    company_bio: "",
    contact_person: "",
    contact_phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const industries = ["food", "construction", "pharma", "medical", "material", "other"];

  // Life-Cycle Persistence Check
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.verification_status && user.verification_status !== 'NEW') {
        navigate("/company-dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post("/api/clients", form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="flex-center min-h-screen bg-soft py-12">
      <div className="glass-panel w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-10">
          <h2 className="text-gradient">Professional Identity</h2>
          <p className="text-muted mt-2">Complete your business profile to start your journey with QualiCore.</p>
        </div>

        {error && <div className="banner banner-error mb-6">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Business Identity */}
          <div className="profile-section">
            <h4 className="section-title">Business Identity</h4>
            <div className="form-grid">
              <div className="form-group col-span-2">
                <label>Legal Company Name <span className="required">*</span></label>
                <input required value={form.company_name} onChange={update("company_name")} placeholder="e.g. ABC Foods Ltd." />
              </div>

              <div className="form-group">
                <label>Industry Type <span className="required">*</span></label>
                <select required value={form.industry_type} onChange={update("industry_type")}>
                  <option value="">Select Industry</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>{ind.charAt(0).toUpperCase() + ind.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Company Website</label>
                <input type="url" value={form.website} onChange={update("website")} placeholder="https://www.company.com" />
              </div>

              <div className="form-group col-span-2">
                <label>Company Bio</label>
                <textarea 
                  rows="3" 
                  value={form.company_bio} 
                  onChange={update("company_bio")} 
                  placeholder="Describe your core business and primary testing needs..."
                  className="w-full"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Section 2: Legal & Logistics */}
          <div className="profile-section mt-8">
            <h4 className="section-title">Legal & Logistics</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Tax ID / Registration Number <span className="required">*</span></label>
                <input required value={form.tax_id} onChange={update("tax_id")} placeholder="e.g. TR-123456789" />
              </div>

              <div className="form-group">
                <label>Country <span className="required">*</span></label>
                <input required value={form.country} onChange={update("country")} placeholder="Turkey" />
              </div>

              <div className="form-group">
                <label>City <span className="required">*</span></label>
                <input required value={form.city} onChange={update("city")} placeholder="Adana" />
              </div>

              <div className="form-group col-span-2">
                <label>Full Physical Address <span className="required">*</span></label>
                <input required value={form.full_address} onChange={update("full_address")} placeholder="Street name, Building No, ZIP Code" />
              </div>
            </div>
          </div>

          {/* Section 3: Primary Contact */}
          <div className="profile-section mt-8">
            <h4 className="section-title">Primary Contact</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Contact Person Name <span className="required">*</span></label>
                <input required value={form.contact_person} onChange={update("contact_person")} placeholder="Full Name" />
              </div>

              <div className="form-group">
                <label>Contact Phone <span className="required">*</span></label>
                <input required value={form.contact_phone} onChange={update("contact_phone")} placeholder="+90 123 456 78 90" />
              </div>
            </div>
          </div>

          <div className="form-actions mt-10">
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg">
              {loading ? "Establishing Business Identity..." : "Finalize Professional Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
