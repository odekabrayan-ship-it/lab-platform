import { useState, useEffect } from "react";
import API from "../services/api";

export default function ActiveNetwork() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const res = await API.get("/api/engagements/active");
        setPartners(res.data.data);
      } catch (err) {
        console.error("Failed to fetch active network", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPartners();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-gradient">Active Network</h2>
        <p className="text-muted">Manage your established technical partnerships and SLAs.</p>
      </div>

      {loading ? (
        <p>Loading network...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {partners.length === 0 ? (
            <div className="col-span-full glass-panel text-center py-20">
              <p className="text-muted">No active partnerships established yet.</p>
            </div>
          ) : (
            partners.map(p => (
              <div key={p.id} className="glass-panel p-6 border-l-4 border-primary">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">
                      {user.role === 'client' ? p.lab_name : p.company_name}
                    </h3>
                    <p className="text-sm text-muted">📍 {p.city || p.country}</p>
                  </div>
                  <span className="status-badge status-accepted">Active</span>
                </div>

                <div className="bg-soft p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase text-slate-400 font-bold">Agreed SLA</label>
                      <p className="font-semibold text-primary">{p.sla_tat || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-xs uppercase text-slate-400 font-bold">Next Review</label>
                      <p className="font-semibold">{p.review_date ? new Date(p.review_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {p.partnership_notes && (
                  <div className="text-sm text-slate-600 italic border-t pt-4 mt-2">
                    "{p.partnership_notes}"
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
