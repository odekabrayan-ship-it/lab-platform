import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../services/api";

export default function ReportVerification() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyReport = async () => {
      try {
        const res = await API.get(`/api/reports/verify/${code}`);
        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Verification failed. This certificate ID is not recognized.");
      } finally {
        setLoading(false);
      }
    };
    verifyReport();
  }, [code]);

  if (loading) return (
    <div className="flex-center min-h-screen bg-[#0f172a]">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400 font-mono">Authenticating Digital Certificate...</p>
        </div>
    </div>
  );

  if (error) return (
    <div className="flex-center min-h-screen bg-[#0f172a] p-6">
        <div className="glass-panel max-w-md w-full text-center border-red-500/30">
            <span className="text-5xl mb-4 block">🚫</span>
            <h2 className="text-2xl font-black text-red-400 mb-2">Invalid Certificate</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <Link to="/" className="btn-primary w-full py-3 inline-block no-underline">Return to QualiCore Home</Link>
        </div>
    </div>
  );

  const { report, samples } = data;

  return (
    <div className="min-h-screen bg-[#0f172a] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Verification Header */}
        <div className="glass-panel mb-8 border-green-500/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
                <span className="bg-green-500/20 text-green-400 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-green-500/30">
                    ✓ Authenticity Verified
                </span>
            </div>
            <div className="flex items-center gap-6 mb-8">
                <div className="h-16 w-16 bg-gradient-to-br from-green-500 to-emerald-700 rounded-2xl flex-center text-3xl shadow-lg shadow-green-500/20">
                    🛡️
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white">Digital Trust Certificate</h1>
                    <p className="text-slate-400 font-mono text-sm">Report ID: {report.report_number} | Issue Date: {new Date(report.created_at).toLocaleDateString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Issuing Laboratory</p>
                    <p className="text-white font-bold">{report.lab_name}</p>
                    <p className="text-[11px] text-slate-400">{report.accreditation_body || 'Accredited Lab'} | {report.accreditation_number}</p>
                </div>
                <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Client Firm</p>
                    <p className="text-white font-bold">{report.client_name}</p>
                </div>
                <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Verification Source</p>
                    <p className="text-blue-400 font-bold">QualiCore Quality Ledger</p>
                    <p className="text-[11px] text-slate-400">Blockchain-Verified Integrity</p>
                </div>
            </div>
        </div>

        {/* Technical Data Comparison */}
        <div className="space-y-6">
            <div className="flex justify-between items-end mb-2">
                <h3 className="text-xl font-bold text-slate-200">System Record Comparison</h3>
                <p className="text-xs text-slate-500 italic">This data is pulled directly from our encrypted database and cannot be altered.</p>
            </div>

            {samples.map(sample => (
                <div key={sample.id} className="glass-panel border-white/5">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                        <h4 className="text-blue-400 font-bold">Sample: {sample.sample_code}</h4>
                        <span className="text-xs text-slate-500 italic">{sample.description}</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-slate-500 border-b border-white/5">
                                    <th className="pb-3">Parameter</th>
                                    <th className="pb-3">Official Result</th>
                                    <th className="pb-3">Uncertainty</th>
                                    <th className="pb-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-300">
                                {sample.results.map(res => (
                                    <tr key={res.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-4 font-semibold">{res.parameter_name}</td>
                                        <td className="py-4 font-mono text-white">{res.value} {res.unit}</td>
                                        <td className="py-4 text-slate-500">{res.measurement_uncertainty || 'N/A'}</td>
                                        <td className="py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${res.pass_fail === 'Pass' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {res.pass_fail}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>

        {/* Footer Security Notice */}
        <div className="mt-12 text-center p-8 bg-slate-900/50 rounded-3xl border border-white/5">
            <p className="text-slate-500 text-sm max-w-2xl mx-auto leading-relaxed">
                QualiCore uses high-entropy verification IDs and digital watermarking to ensure technical records remain untampered. 
                If the data above does not match the printed report in your possession, please contact the issuing laboratory or 
                report a discrepancy to <span className="text-blue-400 underline cursor-pointer">integrity@qualicore.lab</span>.
            </p>
            <div className="mt-8 flex justify-center gap-8 opacity-40 grayscale">
                {/* Mock Compliance Logos */}
                <div className="flex flex-col items-center">
                    <div className="h-10 w-10 border-2 border-slate-500 rounded-full flex-center text-[10px] font-black">ISO</div>
                    <span className="text-[8px] mt-1">17025:2017</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="h-10 w-10 border-2 border-slate-500 rounded-lg flex-center text-[10px] font-black">SSL</div>
                    <span className="text-[8px] mt-1">AES-256</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
