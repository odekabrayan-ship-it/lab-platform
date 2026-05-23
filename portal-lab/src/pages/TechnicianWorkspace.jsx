import WorkspaceFrame from "../components/WorkspaceFrame";
import LabDashboard from "./LabDashboard";
import BatchResultEntry from "./BatchResultEntry";
import ReagentManager from "./ReagentManager";
import EnvironmentLogs from "./EnvironmentLogs";

export default function TechnicianWorkspace() {
    const tabs = [
        { key: "QUEUE", label: "📋 Active Queue", component: <LabDashboard /> },
        { key: "RUNS", label: "📊 Analytical Runs", component: <BatchResultEntry /> },
        { key: "REAGENTS", label: "🧪 Reagent Inventory", component: <ReagentManager /> },
        { key: "HYGIENE", label: "🧹 Sanitization Logs", component: <EnvironmentLogs /> }
    ];

    return (
        <WorkspaceFrame 
            title="Scientific Bench" 
            icon="🔬" 
            tabs={tabs} 
        />
    );
}
