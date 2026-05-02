import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QualiCore Public Trust Portal",
  description: "Transforming laboratory operations into publicly verifiable trust infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen selection:bg-indigo-500/30">
        <nav className="fixed top-0 w-full z-[100] border-b border-white/5 bg-black/60 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-indigo-600/20">Q</div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tighter leading-none">QualiCore <span className="text-indigo-400">Trust</span></span>
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20 mt-1">Sovereign Integrity Layer</span>
              </div>
            </div>
            
            <div className="hidden lg:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              <a href="/" className="hover:text-indigo-400 transition-colors">Infrastructure Network</a>
              <a href="/brands" className="hover:text-indigo-400 transition-colors">Technical Registry</a>
              <a href="/labs" className="hover:text-indigo-400 transition-colors">Lab Directory</a>
              <a href="/verify" className="hover:text-indigo-400 transition-colors">Authentication Gateway</a>
            </div>

            <div className="flex items-center gap-6">
              <a href={`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:5173'}/login`} className="px-6 py-3 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl shadow-white/5">
                Portal Access
              </a>
            </div>
          </div>
        </nav>
        
        <main className="">
          {children}
        </main>

        <footer className="pt-32 pb-16 border-t border-white/5 bg-black">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-20 mb-32">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white">Q</div>
                  <span className="text-xl font-bold tracking-tighter">QualiCore Trust Network</span>
                </div>
                <p className="text-white/20 text-xs leading-relaxed max-w-sm mb-10 font-medium">
                  The primary public infrastructure layer for transforming laboratory analytical data into verifiable institutional trust signals.
                </p>
              </div>
              <div>
                <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-8">Registry Indices</h5>
                <ul className="space-y-4 text-xs font-bold text-white/30 uppercase tracking-widest">
                  <li><a href="/brands" className="hover:text-white">Brand Directory</a></li>
                  <li><a href="/companies" className="hover:text-white">Company Index</a></li>
                  <li><a href="/labs" className="hover:text-white">Lab Network</a></li>
                </ul>
              </div>
              <div>
                <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-8">Verification</h5>
                <ul className="space-y-4 text-xs font-bold text-white/30 uppercase tracking-widest">
                  <li><a href="/verify" className="hover:text-white">Verify Report</a></li>
                  <li><a href="/framework" className="hover:text-white">Trust Framework</a></li>
                  <li><a href="/api-docs" className="hover:text-white">Developer API</a></li>
                </ul>
              </div>
              <div>
                <h5 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-8">Safety</h5>
                <ul className="space-y-4 text-xs font-bold text-white/30 uppercase tracking-widest">
                  <li><a href="/report-issue" className="text-red-400 hover:text-red-300">Report Adverse Signal</a></li>
                  <li><a href="/vigilance" className="hover:text-white">Vigilance Policy</a></li>
                </ul>
              </div>
            </div>
            
            <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/10">© 2026 QualiCore Public Trust Infrastructure Network</p>
              <div className="flex gap-8 text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
                <a href="#" className="hover:text-white">Privacy Protocol</a>
                <a href="#" className="hover:text-white">Terms of Authentication</a>
                <a href="https://github.com/odekabrayan-ship-it" target="_blank" rel="noreferrer" className="hover:text-white flex items-center gap-2">
                  <span className="opacity-50">GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
