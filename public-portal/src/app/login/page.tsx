export default function LoginGateway() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-32 flex flex-col items-center">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-6 tracking-tight font-display">Operational <span className="text-indigo-400">Gateway.</span></h1>
        <p className="text-white/50 max-w-xl text-lg leading-relaxed">
          Select your system entry point to access the QualiCore private infrastructure. 
          Each system is logically isolated for maximum security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {[
          { 
            title: "Laboratory System", 
            desc: "For lab directors, managers, and technicians.",
            icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.691.346a6 6 0 01-3.86.517l-2.388-.477a2 2 0 00-1.022.547l-1.16 1.16a2 2 0 00.447 3.178l2.357 1.178a1 1 0 00.894 0l2.357-1.178a2 2 0 011.788 0l2.357 1.178a1 1 0 00.894 0l2.357-1.178a2 2 0 00.447-3.178l-1.16-1.16z"></path></svg>,
            link: (`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:5173'}/login?role=lab`)
          },
          { 
            title: "Company System", 
            desc: "For verified industry partners and procurement.",
            icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>,
            link: (`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:5173'}/login?role=client`)
          },
          { 
            title: "Professional System", 
            desc: "For certified lab professionals and experts.",
            icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>,
            link: (`${process.env.NEXT_PUBLIC_PLATFORM_URL || 'http://localhost:5173'}/login?role=professional`)
          }
        ].map((sys, i) => (
          <a key={i} href={sys.link} className="glass-card p-10 flex flex-col items-center text-center group">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center mb-6 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              {sys.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{sys.title}</h3>
            <p className="text-white/40 text-sm leading-relaxed mb-8">{sys.desc}</p>
            <div className="mt-auto font-bold text-xs uppercase tracking-widest text-indigo-400">Access System →</div>
          </a>
        ))}
      </div>
    </div>
  );
}
