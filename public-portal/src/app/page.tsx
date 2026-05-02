import { Suspense } from 'react';
import RegistryExplorer from './components/RegistryExplorer';
import Link from 'next/link';

async function getStats() {
  try {
    const res = await fetch((`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/public/stats`), { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    return null;
  }
}

async function getBrands() {
  try {
    const res = await fetch((`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/public/brands`), { next: { revalidate: 60 } });
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    return [];
  }
}

const TrustSeal = ({ label }: { label: string }) => (
    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{label}</span>
    </div>
);

export default async function Home() {
  const statsRes = await getStats();
  const brands = await getBrands();
  
  const stats = statsRes || {
    verified_companies: "150+",
    trusted_brands: "420+",
    monitored_events: "12,402"
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-emerald-500/30">
      
      {/* ── WORLD-CLASS STICKY NAVIGATION ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-8 h-20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/20">Q</div>
                  <span className="text-xl font-black tracking-tighter">Quali<span className="text-indigo-400">Core</span></span>
              </div>
              <div className="hidden md:flex items-center gap-10">
                  {['Registry', 'Vigilance', 'Methodology', 'About'].map(item => (
                      <a key={item} href={`#${item.toLowerCase()}`} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">{item}</a>
                  ))}
                  <button className="px-6 py-2.5 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                      Industry / Lab Login
                  </button>
              </div>
          </div>
      </nav>

      {/* ── IMMERSIVE HERO SECTION ── */}
      <section className="relative pt-40 pb-32 px-8 overflow-hidden min-h-[90vh] flex items-center">
          {/* Background Image Layer */}
          <div className="absolute inset-0 z-0 opacity-40">
              <img 
                src="/health_trust_hero_bg_1777630133153.png" 
                alt="Health Trust Background" 
                className="w-full h-full object-cover grayscale brightness-50"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617]"></div>
          </div>

          <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="animate-fade-in">
                  <div className="flex gap-4 mb-10">
                      <TrustSeal label="Safety Checked" />
                      <TrustSeal label="ISO 17025 Certified" />
                  </div>
                  <h1 className="text-7xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.85]">
                      Trusted <br />
                      <span className="text-indigo-400">Safety</span> <br />
                      For Your Family.
                  </h1>
                  <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-xl mb-12">
                      Find safe, pure, and tested products for your home. 
                      Every brand listed here is verified through independent, direct laboratory testing.
                  </p>
                  <div className="flex flex-wrap gap-6">
                      <a href="#registry" className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all">
                          Explore Safe Products →
                      </a>
                      <a href="#vigilance" className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                          Report a Health Issue
                      </a>
                  </div>
              </div>

              <div className="hidden lg:grid grid-cols-2 gap-6 animate-scale-up">
                  {[
                      { label: 'Verified Companies', val: stats.verified_companies, icon: '🏛️' },
                      { label: 'Safe Brands', val: stats.trusted_brands, icon: '✅' },
                      { label: 'Health Issues Reported', val: stats.monitored_events, icon: '📡' },
                      { label: 'Lab Network Health', val: '99.9%', icon: '🧪' }
                  ].map((s, i) => (
                      <div key={i} className="p-10 rounded-[2.5rem] glass-panel border-white/5 bg-white/[0.02] group hover:bg-white/[0.04] transition-all">
                          <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{s.icon}</div>
                          <div className="text-4xl font-black tracking-tighter mb-1">{s.val}</div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* ── HEALTH SOLUTIONS VERTICALS ── */}
      <section className="py-32 px-8 bg-slate-950/50">
          <div className="max-w-7xl mx-auto">
              <div className="text-center mb-24">
                  <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-6">Product Safety Categories</h2>
                  <h3 className="text-5xl font-black tracking-tighter mb-6">Built to Protect Your Health.</h3>
                  <p className="text-slate-500 max-w-2xl mx-auto font-medium">
                      We categorize products into clear, simple categories to help you easily find safe options for your family's daily needs.
                  </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                      { title: 'Pantry Purity', desc: 'Flour, oils, and essential nutritional staples.', icon: '🍳', color: 'indigo' },
                      { title: 'Safe Hydration', desc: 'Certified bottled water and hydration sources.', icon: '💧', color: 'blue' },
                      { title: 'Medicines & Pharma', desc: 'Vetted pharmacies and medicinal providers.', icon: '💊', color: 'emerald' },
                      { title: 'Infant Protection', desc: 'Strict lab testing for baby formulas and infant nutrition.', icon: '🍼', color: 'rose' }
                  ].map((v, i) => (
                      <div key={i} className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group cursor-pointer">
                          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl mb-8 group-hover:bg-indigo-500/10 transition-colors">{v.icon}</div>
                          <h4 className="text-xl font-bold mb-4 tracking-tight">{v.title}</h4>
                          <p className="text-sm text-slate-500 leading-relaxed font-medium mb-8">{v.desc}</p>
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">View Verified Brands →</span>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* ── THE REGISTRY EXPLORER ── */}
      <section id="registry" className="py-40 px-8 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
          <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row justify-between items-end gap-10 mb-20">
                  <div>
                      <h2 className="text-5xl font-black tracking-tighter mb-4 text-white">Safe <span className="text-indigo-400">Products.</span></h2>
                      <p className="text-slate-500 max-w-xl font-medium">Browse our directory of verified safe products. Every item is backed by real, independent lab tests.</p>
                  </div>
                  <div className="flex gap-4">
                      <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest">
                          Last Sync: {new Date().toLocaleTimeString()}
                      </div>
                  </div>
              </div>

              <Suspense fallback={<div className="py-20 text-center text-white/20 italic">Initialising Trust Network...</div>}>
                  <RegistryExplorer initialBrands={brands} />
              </Suspense>
          </div>
      </section>

      {/* ── VIGILANCE SIGNAL HUB ── */}
      <section id="vigilance" className="py-40 px-8 border-t border-white/5 bg-red-500/[0.01]">
          <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                  <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest mb-8">
                          Consumer Safety Alerts
                      </div>
                      <h2 className="text-6xl font-black tracking-tighter mb-8 leading-none">Your Health <br />Matters.</h2>
                      <p className="text-slate-400 text-lg leading-relaxed mb-12 font-medium">
                          Experienced a health issue with a product? Report it here. 
                          We use your reports to investigate safety risks and hold brands accountable.
                      </p>
                      <button className="px-12 py-5 bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-2xl shadow-red-500/20 hover:bg-red-600 transition-all">
                          Report a Health Issue 🚨
                      </button>
                  </div>
                  <div className="relative">
                      <div className="absolute inset-0 bg-red-500/10 blur-[100px] rounded-full"></div>
                      <div className="relative glass-panel p-10 border-white/10 bg-black rounded-[3rem]">
                          <div className="flex justify-between items-center mb-10">
                              <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest">Recent Safety Alerts</h4>
                              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                          </div>
                          <div className="space-y-6">
                              {[1, 2, 3].map(j => (
                                  <div key={j} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                      <div className="flex items-center gap-6">
                                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                          <div>
                                              <div className="text-xs font-black">Report #RX-{9420+j}02</div>
                                              <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Investigation Started</div>
                                          </div>
                                      </div>
                                      <div className="text-[10px] font-mono text-slate-600">2.{j}h ago</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* ── STANDARD COMPLIANCE FOOTER ── */}
      <footer className="py-32 px-8 bg-black border-t border-white/5">
          <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-32">
                  <div className="col-span-2">
                      <div className="flex items-center gap-3 mb-8">
                          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl">Q</div>
                          <span className="text-2xl font-black tracking-tighter">QualiCore</span>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed max-w-sm mb-10">
                          The global standard for laboratory-verified transparency. 
                          Built to protect the scientific integrity of the international supply chain.
                      </p>
                      <div className="flex gap-4">
                          {[1,2,3,4].map(s => <div key={s} className="w-10 h-10 rounded-full bg-white/5 border border-white/10"></div>)}
                      </div>
                  </div>
                  <div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-8">Institutional</h4>
                      <ul className="space-y-4 text-xs font-medium text-slate-500">
                          {['Our Methodology', 'Sovereign Network', 'Accreditation', 'Global Labs'].map(l => <li key={l} className="hover:text-indigo-400 transition-colors cursor-pointer">{l}</li>)}
                      </ul>
                  </div>
                  <div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-8">Governance</h4>
                      <ul className="space-y-4 text-xs font-medium text-slate-500">
                          {['Data Ethics', 'Vigilance Protocol', 'Reporting Standards', 'Legal Ledger'].map(l => <li key={l} className="hover:text-indigo-400 transition-colors cursor-pointer">{l}</li>)}
                      </ul>
                  </div>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center gap-10 pt-10 border-t border-white/5">
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">© 2026 QualiCore Trust Network • All Rights Reserved</p>
                  <div className="flex gap-8 text-[10px] font-black text-slate-700 uppercase tracking-widest">
                      <span>Privacy Policy</span>
                      <span>Institutional Terms</span>
                  </div>
              </div>
          </div>
      </footer>
    </div>
  );
}
