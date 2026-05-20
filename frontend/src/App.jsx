import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavLayout from "./components/NavLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CompleteProfile from "./pages/CompleteProfile";
import CompleteLabProfile from "./pages/CompleteLabProfile";
import LabCapabilities from "./pages/LabCapabilities";
import EngagementManager from "./pages/EngagementManager";
import ActiveNetwork from "./pages/ActiveNetwork";
import LabDiscovery from "./pages/LabDiscovery";
import CreateRequest from "./pages/CreateRequest";
import LabDashboard from "./pages/LabDashboard";
import CompanyDashboard from "./pages/CompanyDashboard";
import BrandPortfolio from "./pages/BrandPortfolio";
import SampleRegistration from "./pages/SampleRegistration";
import SampleDetail from "./pages/SampleDetail";
import ResultEntry from "./pages/ResultEntry";
import AdminDashboard from "./pages/AdminDashboard";
import DocumentVault from "./pages/DocumentVault";
import BillingCenter from "./pages/BillingCenter";
import DisputeCenter from "./pages/DisputeCenter";
import TeamManagement from "./pages/TeamManagement";
import QuoteManager from "./pages/QuoteManager";
import EquipmentManager from "./pages/EquipmentManager";
import QualityOversight from "./pages/QualityOversight";
import LabTeamManagement from "./pages/LabTeamManagement";
import BatchResultEntry from "./pages/BatchResultEntry";
import QualityQueue from "./pages/QualityQueue";
import MethodManager from "./pages/MethodManager";
import StorageManager from "./pages/StorageManager";
import ReagentManager from "./pages/ReagentManager";
import LabMarketplace from "./pages/LabMarketplace";
import ProfessionalProfile from "./pages/ProfessionalProfile";
import TalentMarketplace from "./pages/TalentMarketplace";
import RFQMarketplace from "./pages/RFQMarketplace";
import DirectIntake from "./pages/DirectIntake";
import AccountantDashboard from "./pages/AccountantDashboard";
import ProcurementManager from "./pages/ProcurementManager";
import OperationalAudit from "./pages/OperationalAudit";
import StaffMatrix from "./pages/StaffMatrix";
import ReportVerification from "./pages/ReportVerification";
import HRDashboard from "./pages/HRDashboard";
import TreasurySettings from "./pages/TreasurySettings";
import SpecificationLibrary from "./pages/SpecificationLibrary";
import PlantOperations from "./pages/PlantOperations";
import InternalIntake from "./pages/InternalIntake";
import InternalBench from "./pages/InternalBench";
import InternalValidation from "./pages/InternalValidation";
import InternalStaffing from "./pages/InternalStaffing";
import BenchMaintenance from "./pages/BenchMaintenance";
import EnvironmentalSentinel from "./pages/EnvironmentalSentinel";
import InternalCAPA from "./pages/InternalCAPA";
import RegistryManagement from "./pages/RegistryManagement";
import SuperAdminNexus from "./pages/SuperAdminNexus";
import EnvironmentLogs from "./pages/EnvironmentLogs";
import TechnicianWorkspace from "./pages/TechnicianWorkspace";
import ManagerWorkspace from "./pages/ManagerWorkspace";
import AdminDirectory from "./pages/AdminDirectory";
import AdminRegistry from "./pages/AdminRegistry";
import AdminAccreditation from "./pages/AdminAccreditation";
import AdminTreasury from "./pages/AdminTreasury";
import QualityLedger from "./pages/QualityLedger";
import ControlChart from "./pages/ControlChart";
import RiskRegister from "./pages/RiskRegister";
import ProficiencyTesting from "./pages/ProficiencyTesting";
import DocumentControl from "./pages/DocumentControl";
import CompetencyAssessment from "./pages/CompetencyAssessment";
import BatchRelease from "./pages/BatchRelease";
import ConsumerHub from "./pages/ConsumerHub";
import TrustAccelerator from "./pages/TrustAccelerator";
import SealCommandCenter from "./pages/SealCommandCenter";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import OversightSentinel from "./components/OversightSentinel";
import './index.css';

function App() {
  let user = {};
  let isAuthenticated = !!localStorage.getItem("token");
  try {
    const userString = localStorage.getItem("user");
    if (userString && userString !== "undefined") {
      user = JSON.parse(userString);
    }
  } catch (e) {
    console.error("Corrupted localStorage state, clearing...", e);
    localStorage.clear();
    isAuthenticated = false;
  }

  // Role-based default redirect with Life-Cycle Awareness
  const getDefaultRoute = () => {
    if (!isAuthenticated) return "/login";
    
    // Status-based redirection
    if (user.role === "lab") {
      if (user.verification_status === 'NEW') return "/complete-lab-profile";
      if (user.verification_status === 'PENDING_REVIEW') return "/dashboard"; // Shows "Under Review" state
      return "/dashboard";
    }

    if (user.role === "client") {
      if (user.verification_status === 'NEW') return "/complete-profile";
      return "/company-dashboard";
    }

    if (user.role === "professional") {
      if (user.verification_status === 'NEW') return "/professional-profile";
      return "/professional-profile";
    }


    if (user.role === "admin") return "/admin/nexus";

    if (user.role === "consumer") return "/consumer-hub";
    
    return "/dashboard";
  };

  return (
    <BrowserRouter>
      <OversightSentinel />
      <Routes>
        <Route path="/verify/:code" element={<ReportVerification />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/consumer-hub" element={isAuthenticated ? <ConsumerHub /> : <Navigate to="/login" />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/complete-lab-profile" element={<CompleteLabProfile />} />
        <Route path="/lab-capabilities" element={<LabCapabilities />} />

        {/* Protected Routes */}
        <Route element={isAuthenticated ? <NavLayout /> : <Navigate to="/login" replace />}>

          {/* ── Client Routes ── */}
          <Route path="/company-dashboard" element={<CompanyDashboard />} />
          <Route path="/brand-portfolio"   element={<BrandPortfolio />} />
          <Route path="/trust-accelerator" element={<TrustAccelerator />} />
          <Route path="/seal-command"      element={<SealCommandCenter />} />
          <Route path="/rfqs"              element={<RFQMarketplace />} />
          <Route path="/vault"             element={<DocumentVault />} />
          <Route path="/billing"           element={<BillingCenter />} />
          <Route path="/disputes"          element={<DisputeCenter />} />
          <Route path="/explore"           element={<LabDiscovery />} />
          <Route path="/network"           element={<ActiveNetwork />} />
          <Route path="/create-request"    element={<CreateRequest />} />
          <Route path="/team"              element={<TeamManagement />} />
          <Route path="/quotes"            element={<QuoteManager />} />
          <Route path="/specs"             element={<SpecificationLibrary />} />
          <Route path="/plant-operations"  element={<PlantOperations />} />
          <Route path="/internal-intake"   element={<InternalIntake />} />
          <Route path="/internal-bench"    element={<InternalBench />} />
          <Route path="/internal-validation" element={<InternalValidation />} />
          <Route path="/internal-staffing" element={<InternalStaffing />} />
          <Route path="/bench-maintenance" element={<BenchMaintenance />} />
          <Route path="/environmental-sentinel" element={<EnvironmentalSentinel />} />
          <Route path="/internal-capa"     element={<InternalCAPA />} />

          {/* ── Lab Routes ── */}
          <Route path="/dashboard"         element={<LabDashboard />} />
          <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
          <Route path="/workspace/technician" element={<TechnicianWorkspace />} />
          <Route path="/workspace/manager"    element={<ManagerWorkspace />} />
          <Route path="/engagements"       element={<EngagementManager />} />
          <Route path="/direct-intake"     element={<DirectIntake />} />
          <Route path="/finance"           element={<AccountantDashboard />} />
          <Route path="/quality-oversight" element={<QualityQueue />} />
          <Route path="/procurement"       element={<ProcurementManager />} />
          <Route path="/samples"           element={<SampleRegistration />} />
          <Route path="/samples/request/:id" element={<SampleDetail />} />
          <Route path="/results"           element={<ResultEntry />} />
          <Route path="/billing"           element={<BillingCenter />} />
          <Route path="/disputes"          element={<DisputeCenter />} />
          <Route path="/quotes"            element={<QuoteManager />} />
          <Route path="/equipment"         element={<EquipmentManager />} />
          <Route path="/quality"           element={<QualityOversight />} />
          <Route path="/lab-team"          element={<LabTeamManagement />} />
          <Route path="/results/batch"     element={<BatchResultEntry />} />
          <Route path="/quality-queue"     element={<QualityQueue />} />
          <Route path="/methods"           element={<MethodManager />} />
          <Route path="/storage"           element={<StorageManager />} />
          <Route path="/reagents"          element={<ReagentManager />} />
          <Route path="/marketplace"       element={<LabMarketplace />} />
          <Route path="/talent-marketplace" element={<TalentMarketplace />} />
          <Route path="/quality-ledger"    element={<QualityLedger />} />
          <Route path="/control-chart"     element={<ControlChart />} />
          <Route path="/risk-register"     element={<RiskRegister />} />
          <Route path="/proficiency-testing" element={<ProficiencyTesting />} />
          <Route path="/document-control"  element={<DocumentControl />} />
          <Route path="/competency-assessment" element={<CompetencyAssessment />} />
          <Route path="/batch-release"       element={<BatchRelease />} />
          <Route path="/professional-profile" element={<ProfessionalProfile />} />
          <Route path="/audit"             element={<OperationalAudit />} />
          <Route path="/matrix"            element={<StaffMatrix />} />
          <Route path="/hr-dashboard"      element={<HRDashboard />} />
          <Route path="/hr/jobs"           element={<HRDashboard activeSection="postings" />} />
          <Route path="/hr/applications"   element={<HRDashboard activeSection="apps" />} />
          <Route path="/hr/professionals"  element={<HRDashboard activeSection="pool" />} />
          <Route path="/treasury-settings" element={<TreasurySettings />} />
          <Route path="/operational-audit" element={<OperationalAudit />} />
          <Route path="/staff-matrix"      element={<StaffMatrix />} />
          <Route path="/rfq-marketplace"   element={<RFQMarketplace />} />
          <Route path="/logs/:type"        element={<EnvironmentLogs />} />
          <Route path="/tat-radar"         element={<LabDashboard />} />

          {/* ── Admin Routes ── */}
          <Route path="/admin"             element={<AdminDashboard />} />
          <Route path="/admin/nexus"       element={<SuperAdminNexus />} />
          <Route path="/admin/directory"   element={<AdminDirectory />} />
          <Route path="/admin/registry"    element={<AdminRegistry />} />
          <Route path="/admin/accreditation" element={<AdminAccreditation />} />
          <Route path="/admin/treasury"    element={<AdminTreasury />} />
        </Route>

        {/* Fallback: redirect to role-appropriate home */}
        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
        <Route path="/"  element={<Navigate to={getDefaultRoute()} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
