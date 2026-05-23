import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser, isAuthenticated } from './services/auth';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminNexus from './pages/SuperAdminNexus';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminInvitations from './pages/AdminInvitations';
import AdminDirectory from './pages/AdminDirectory';
import AdminRegistry from './pages/AdminRegistry';
import AdminAccreditation from './pages/AdminAccreditation';
import AdminTreasury from './pages/AdminTreasury';
import RegistryManagement from './pages/RegistryManagement';

function AdminNav({ children }) {
  const user = getUser();
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <header className="bg-[#0f172a] border-b border-red-500/20 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-xl font-black text-white">Q</div>
          <div>
            <div className="text-lg font-black tracking-tight">QualiCore <span className="text-red-500">Admin</span></div>
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Platform Governance</div>
          </div>
        </div>
        <nav className="flex items-center gap-4">
          <a href="/nexus" className="text-xs font-bold text-white/60 hover:text-red-400 transition-colors">Nexus</a>
          <a href="/dashboard" className="text-xs font-bold text-white/60 hover:text-red-400 transition-colors">Registry</a>
          <a href="/users" className="text-xs font-bold text-white/60 hover:text-red-400 transition-colors">Users</a>
          <a href="/invitations" className="text-xs font-bold text-white/60 hover:text-red-400 transition-colors">Invitations</a>
          <a href="/accreditation" className="text-xs font-bold text-white/60 hover:text-red-400 transition-colors">Accreditation</a>
          <a href="/treasury" className="text-xs font-bold text-white/60 hover:text-red-400 transition-colors">Treasury</a>
          <div className="h-6 w-px bg-white/10 mx-2"></div>
          <span className="text-xs text-white/40">{user.email}</span>
          <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">{user.sub_role || 'ADMIN'}</span>
          <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 text-xs font-bold transition-all">Logout</button>
        </nav>
      </header>
      <div className="p-8">{children}</div>
    </div>
  );
}

function App() {
  const user = getUser();
  const authed = isAuthenticated() && user.role === 'admin';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/nexus" element={authed ? <AdminNav><SuperAdminNexus /></AdminNav> : <Navigate to="/login" replace />} />
        <Route path="/dashboard" element={authed ? <AdminNav><AdminDashboard /></AdminNav> : <Navigate to="/login" replace />} />
        <Route path="/super-dashboard" element={authed ? <AdminNav><SuperAdminDashboard /></AdminNav> : <Navigate to="/login" replace />} />
        <Route path="/users" element={authed ? <AdminNav><AdminUserManagement /></AdminNav> : <Navigate to="/login" replace />} />
        <Route path="/invitations" element={authed ? <AdminNav><AdminInvitations /></AdminNav> : <Navigate to="/login" replace />} />
        <Route path="/directory" element={authed ? <AdminNav><AdminDirectory /></AdminNav> : <Navigate to="/login" replace />} />
        <Route path="/registry" element={authed ? <AdminNav><AdminRegistry /></AdminNav> : <Navigate to="/login" replace />} />
        <Route path="/accreditation" element={authed ? <AdminNav><AdminAccreditation /></AdminNav> : <Navigate to="/login" replace />} />
        <Route path="/treasury" element={authed ? <AdminNav><AdminTreasury /></AdminNav> : <Navigate to="/login" replace />} />
        <Route path="/registry-management" element={authed ? <AdminNav><RegistryManagement /></AdminNav> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={authed ? '/nexus' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
