import { useState, useEffect } from "react";
import API from "../services/api";

export default function EngagementManager() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null); // The request being accepted
  const [contractForm, setContractForm] = useState({
    sla_tat: "",
    review_date: "",
    partnership_notes: ""
  });

  const fetchRequests = async () => {
    try {
      const res = await API.get("/api/engagements/lab");
      setRequests(res.data.data);
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleResponse = async (id, status) => {
    if (status === 'ACCEPTED' && !reviewing) {
       setReviewing(requests.find(r => r.id === id));
       return;
    }

    try {
      const payload = status === 'ACCEPTED' ? { status, ...contractForm } : { status };
      await API.put(`/api/engagements/${id}/respond`, payload);
      setRequests(requests.map(r => r.id === id ? { ...r, status, ...contractForm } : r));
      setReviewing(null);
      setContractForm({ sla_tat: "", review_date: "", partnership_notes: "" });
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-gradient">Collaboration Requests</h2>
        <p className="text-muted">Review and authorize working relationships with clients.</p>
      </div>

      {loading ? (
        <p>Loading collaboration requests...</p>
      ) : (
        <div className="glass-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Industry</th>
                <th>Country</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-muted">No collaboration requests found.</td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id}>
                    <td className="font-semibold">{req.company_name}</td>
                    <td><span className="tag">{req.industry_type}</span></td>
                    <td>{req.country}</td>
                    <td>
                       <span className={`status-badge status-${req.status.toLowerCase()}`}>
                         {req.status}
                       </span>
                    </td>
                    <td>
                      {req.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button className="btn-sm btn-success" onClick={() => handleResponse(req.id, 'ACCEPTED')}>Accept</button>
                          <button className="btn-sm btn-danger" onClick={() => handleResponse(req.id, 'REJECTED')}>Reject</button>
                        </div>
                      ) : (
                        <div className="text-xs text-muted">
                           <div>Responded: {new Date(req.responded_at).toLocaleDateString()}</div>
                           {req.sla_tat && <div className="text-primary font-bold">SLA: {req.sla_tat}</div>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Contract Review Modal */}
      {reviewing && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content w-full max-w-lg">
            <h3 className="mb-4">Contract Review: {reviewing.company_name}</h3>
            <p className="text-sm text-muted mb-6">ISO 17025 requirement: Define service levels and technical scope before authorization.</p>
            
            <div className="form-group">
              <label>Agreed Turnaround Time (SLA) <span className="required">*</span></label>
              <input required value={contractForm.sla_tat} onChange={(e) => setContractForm({...contractForm, sla_tat: e.target.value})} placeholder="e.g. 4 business days" />
            </div>

            <div className="form-group">
              <label>Next Annual Review Date <span className="required">*</span></label>
              <input type="date" required value={contractForm.review_date} onChange={(e) => setContractForm({...contractForm, review_date: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Scope / Partnership Notes</label>
              <textarea rows="3" value={contractForm.partnership_notes} onChange={(e) => setContractForm({...contractForm, partnership_notes: e.target.value})} placeholder="Specific terms or technical limitations..." />
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button className="secondary" onClick={() => setReviewing(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => handleResponse(reviewing.id, 'ACCEPTED')}>Authorize Partnership</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
