import { useState, useEffect } from "react";
import API from "../services/api";

export default function RelationshipManager() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await API.get("/api/relationships/pending");
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

  const handleAction = async (id, status) => {
    try {
      await API.patch(`/api/relationships/${id}`, { status });
      setRequests(requests.filter(r => r.id !== id));
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-gradient">Relationship Requests</h2>
        <p className="text-muted">Review and accept partnership requests from companies.</p>
      </div>

      {loading ? (
        <p>Loading requests...</p>
      ) : (
        <div className="glass-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Industry</th>
                <th>Country</th>
                <th>Requested At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-muted">No pending requests found.</td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id}>
                    <td className="font-semibold">{req.company_name}</td>
                    <td><span className="tag">{req.industry_type}</span></td>
                    <td>{req.country}</td>
                    <td>{new Date(req.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-sm btn-success" onClick={() => handleAction(req.id, 'ACCEPTED')}>Accept</button>
                        <button className="btn-sm btn-danger" onClick={() => handleAction(req.id, 'REJECTED')}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
