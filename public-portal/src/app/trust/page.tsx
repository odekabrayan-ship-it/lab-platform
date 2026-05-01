export default function TrustExplanation() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <div className="text-center mb-20">
        <h1 className="text-6xl font-bold mb-6 tracking-tight font-display">The Trust <span className="text-indigo-400">Engine.</span></h1>
        <p className="text-white/50 max-w-2xl mx-auto text-xl leading-relaxed">
          Understanding how QualiCore converts private laboratory operations into verifiable public trust infrastructure.
        </p>
      </div>

      <div className="space-y-32">
        {/* CONCEPT 1: SEPARATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="glass-card p-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
             </div>
             <h3 className="text-2xl font-bold mb-4 text-indigo-400">Logical Isolation</h3>
             <p className="text-white/50 leading-relaxed mb-6">
               The Private System (Operations) and the Public Portal (Trust) are physically and logically separate. 
               This ensures that sensitive laboratory workflows, pricing, and specific test data remain strictly internal.
             </p>
             <ul className="space-y-3 text-sm text-white/70">
               <li className="flex gap-2">✅ Operational data stays private</li>
               <li className="flex gap-2">✅ Read-only public layer</li>
               <li className="flex gap-2">✅ No performance coupling</li>
             </ul>
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-6">Built for <span className="text-indigo-400">Security.</span></h2>
            <p className="text-white/40 leading-relaxed">
              We employ an event-driven snapshot architecture. When a laboratory reaches a verified state 
              in the private system, a sanitized public record is pushed to our Trust Aggregator. 
              There is no direct database connection between the public portal and the operational engine.
            </p>
          </div>
        </div>

        {/* CONCEPT 2: VERIFICATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="order-2 md:order-1">
             <h2 className="text-3xl font-bold mb-6">Verifiable <span className="text-indigo-400">Integrity.</span></h2>
             <p className="text-white/40 leading-relaxed mb-8">
               Every Certificate of Analysis (CoA) generated within the network receives a unique, 
               cryptographically linked verification code. This allows stakeholders to verify 
               the document's origin and current status without accessing the private laboratory records.
             </p>
             <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 italic text-indigo-300 text-sm">
               "Truth is generated in the lab; Trust is presented in the portal."
             </div>
          </div>
          <div className="order-1 md:order-2 glass-card p-10 border-r-4 border-r-indigo-500">
             <h3 className="text-2xl font-bold mb-4">The Verification Loop</h3>
             <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">1</div>
                  <span className="text-sm font-medium">Sample tested in ISO-compliant lab</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">2</div>
                  <span className="text-sm font-medium">Results validated by authorized personnel</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">3</div>
                  <span className="text-sm font-medium">Report generated with unique trust token</span>
                </div>
                <div className="flex items-center gap-4 text-indigo-400">
                  <div className="w-8 h-8 rounded-full bg-indigo-400/20 border border-indigo-400/40 flex items-center justify-center text-xs font-bold">4</div>
                  <span className="text-sm font-bold uppercase tracking-widest">Public Verification Enabled</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
