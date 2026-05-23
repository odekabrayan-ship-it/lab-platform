import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser, isAuthenticated } from './services/auth';
import CertLogin from './pages/CertLogin';
import CertDashboard from './pages/CertDashboard';
import CertApplication from './pages/CertApplication';
import CredentialRegistry from './pages/CredentialRegistry';
import AccreditationDashboard from './pages/AccreditationDashboard';
import AuditTrail from './pages/AuditTrail';

function CertNav({ children }) {
  const user = getUser();
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <header className="bg-[#0f172a] border-b border-teal-500/20 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-xl font-black text-white">Q</div>
          <div>
            <div className="text-lg font-black tracking-tight">QualiCore <span className="text-teal-400">Certification</span></div>
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Professional Authority</div>
          </div>
        </div>
        <nav className="flex items-center gap-6">
          <a href="/dashboard" className="text-xs font-bold text-white/60 hover:text-teal-400 transition-colors">Dashboard</a>
          <a href="/apply" className="text-xs font-bold text-white/60 hover:text-teal-400 transition-colors">Apply</a>
          <a href="/registry" className="text-xs font-bold text-white/60 hover:text-teal-400 transition-colors">Registry</a>
          {user.role === 'admin' && <a href="/accreditation" className="text-xs font-bold text-white/60 hover:text-red-400 transition-colors">Accreditation</a>}
          {user.role === 'admin' && <a href="/audit" className="text-xs font-bold text-white/60 hover:text-red-400 transition-colors">Audit</a>}
          <div className="h-6 w-px bg-white/10 mx-1"></div>
          <span className="text-xs text-white/40">{user.email}</span>
          <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-teal-500/20 border border-white/10 text-xs font-bold transition-all">Logout</button>
        </nav>
      </header>
      <div className="p-8">{children}</div>
    </div>
  );
}

function App() {
  const user = getUser();
  const authed = isAuthenticated() && ['professional', 'admin'].includes(user.role);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<CertLogin />} />
        <Route path="/registry" element={<CertNav><CredentialRegistry /></CertNav>} />
        <Route path="/dashboard" element={authed ? <CertNav><CertDashboard /></CertNav> : <Navigate to="/login" replace />} />
        <Route path="/apply" element={authed ? <CertNav><CertApplication /></CertNav> : <Navigate to="/login" replace />} />
        <Route path="/accreditation" element={authed && user.role === 'admin' ? <CertNav><AccreditationDashboard /></CertNav> : <Navigate to="/login" replace />} />
        <Route path="/audit" element={authed && user.role === 'admin' ? <CertNav><AuditTrail /></CertNav> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={authed ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
