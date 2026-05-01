import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell";

// ── Sidebar section component ────────────────────────────────────────────────
function SidebarSection({ label, children }) {
  return (
    <div className="sidebar-section">
      <p className="sidebar-section-label">{label}</p>
      {children}
    </div>
  );
}

function SidebarLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
    >
      {children}
    </NavLink>
  );
}

// ── User avatar pill ─────────────────────────────────────────────────────────
function UserPill({ user }) {
  const initials = user.email ? user.email.substring(0, 2).toUpperCase() : "??";
  const roleColors = {
    client: { bg: '#eff6ff', color: '#1d4ed8', label: 'Company' },
    lab:    { bg: '#f0fdf4', color: '#166534', label: 'Laboratory' },
    admin:  { bg: '#fef3c7', color: '#92400e', label: 'Admin' },
  };
  const rc = roleColors[user.role] || { bg: '#f1f5f9', color: '#475569', label: user.role };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: rc.bg, color: rc.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0
      }}>{initials}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
          <span style={{ background: rc.bg, color: rc.color, padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>
            {user.sub_role ? user.sub_role.replace('_', ' ') : rc.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NavLayout() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const mode = localStorage.getItem("nexus_engine") || "EXTERNAL";
  
  // Perspective Engine: Allows Admins to view the UI from different roles
  const [perspective, setPerspective] = useState(
    user.role === 'admin' ? (localStorage.getItem("admin_perspective") || "admin") : user.role
  );

  const handlePerspectiveChange = (newRole) => {
    localStorage.setItem("admin_perspective", newRole);
    setPerspective(newRole);
    
    // Auto-redirect to the landing page of that role
    const routes = {
      admin: "/admin/nexus",
      lab_registrar: "/dashboard",
      lab_technician: "/workspace/technician",
      lab_manager: "/workspace/manager",
      lab_quality: "/quality",
      lab_accountant: "/billing",
      client: "/company-dashboard"
    };
    navigate(routes[newRole] || "/");
  };

  // ─── WORKSPACE CONFIGURATION (Institutional Blueprint) ───
  const WORKSPACES = {
    admin: {
      label: "🏛️ Sovereign Governance",
      sections: [
        {
          label: "Global Nexus",
          links: [
            { to: "/admin/nexus", label: "🏛️ Global Control" },
            { to: "/admin", label: "🛡️ Ecosystem Registry" },
            { to: "/admin/registry", label: "🌍 Public Registry" }
          ]
        }
      ]
    },
    lab_registrar: {
      label: "📥 Sample Accessioning",
      sections: [
        {
          label: "Intake Operations",
          links: [
            { to: "/dashboard", label: "📋 Active Queue" },
            { to: "/direct-intake", label: "📥 Direct Intake" },
            { to: "/storage", label: "📦 Cold Chain Vault" }
          ]
        },
        {
          label: "Environmental Logs",
          links: [
              { to: "/logs/intake", label: "🌡️ Intake Environment" }
          ]
        }
      ]
    },
    lab_technician: {
      label: "🔬 Scientific Bench",
      sections: [
        {
          label: "Primary Operations",
          links: [
            { to: "/workspace/technician", label: "🔬 Bench Workspace" },
            { to: "/samples", label: "🧪 Specimen Registry" }
          ]
        },
        {
          label: "Logistics",
          links: [
              { to: "/storage", label: "📦 Cold Chain Vault" }
          ]
        }
      ]
    },
    lab_manager: {
      label: "⚖️ Command Center",
      sections: [
        {
          label: "Executive Oversight",
          links: [
            { to: "/workspace/manager", label: "⚖️ Manager Cockpit" },
            { to: "/quality-ledger", label: "🛡️ Quality Ledger" },
            { to: "/dashboard", label: "📊 Institutional Queue" }
          ]
        },
        {
          label: "Human Capital",
          links: [
            { to: "/lab-team", label: "👥 Team Roster" }
          ]
        }
      ]
    },
    lab_quality: {
      label: "🛡️ Compliance Vault",
      sections: [
        {
          label: "Quality Assurance",
          links: [
            { to: "/quality", label: "🚩 CAPA Management" },
            { to: "/operational-audit", label: "📜 Audit Ledger" }
          ]
        },
        {
          label: "Metrology & Methods",
          links: [
            { to: "/equipment", label: "🔬 Asset Registry" },
            { to: "/methods", label: "📜 Analytical SOPs" },
            { to: "/logs/sentinel", label: "🌡️ Sentinel Logs" }
          ]
        }
      ]
    },
    lab_accountant: {
      label: "💰 Treasury Ledger",
      sections: [
        {
          label: "Financial Operations",
          links: [
            { to: "/billing", label: "💳 Invoicing Center" },
            { to: "/finance", label: "💰 Revenue Intelligence" },
            { to: "/disputes", label: "⚖️ Dispute Center" }
          ]
        },
        {
          label: "Procurement Hub",
          links: [
            { to: "/procurement", label: "📦 Supply Chain" },
            { to: "/quotes", label: "💼 Quote Registry" }
          ]
        }
      ]
    },
    client: {
        label: "📊 Executive Cockpit",
        sections: [
            {
                label: "Strategic Oversight",
                links: [
                    { to: "/company-dashboard", label: "📊 Cockpit Dashboard" },
                    { to: "/specs", label: "📚 Product Specs" }
                ]
            },
            {
                label: "Analytical Radar",
                links: [
                    { to: "/dashboard", label: "📋 Active Orders" },
                    { to: "/create-request", label: "➕ Initialize Order" }
                ]
            },
            {
                label: "Digital Records",
                links: [
                    { to: "/vault", label: "📁 Certification Vault" },
                    { to: "/billing", label: "💳 Settlement Center" }
                ]
            }
        ]
    }
  };

  // Determine active workspace key
  const getActiveWorkspaceKey = () => {
    if (user.role === 'admin') return perspective;
    if (user.role === 'client') return 'client';
    if (user.role === 'lab') {
        const subMap = {
            'REGISTRAR': 'lab_registrar',
            'TECHNICIAN': 'lab_technician',
            'LAB_MANAGER': 'lab_manager',
            'QUALITY_MANAGER': 'lab_quality',
            'ACCOUNTANT': 'lab_accountant'
        };
        return subMap[user.sub_role] || 'lab_manager';
    }
    return perspective;
  };

  const activeWorkspace = WORKSPACES[getActiveWorkspaceKey()] || WORKSPACES.lab_manager;

  return (
    <div className="nav-layout bg-soft min-h-screen">
      {/* ── Top Header (Sentinel Bar) ─────────────────────────────────────── */}
      <header className="header">
        <div className="sentinel-bar">
          <div className="flex items-center gap-4">
            <span className="text-2xl drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">🛡️</span>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter text-white leading-none">QualiCore <span className="text-blue-500">Sentinel</span></span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Enterprise Oversight Engine</span>
            </div>
          </div>
          
          <div className="h-8 w-[1px] bg-white/10 mx-2" />

          <div className="sentinel-item">
            <span className="sentinel-label">System Mode</span>
            <div className="sentinel-value">
              <span className={`w-2 h-2 rounded-full animate-pulse ${mode === 'PLANT' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-blue-500 shadow-[0_0_8px_#3b82f6]'}`} />
              {mode === 'PLANT' ? 'Sovereign Internal QC' : 'Global Supply Chain'}
            </div>
          </div>

          <div className="sentinel-item hidden md:flex">
            <span className="sentinel-label">Security Protocol</span>
            <div className="sentinel-value text-emerald-400">ISO-17025 ACTIVE</div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {user.role === 'client' && (
            <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10 shadow-2xl">
              <button 
                onClick={() => { localStorage.setItem("nexus_engine", "EXTERNAL"); window.location.href = "/company-dashboard"; }}
                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${mode === 'EXTERNAL' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}
              >
                🌐 External
              </button>
              <button 
                onClick={() => { localStorage.setItem("nexus_engine", "PLANT"); window.location.href = "/plant-operations"; }}
                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${mode === 'PLANT' ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}
              >
                🏗️ Plant QC
              </button>
            </div>
          )}

          <div className="flex items-center gap-6 pl-8 border-l border-white/10">
            <NotificationBell />
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-white">{user.email}</span>
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none mt-1">{user.sub_role || user.role}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 flex items-center justify-center transition-all group"
              title="Terminate Session"
            >
              <span className="group-hover:scale-110 transition-transform text-lg">🚪</span>
            </button>
          </div>
        </div>
      </header>

      <div className="nav-body">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <nav className="sidebar" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 56px)' }}>


          {/* ─── PERSPECTIVE SELECTOR (Admin Only) ─── */}
          {user.role === 'admin' && (
            <div className="p-4 mb-4 bg-indigo-500/10 border-b border-indigo-500/20">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-3 block">Perspective Engine</label>
              <select 
                value={perspective} 
                onChange={(e) => handlePerspectiveChange(e.target.value)}
                className="w-full bg-slate-900 border border-indigo-500/30 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-indigo-500"
              >
                <option value="admin">🏛️ Sovereign Governance (Admin)</option>
                <option value="lab_registrar">📥 Sample Accessioning (Registrar)</option>
                <option value="lab_technician">🔬 Scientific Bench (Technician)</option>
                <option value="lab_manager">⚖️ Command Center (Manager)</option>
                <option value="lab_quality">🛡️ Compliance Vault (Quality)</option>
                <option value="lab_accountant">💰 Treasury Ledger (Accountant)</option>
                <option value="client">📊 Executive Cockpit (Client)</option>
              </select>
            </div>
          )}

          {/* ─── DYNAMIC WORKSPACE SIDEBAR ─── */}
          <div className="p-4 mb-2">
              <h2 className="text-xs font-black uppercase tracking-tighter text-blue-500">{activeWorkspace.label}</h2>
          </div>

          {activeWorkspace.sections.map((section, idx) => (
              <SidebarSection key={idx} label={section.label}>
                  {section.links.map(link => (
                      <SidebarLink key={link.to} to={link.to}>{link.label}</SidebarLink>
                  ))}
              </SidebarSection>
          ))}

          {/* ─── User Pill at bottom ─── */}
          <div style={{ flex: 1 }} />
          <UserPill user={user} />
        </nav>

        {/* ── Page Content ──────────────────────────────────────────────────── */}
        <main className="page-content animate-fade-in" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
