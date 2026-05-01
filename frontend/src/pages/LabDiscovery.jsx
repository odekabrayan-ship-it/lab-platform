import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function LabDiscovery() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: "",
    accreditation: "",
    location: "",
    test_name: "",
  });
  const navigate = useNavigate();

  const categories = ["Food", "Medical", "Materials", "Environmental", "Chemical", "Construction"];
  const accreditations = ["ISO/IEC 17025", "ISO 15189", "GLP", "Local License"];

  const fetchLabs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await API.get(`/api/labs/search?${query}`);
      setLabs(res.data.data);
    } catch (err) {
      console.error("Failed to fetch labs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [filters]);

  const handleEngagementRequest = async (labId) => {
    try {
      await API.post("/api/engagements", { lab_id: labId });
      alert("Collaboration request sent! The laboratory will review your technical profile.");
      fetchLabs();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send collaboration request");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-gradient">Explore Laboratories</h2>
          <p className="text-muted mt-1">Discover accredited technical partners for your testing requirements.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel mb-8 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="form-group">
            <label>Category</label>
            <select value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Accreditation</label>
            <select value={filters.accreditation} onChange={(e) => setFilters({...filters, accreditation: e.target.value})}>
              <option value="">Any Accreditation</option>
              {accreditations.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Location</label>
            <input 
              placeholder="City or Country..." 
              value={filters.location} 
              onChange={(e) => setFilters({...filters, location: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Specific Test</label>
            <input 
              placeholder="e.g. pH, Compression..." 
              value={filters.test_name} 
              onChange={(e) => setFilters({...filters, test_name: e.target.value})}
            />
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="text-center py-20">
          <p className="text-muted">Searching for labs...</p>
        </div>
      ) : (
        <div className="lab-grid">
          {labs.length === 0 ? (
            <div className="col-span-full glass-panel text-center py-20">
              <h3 className="text-muted">No laboratories found matching your criteria.</h3>
            </div>
          ) : (
            labs.map((lab) => (
              <div key={lab.id} className="lab-card glass-panel hover-lift">
                <div className="lab-card-header">
                  <div className="lab-badge">{lab.accreditation_status || 'ACCREDITED'}</div>
                  <h3 className="lab-name">{lab.name}</h3>
                  <p className="lab-location">📍 {lab.city}, {lab.country}</p>
                </div>
                <div className="lab-card-body mt-4">
                   <div className="flex flex-wrap gap-2 mb-4">
                      <span className="tag">{lab.organization_type}</span>
                      <span className="tag">TAT: {lab.turnaround_time}</span>
                   </div>
                   <p className="text-sm text-muted line-clamp-2">
                     {lab.scope_description || 'Professional testing services in ' + lab.city}
                   </p>
                </div>
                <div className="lab-card-footer mt-6">
                  <button className="btn-primary w-full py-3" onClick={() => handleEngagementRequest(lab.id)}>
                    Request Collaboration
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
