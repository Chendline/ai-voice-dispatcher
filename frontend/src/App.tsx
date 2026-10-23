import { useState, useEffect } from 'react';
import './App.css';

interface IntegrationStatus {
  id: string;
  name: string;
  connected: boolean;
  accountEmail?: string;
}

interface Tenant {
  id: string;
  name: string;
  integrations: Record<string, IntegrationStatus>;
}

interface DispatchLog {
  id: string;
  timestamp: string;
  callerName: string;
  callerContact: string;
  rawQuery: string;
  classification: {
    category: string;
    priority: string;
    summary: string;
  };
  actionsTaken: {
    hubspotTicketId?: string;
    slackChannelNotified?: string;
    gmailSentTo?: string;
    sheetsRowAppended?: boolean;
  };
}

export default function App() {
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string>('tenant-a');
  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  const [logs, setLogs] = useState<DispatchLog[]>([]);

  // Simulation Form State
  const [callerName, setCallerName] = useState('Alex Rivers');
  const [callerContact, setCallerContact] = useState('+1 (555) 321-9876');
  const [rawQuery, setRawQuery] = useState('Our database server is showing critical high latency and down alerts!');
  const [isDispatching, setIsDispatching] = useState(false);

  // Fetch Tenants List
  useEffect(() => {
    fetch('http://localhost:3001/api/tenants')
      .then(res => res.json())
      .then(data => {
        if (data.tenants) {
          setTenants(data.tenants);
        }
      })
      .catch(err => console.error('Failed to load tenants:', err));
  }, []);

  // Fetch Current Tenant Data & Logs
  useEffect(() => {
    if (!activeTenantId) return;

    fetch(`http://localhost:3001/api/tenants/${activeTenantId}`)
      .then(res => res.json())
      .then(data => setTenantData(data))
      .catch(err => console.error('Error fetching tenant:', err));

    fetch(`http://localhost:3001/api/tenants/${activeTenantId}/logs`)
      .then(res => res.json())
      .then(data => setLogs(data.logs || []))
      .catch(err => console.error('Error fetching logs:', err));
  }, [activeTenantId]);

  const handleTriggerDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawQuery.trim()) return;

    setIsDispatching(true);
    try {
      const response = await fetch('http://localhost:3001/api/dispatch/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: activeTenantId,
          callerName,
          callerContact,
          rawQuery,
        }),
      });

      const resData = await response.json();
      if (resData.success && resData.log) {
        setLogs(prev => [resData.log, ...prev]);
      }
    } catch (err) {
      console.error('Dispatch trigger failed:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const getCategoryClass = (category: string) => {
    return `category-tag category-${category.replace(/\s+/g, '')}`;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">🎙️</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="brand-title">AI Voice Agent Dispatcher</h1>
              <span className="brand-tag">Fastn Hackathon 2026</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Embedded multi-tenant voice routing, CRM sync & incident dispatch
            </p>
          </div>
        </div>

        {/* Tenant Switcher (The 2-Tenant Test) */}
        <div className="tenant-selector-bar">
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>TENANT:</span>
          {tenants.map(t => (
            <button
              key={t.id}
              className={`tenant-pill ${activeTenantId === t.id ? 'active' : ''}`}
              onClick={() => setActiveTenantId(t.id)}
            >
              <div className="tenant-indicator" />
              {t.name}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="dashboard-grid">
        {/* Left Column: Integrations & Fastn Connect Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section className="glass-card">
            <div className="card-header">
              <h2 className="card-title">
                <span>🔌</span> Connected Accounts (Fastn Embedded)
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                Isolated to {tenantData?.name.split(' ')[0]}
              </span>
            </div>

            <div className="integrations-grid">
              {tenantData &&
                Object.values(tenantData.integrations).map(intg => (
                  <div key={intg.id} className="integration-row">
                    <div className="integration-info">
                      <div className="integration-logo-badge">
                        {intg.id === 'hubspot' && '🟠'}
                        {intg.id === 'slack' && '💬'}
                        {intg.id === 'gmail' && '✉️'}
                        {intg.id === 'sheets' && '📊'}
                        {intg.id === 'twilio' && '📞'}
                      </div>
                      <div>
                        <div className="integration-name">{intg.name}</div>
                        <div className="integration-meta">{intg.accountEmail || 'Not configured'}</div>
                      </div>
                    </div>
                    <span className="badge-connected">✓ Connected</span>
                  </div>
                ))}
            </div>
          </section>

          {/* Voice Dispatch Simulator */}
          <section className="glass-card">
            <div className="card-header">
              <h2 className="card-title">
                <span>⚡</span> Inbound Voice Trigger Simulator
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', fontWeight: 600 }}>
                Claude AI Classifier
              </span>
            </div>

            <form className="simulator-form" onSubmit={handleTriggerDispatch}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Caller Name</label>
                  <input
                    className="form-input"
                    value={callerName}
                    onChange={e => setCallerName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact (Phone / Email)</label>
                  <input
                    className="form-input"
                    value={callerContact}
                    onChange={e => setCallerContact(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Incoming Speech / Request Transcription</label>
                <textarea
                  className="form-textarea"
                  value={rawQuery}
                  onChange={e => setRawQuery(e.target.value)}
                  placeholder="e.g. I need a refund on invoice #4810 or The production server is down"
                  required
                />
              </div>

              <button type="submit" className="btn-trigger" disabled={isDispatching}>
                {isDispatching ? '⚡ AI Agent Dispatching...' : 'Simulate Inbound Voice Call'}
              </button>
            </form>
          </section>
        </div>

        {/* Right Column: Real-time Dispatch Logs */}
        <div>
          <section className="glass-card" style={{ height: '100%' }}>
            <div className="card-header">
              <h2 className="card-title">
                <span>📋</span> Live Dispatch Event Log
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {logs.length} events logged
              </span>
            </div>

            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                No dispatch events yet for {tenantData?.name}.<br />
                Trigger an inbound call to test data isolation!
              </div>
            ) : (
              <div className="log-stream">
                {logs.map(log => (
                  <div key={log.id} className="log-item">
                    <div className="log-top">
                      <span className={getCategoryClass(log.classification.category)}>
                        {log.classification.category}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
                      {log.callerName} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({log.callerContact})</span>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: '1.4' }}>
                      "{log.rawQuery}"
                    </p>

                    <div className="log-actions">
                      {log.actionsTaken.hubspotTicketId && (
                        <span className="action-pill">HubSpot: {log.actionsTaken.hubspotTicketId}</span>
                      )}
                      {log.actionsTaken.slackChannelNotified && (
                        <span className="action-pill">Slack: {log.actionsTaken.slackChannelNotified}</span>
                      )}
                      {log.actionsTaken.gmailSentTo && (
                        <span className="action-pill">Gmail: {log.actionsTaken.gmailSentTo}</span>
                      )}
                      {log.actionsTaken.sheetsRowAppended && (
                        <span className="action-pill">Google Sheets: Logged ✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
