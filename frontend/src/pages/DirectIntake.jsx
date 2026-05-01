import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function DirectIntake() {
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    engagement_id: "",
    test_description: "",
    po_number: "",
    batch_number: ""
  });

  useEffect(() => {
    const fetchEngagements = async () => {
      try {
        const res = await API.get("/api/engagements/active");
        setEngagements(res.data.data);
        if (res.data.data.length > 0) {
            setForm(f => ({ ...f, engagement_id: res.data.data[0].id }));
        }
      } catch (err) {
        console.error("Failed to load partnerships");
      } finally {
        setLoading(false);
      }
    };
    fetchEngagements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await API.post("/api/requests", {
          ...form,
          request_source: 'WALK_IN'
      });
      const newRequestId = res.data.data.id;
      // Success! Now redirect to the expanded sample registration form for this new ID
      navigate(`/samples?requestId=${newRequestId}`);
    } catch (err) {
      alert("Failed to initiate walk-in request. Verify partnership status.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-muted">Loading Active Partnerships...</div>;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h2 className="text-gradient">Direct Intake & Walk-in Center</h2>
        <p className="text-muted">Initiate a test request on behalf of a partner company who has delivered physical samples.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="glass-panel space-y-6">
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Select Client Partner</label>
                    <select 
                        required
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-sm focus:border-primary outline-none transition-all"
                        value={form.engagement_id}
                        onChange={e => setForm({...form, engagement_id: e.target.value})}
                    >
                        <option value="">Choose a verified partner...</option>
                        {engagements.map(eng => (
                            <option key={eng.id} value={eng.id}>{eng.company_name} ({eng.industry_type})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Technical Test Description</label>
                    <textarea 
                        required
                        rows="4"
                        className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-sm focus:border-primary outline-none transition-all"
                        placeholder="e.g. Comprehensive Mineral Analysis for Borehole Water - Project Alpha"
                        value={form.test_description}
                        onChange={e => setForm({...form, test_description: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">PO / Reference Number</label>
                        <input 
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-sm focus:border-primary outline-none"
                            placeholder="Optional"
                            value={form.po_number}
                            onChange={e => setForm({...form, po_number: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Batch / Lot Number</label>
                        <input 
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-sm focus:border-primary outline-none"
                            placeholder="Optional"
                            value={form.batch_number}
                            onChange={e => setForm({...form, batch_number: e.target.value})}
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end gap-4">
                    <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={submitting} className="btn-primary px-8">
                        {submitting ? "Initiating..." : "Create Request & Proceed to Samples →"}
                    </button>
                </div>
            </form>
          </div>

          <div className="space-y-6">
              <div className="glass-panel border-l-4 border-blue-500">
                  <h4 className="font-bold text-sm mb-2">Professional Protocol</h4>
                  <ul className="text-xs text-slate-400 space-y-3">
                      <li>• Ensure the client has a signed SLA in the system.</li>
                      <li>• Direct intake requests are marked as "WALK_IN" for auditing.</li>
                      <li>• The client will receive an automated notification of this action.</li>
                      <li>• Use the next screen to register individual samples and print labels.</li>
                  </ul>
              </div>

              <div className="glass-panel border-l-4 border-amber-500">
                  <h4 className="font-bold text-sm mb-2">ISO 17025 Reminder</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                      All technician-initiated requests must still undergo contract review. By creating this request, you confirm that the laboratory has the technical capability to perform the requested tests.
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
}
