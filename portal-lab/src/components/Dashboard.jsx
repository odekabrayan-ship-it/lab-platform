import React, { useState } from 'react';
import LabDashboard from '../pages/LabDashboard';
import SampleRegistration from '../pages/SampleRegistration';
import ResultEntry from '../pages/ResultEntry';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('requests');

  return (
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh' }}>
      <header className="header">
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>QualiCore System</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{user?.email} ({user?.role})</span>
          <button className="secondary" onClick={onLogout}>Sign Out</button>
        </div>
      </header>

      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <button className={activeTab === 'requests' ? '' : 'secondary'} onClick={() => setActiveTab('requests')}>Lab Dashboard</button>
          <button className={activeTab === 'samples' ? '' : 'secondary'} onClick={() => setActiveTab('samples')}>Sample Management</button>
          <button className={activeTab === 'results' ? '' : 'secondary'} onClick={() => setActiveTab('results')}>Result Entry</button>
        </div>

        {activeTab === 'requests' && <LabDashboard />}
        {activeTab === 'samples' && <SampleManagement />}
        {activeTab === 'results' && <ResultEntry />}
      </div>
    </div>
  );
}

function RequestLifecycle() {
  const [isCreating, setIsCreating] = useState(false);

  if (isCreating) {
    return (
      <div>
        <button className="secondary" style={{ marginBottom: '16px' }} onClick={() => setIsCreating(false)}>← Back to Dashboard</button>
        <CreateRequest />
      </div>
    );
  }

  return (
    <div className="clinical-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Request Lifecycle Dashboard</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select defaultValue="">
            <option value="">Filter by Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <input type="date" />
          <button onClick={() => setIsCreating(true)}>New Request</button>
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Client</th>
            <th>Lab</th>
            <th>Date Created</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>REQ-001</td>
            <td>BuildCorp Inc.</td>
            <td>Main Test Lab</td>
            <td>2026-04-23</td>
            <td><span className="badge pending">Pending</span></td>
            <td><button className="secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>View</button></td>
          </tr>
          <tr>
            <td>REQ-002</td>
            <td>FoodSafety Co.</td>
            <td>Bio Lab Alpha</td>
            <td>2026-04-22</td>
            <td><span className="badge in_progress">In Progress</span></td>
            <td><button className="secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>View</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SampleManagement() {
  const [isCreating, setIsCreating] = useState(false);

  if (isCreating) {
    return <SampleRegistration onBack={() => setIsCreating(false)} />;
  }

  return (
    <div className="clinical-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Sample Management</h3>
        <button onClick={() => setIsCreating(true)}>+ Register New Sample</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Sample ID</th>
            <th>Request Ref</th>
            <th>Received At</th>
            <th>Status Tracking</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SMP-9091</td>
            <td>REQ-001</td>
            <td>2026-04-23 10:15 AM</td>
            <td>Awaiting Testing</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


