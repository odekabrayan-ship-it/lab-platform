import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser, isAuthenticated } from './services/auth';
import CertLogin from './pages/CertLogin';
import CertDashboard from './pages/CertDashboard';
import CertApplication from './pages/CertApplication';
import CredentialRegistry from './pages/CredentialRegistry';
import CredentialVerify from './pages/CredentialVerify';
import AccreditationDashboard from './pages/AccreditationDashboard';
import AuditTrail from './pages/AuditTrail';
import ProfessionalProfile from './pages/ProfessionalProfile';

function CertNav({ children }) {
  const user = getUser();
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', roles: ['professional', 'admin'] },
    { href: '/apply', label: 'Apply', roles: ['professional', 'admin'] },
    { href: '/profile', label: 'Profile', roles: ['professional', 'admin'] },
    { href: '/registry', label: 'Registry', roles: ['professional', 'admin', null] },
    { href: '/verify', label: 'Verify', roles: ['professional', 'admin', null] },
    { href: '/accreditation', label: 'Accreditation', roles: ['admin'] },
    { href: '/audit', label: 'Audit Trail', roles: ['admin'] },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <header className="bg-[#0f172a] border-b border-teal-500/20 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-xl font-black text-white">Q</div>
            <div>
              <div className="text-lg font-black tracking-tight">QualiCore <span className="text-teal-400">Certification</span></div>
              <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Professional Authority</div>
            </div>
          </a>
        </div>
        <nav className="flex items-center gap-1">
          {navLinks.filter(l => l.roles.includes(user?.role)).map(l => (
            <a
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                window.location.pathname === l.href
                  ? 'bg-teal-600/20 text-teal-400'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              } ${l.roles.length === 1 && l.roles[0] === 'admin' ? 'hover:text-red-400' : ''}`}
            >
              {l.label}
            </a>
          ))}
          <div className="h-6 w-px bg-white/10 mx-2" />
          <div className="flex items-center gap-2">
            {user?.role === 'admin' && (
              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest rounded border border-red-500/20">Admin</span>
            )}
            <span className="text-[10px] text-white/30 hidden lg:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/10 text-xs font-bold transition-all"
            >
              Logout
            </button>
          </div>
        </nav>
      </header>
      <div className="p-8">{children}</div>
    </div>
  );
}

function App() {
  const user = getUser();
  const authed = isAuthenticated() && ['professional', 'admin'].includes(user?.role);

  const protect = (el) => authed ? el : <Navigate to="/login" replace />;
  const adminOnly = (el) => authed && user?.role === 'admin' ? el : <Navigate to="/login" replace />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<CertLogin />} />
        <Route path="/registry" element={authed ? <CertNav><CredentialRegistry /></CertNav> : <CredentialRegistry />} />
        <Route path="/verify" element={authed ? <CertNav><CredentialVerify /></CertNav> : <CredentialVerify />} />
        <Route path="/verify/:credentialNumber" element={authed ? <CertNav><CredentialVerify /></CertNav> : <CredentialVerify />} />

        {/* Authenticated routes */}
        <Route path="/dashboard" element={protect(<CertNav><CertDashboard /></CertNav>)} />
        <Route path="/apply" element={protect(<CertNav><CertApplication /></CertNav>)} />
        <Route path="/profile" element={protect(<CertNav><ProfessionalProfile /></CertNav>)} />

        {/* Admin-only routes */}
        <Route path="/accreditation" element={adminOnly(<CertNav><AccreditationDashboard /></CertNav>)} />
        <Route path="/audit" element={adminOnly(<CertNav><AuditTrail /></CertNav>)} />

        {/* Redirect */}
        <Route path="*" element={<Navigate to={authed ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
