import WorkspaceFrame from "../components/WorkspaceFrame";
import LabDashboard from "./LabDashboard";
import QualityQueue from "./QualityQueue";
import StaffMatrix from "./StaffMatrix";

export default function ManagerWorkspace() {
    const tabs = [
        { key: "DASHBOARD", label: "🏠 Command Cockpit", component: <LabDashboard /> },
        { key: "QUALITY", label: "🛡️ Quality Oversight", component: <QualityQueue /> },
        { key: "STAFF", label: "🛡️ Staff Matrix", component: <StaffMatrix /> },
        { key: "AUDIT", label: "📜 Audit Ledger", component: <div className="p-8 text-slate-500">Audit Ledger Integration Pending...</div> }
    ];

    return (
        <WorkspaceFrame 
            title="Command Center" 
            icon="⚖️" 
            tabs={tabs} 
        />
    );
}
