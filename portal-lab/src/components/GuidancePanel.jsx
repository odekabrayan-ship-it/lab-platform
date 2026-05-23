import React from 'react';

const GUIDANCE = {
    // Laboratory Roles
    'DIRECTOR': {
        title: 'Strategic Oversight (Director)',
        text: 'As the Lab Director, you hold sovereign authority. Your primary duties are appointing HR leadership, configuring Treasury settings for direct settlement, and monitoring global performance analytics.',
        icon: '🏛️',
        actions: ['Appoint HR Manager', 'Configure Bank/M-Pesa', 'Audit Revenue']
    },
    'HR_MANAGER': {
        title: 'Human Capital Management',
        text: 'You manage the organizational structure. Your role is to hire the Lab Manager and operational staff, and place Talent Requisitions to the Super Admin for specialized experts.',
        icon: '💼',
        actions: ['Hire Lab Manager', 'Sourcing Requests', 'Manage Staff Matrix']
    },
    'LAB_MANAGER': {
        title: 'Technical Operations Oversight',
        text: 'You are responsible for technical integrity. You triage incoming requests, assign work to Technicians, and perform the final Quality Review before digitally signing and releasing the CoA.',
        icon: '🔬',
        actions: ['Assign Work Orders', 'Perform Quality Review', 'Authorize CoA Release']
    },
    'LAB_TECHNICIAN': {
        title: 'Technical Bench Analyst',
        text: 'You perform the core analytical work. Your duty is to enter precise sample results, record reagent lots and controls, and submit work orders for managerial oversight.',
        icon: '🧪',
        actions: ['Enter Test Results', 'Record Batch Controls', 'Submit for Review']
    },
    'REGISTRAR': {
        title: 'Accessioning & Intake Registrar',
        text: 'You manage the sample gateway. Your responsibilities include digital request review, physical sample reception (Logistics Handshake), and sample labeling.',
        icon: '📥',
        actions: ['Review Digital Intake', 'Confirm Physical Receipt', 'Label Samples']
    },
    'ACCOUNTANT': {
        title: 'Financial Sovereignty Officer',
        text: 'You manage the Lab Ledger. Your role is to verify client payments, manage the settlement pipeline, and ensure all technical work is financially cleared for release.',
        icon: '💳',
        actions: ['Verify Ledger Payments', 'Audit Invoices', 'Track Treasury Growth']
    },
    // Client Role
    'CLIENT': {
        title: 'Client Portal Operations',
        text: 'You manage your company\'s testing needs. Create test requests, dispatch physical samples via the Logistics Hub, and retrieve digitally signed Certificates of Analysis (CoA).',
        icon: '🏢',
        actions: ['Create Test Requests', 'Dispatch Shipments', 'Download Signed CoAs']
    },
    // Admin Role
    'ADMIN': {
        title: 'Super Admin Governance',
        text: 'You maintain ecosystem integrity. Your role involves verifying laboratory accreditations, sourcing talent for HR requisitions, and overseeing the national quality ledger.',
        icon: '🛡️',
        actions: ['Verify ISO Credentials', 'Source Talent Requests', 'Audit Global Ledger']
    }
};

export default function GuidancePanel({ role, subRole }) {
    const key = subRole || role.toUpperCase();
    const info = GUIDANCE[key] || GUIDANCE[subRole] || (role === 'client' ? GUIDANCE.CLIENT : (role === 'admin' ? GUIDANCE.ADMIN : GUIDANCE.DIRECTOR));

    if (!info) return null;

    return (
        <div className="glass-panel border-l-4 border-blue-500 bg-blue-500/5 mb-8 animate-slide-down">
            <div className="flex gap-4 items-start">
                <div className="text-3xl">{info.icon}</div>
                <div className="flex-1">
                    <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-1">Standard Operating Procedure: {info.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">{info.text}</p>
                    <div className="flex gap-2">
                        {info.actions.map(action => (
                            <span key={action} className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 font-bold uppercase">
                                ✓ {action}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">ROLE_AUTH_ACTIVE</div>
            </div>
        </div>
    );
}
