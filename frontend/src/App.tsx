import { useState, useEffect } from 'react';
import Lenis from 'lenis';
import {
  playTap,
  playSwitch,
  playDispatchLaunch,
  playStepTick,
  playDispatchComplete,
} from './utils/soundEffects';
import './App.css';

interface IntegrationStatus {
  id: 'hubspot' | 'slack' | 'gmail' | 'sheets' | 'twilio';
  name: string;
  connected: boolean;
  accountEmail?: string;
  connectedAt?: string;
}

interface Tenant {
  id: string;
  name: string;
  integrations: Record<string, IntegrationStatus>;
}

interface DispatchLog {
  id: string;
  timestamp: string;
  tenantId: string;
  callerName: string;
  callerContact: string;
  rawQuery: string;
  classification: {
    category: 'Billing' | 'Technical Support' | 'Sales Inquiry' | 'Emergency' | string;
    priority: 'low' | 'medium' | 'high' | 'urgent' | string;
    summary: string;
  };
  actionsTaken: {
    hubspotTicketId?: string;
    slackChannelNotified?: string;
    gmailSentTo?: string;
    sheetsRowAppended?: boolean;
  };
  status?: string;
}

const PRESET_SCENARIOS = [
  {
    label: 'Critical DB Outage',
    category: 'Emergency',
    callerName: 'Elena Rostova',
    callerContact: '+1 (555) 942-0199',
    query: 'Production database cluster eu-west-1 is experiencing severe connection timeouts and pod evictions. Emergency escalations required.',
  },
  {
    label: 'Invoice & Overcharge',
    category: 'Billing',
    callerName: 'Marcus Vance',
    callerContact: 'billing@vancecapital.org',
    query: 'We were billed twice for invoice #INV-8821 under our enterprise contract. Please issue an immediate credit memo.',
  },
  {
    label: 'Fleet Route Lost',
    category: 'Technical Support',
    callerName: 'Devon Lee',
    callerContact: '+1 (555) 338-7120',
    query: 'Vehicle telematics node 402 stopped streaming location telemetry. Drivers cannot acknowledge route dispatch.',
  },
  {
    label: 'Enterprise Demo',
    category: 'Sales Inquiry',
    callerName: 'Sophia Chen',
    callerContact: 'sophia.chen@globalreach.com',
    query: 'Looking to schedule a bespoke multi-tenant FastN voice dispatcher demo for our tier-1 operations team next Tuesday.',
  },
];

export default function App() {
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string>('tenant-a');
  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  const [logs, setLogs] = useState<DispatchLog[]>([]);

  // Simulation Form State
  const [callerName, setCallerName] = useState('Alex Rivers');
  const [callerContact, setCallerContact] = useState('+1 (555) 321-9876');
  const [rawQuery, setRawQuery] = useState(
    'Production database server is reporting critical latency spikes and failover warnings on main instance.'
  );
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStage, setDispatchStage] = useState<number>(0);

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'simulator' | 'connectors'>('simulator');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Initialize Lenis Smooth Scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.6,
    });

    let animationFrameId: number;
    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }
    animationFrameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, []);

  // Fetch Tenants
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

  // Fetch Active Tenant Data & Logs
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

  const handleApplyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    playTap();
    setCallerName(preset.callerName);
    setCallerContact(preset.callerContact);
    setRawQuery(preset.query);
  };

  const handleTriggerDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawQuery.trim() || isDispatching) return;

    playDispatchLaunch();
    setIsDispatching(true);
    setDispatchStage(1);
    playStepTick(1);

    const stageTimer1 = setTimeout(() => {
      setDispatchStage(2);
      playStepTick(2);
    }, 260);
    const stageTimer2 = setTimeout(() => {
      setDispatchStage(3);
      playStepTick(3);
    }, 520);
    const stageTimer3 = setTimeout(() => {
      setDispatchStage(4);
      playStepTick(4);
    }, 780);

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
        setExpandedLogId(resData.log.id);
        playDispatchComplete();
      }
    } catch (err) {
      console.error('Dispatch trigger failed:', err);
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setTimeout(() => {
        setIsDispatching(false);
        setDispatchStage(0);
      }, 400);
    }
  };

  const handleCopyId = (id: string) => {
    playTap();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredLogs = logs.filter(log => {
    const matchesCategory =
      selectedCategory === 'All' ||
      log.classification.category.toLowerCase() === selectedCategory.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      log.callerName.toLowerCase().includes(query) ||
      log.rawQuery.toLowerCase().includes(query) ||
      log.classification.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const activeTenantName =
    tenants.find(t => t.id === activeTenantId)?.name || 'Tenant';

  return (
    <div className="layout-shell">
      {/* Top Ambient Navigation Bar */}
      <header className="nav-bar">
        <div className="nav-brand">
          <div className="brand-symbol">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <div>
            <div className="brand-title-wrap">
              <span className="brand-name">AEGIS</span>
              <span className="brand-dot">/</span>
              <span className="brand-sub">AI Voice Dispatcher</span>
              <span className="brand-pill">FastN Embedded</span>
            </div>
            <p className="brand-desc">Multi-tenant automated voice ingestion, intent classification & connector routing</p>
          </div>
        </div>

        {/* Apple-style Segmented Tenant Switcher */}
        <div className="tenant-control-panel">
          <div className="tenant-status-pill">
            <span className="status-dot pulsing" />
            <span className="tenant-isolation-tag">Vault: {activeTenantName.split(' ')[0]}</span>
          </div>
          <div className="segmented-track" role="tablist" aria-label="Tenant Selector">
            {tenants.map(t => {
              const isActive = activeTenantId === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={isActive}
                  className={`segmented-pill ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    playSwitch();
                    setActiveTenantId(t.id);
                  }}
                >
                  <span className="tenant-pill-dot" />
                  <span className="tenant-pill-text">{t.name.replace(/\s*\(.*\)/, '')}</span>
                  <span className="tenant-pill-sub">{t.id === 'tenant-a' ? 'Acme' : 'Nexus'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="content-container">
        {/* Left Column: Interactive Simulation & Connectors */}
        <section className="left-panel">
          {/* Mode Switcher Tabs */}
          <div className="subnav-tabs">
            <button
              className={`subnav-btn ${activeTab === 'simulator' ? 'active' : ''}`}
              onClick={() => {
                playTap();
                setActiveTab('simulator');
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
              <span>Voice Simulation</span>
            </button>
            <button
              className={`subnav-btn ${activeTab === 'connectors' ? 'active' : ''}`}
              onClick={() => {
                playTap();
                setActiveTab('connectors');
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="8" x="2" y="2" rx="2" />
                <rect width="20" height="8" x="2" y="14" rx="2" />
                <line x1="6" x2="6.01" y1="6" y2="6" />
                <line x1="6" x2="6.01" y1="18" y2="18" />
              </svg>
              <span>FastN Connectors ({tenantData ? Object.keys(tenantData.integrations).length : 5})</span>
            </button>
          </div>

          {activeTab === 'simulator' ? (
            <div className="panel-card voice-card">
              {/* Card Header with Real-time Voice Waveform */}
              <div className="panel-header">
                <div>
                  <h2 className="panel-heading">Inbound Speech Dispatch</h2>
                  <p className="panel-subtext">Transcribed speech is classified by Claude AI and dispatched via FastN.</p>
                </div>
                {/* Visual Audio Waveform */}
                <div className={`audio-waveform ${isDispatching ? 'active' : ''}`}>
                  <span className="wave-bar bar-1" />
                  <span className="wave-bar bar-2" />
                  <span className="wave-bar bar-3" />
                  <span className="wave-bar bar-4" />
                  <span className="wave-bar bar-5" />
                </div>
              </div>

              {/* Quick Scenarios Bar */}
              <div className="scenario-section">
                <span className="scenario-label">Quick Presets</span>
                <div className="preset-chip-list">
                  {PRESET_SCENARIOS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="preset-chip"
                      onClick={() => handleApplyPreset(preset)}
                    >
                      <span className="chip-cat">{preset.category}</span>
                      <span className="chip-title">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation Trigger Form */}
              <form onSubmit={handleTriggerDispatch} className="voice-form">
                <div className="form-row-dual">
                  <div className="input-group">
                    <label className="input-label" htmlFor="caller-name">Caller Identifier</label>
                    <input
                      id="caller-name"
                      className="clean-input"
                      value={callerName}
                      onChange={e => setCallerName(e.target.value)}
                      placeholder="e.g. Alex Rivers"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="caller-contact">Return Contact</label>
                    <input
                      id="caller-contact"
                      className="clean-input"
                      value={callerContact}
                      onChange={e => setCallerContact(e.target.value)}
                      placeholder="Phone or Email"
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="raw-speech">
                    <span>Voice Transcription Content</span>
                    <span className="label-aux">Simulated Audio-to-Text</span>
                  </label>
                  <textarea
                    id="raw-speech"
                    className="clean-textarea"
                    rows={4}
                    value={rawQuery}
                    onChange={e => setRawQuery(e.target.value)}
                    placeholder="Transcribed voice stream..."
                    required
                  />
                </div>

                {/* Pipeline Progression Indicator */}
                {isDispatching && (
                  <div className="dispatch-stepper">
                    <div className={`step-item ${dispatchStage >= 1 ? 'active' : ''}`}>
                      <div className="step-circle">{dispatchStage > 1 ? '✓' : '1'}</div>
                      <span className="step-label">Twilio Ingest</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step-item ${dispatchStage >= 2 ? 'active' : ''}`}>
                      <div className="step-circle">{dispatchStage > 2 ? '✓' : '2'}</div>
                      <span className="step-label">Claude AI Extract</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step-item ${dispatchStage >= 3 ? 'active' : ''}`}>
                      <div className="step-circle">{dispatchStage > 3 ? '✓' : '3'}</div>
                      <span className="step-label">FastN Router</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step-item ${dispatchStage >= 4 ? 'active' : ''}`}>
                      <div className="step-circle">{dispatchStage >= 4 ? '✓' : '4'}</div>
                      <span className="step-label">Sync Connectors</span>
                    </div>
                  </div>
                )}

                {/* Main Submit Action */}
                <button
                  type="submit"
                  className={`dispatch-button ${isDispatching ? 'loading' : ''}`}
                  disabled={isDispatching}
                >
                  {isDispatching ? (
                    <span className="btn-contents">
                      <span className="spinner-ring" />
                      <span>Dispatching to FastN Vault...</span>
                    </span>
                  ) : (
                    <span className="btn-contents">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span>Simulate Inbound Voice Dispatch</span>
                    </span>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* FastN Connectors Panel */
            <div className="panel-card connectors-card">
              <div className="panel-header">
                <div>
                  <h2 className="panel-heading">Connected FastN Endpoints</h2>
                  <p className="panel-subtext">
                    All authentication tokens and dispatch streams are isolated to{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{activeTenantName}</strong>.
                  </p>
                </div>
                <div className="isolation-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Isolated</span>
                </div>
              </div>

              <div className="connectors-stack">
                {tenantData &&
                  Object.values(tenantData.integrations).map(intg => (
                    <div key={intg.id} className="connector-card">
                      <div className="connector-identity">
                        <div className="connector-icon-wrap">
                          {intg.id === 'hubspot' && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="3" />
                              <circle cx="19" cy="5" r="2" />
                              <circle cx="5" cy="19" r="2" />
                              <path d="m10.5 13.5-4 4" />
                              <path d="m13.5 10.5 4-4" />
                            </svg>
                          )}
                          {intg.id === 'slack' && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect width="3" height="8" x="14" y="2" rx="1.5" />
                              <path d="M10 2a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-3 0v-3A1.5 1.5 0 0 1 10 2z" />
                              <path d="M4 10a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 0 3h-3A1.5 1.5 0 0 1 4 10z" />
                              <rect width="8" height="3" x="2" y="14" rx="1.5" />
                            </svg>
                          )}
                          {intg.id === 'gmail' && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect width="20" height="16" x="2" y="4" rx="2" />
                              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                          )}
                          {intg.id === 'sheets' && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect width="18" height="18" x="3" y="3" rx="2" />
                              <line x1="3" x2="21" y1="9" y2="9" />
                              <line x1="3" x2="21" y1="15" y2="15" />
                              <line x1="9" x2="9" y1="3" y2="21" />
                            </svg>
                          )}
                          {intg.id === 'twilio' && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="connector-name">{intg.name}</div>
                          <div className="connector-account">
                            {intg.accountEmail || 'Unassigned channel'}
                          </div>
                        </div>
                      </div>

                      <div className="connector-meta-right">
                        <span className="live-status-pill">
                          <span className="status-indicator-dot" />
                          <span>Connected</span>
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Quick Metrics Strip */}
          <div className="metrics-strip">
            <div className="metric-box">
              <span className="metric-num">{logs.length}</span>
              <span className="metric-label">Calls Dispatched</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <span className="metric-num">5</span>
              <span className="metric-label">FastN Connectors</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <span className="metric-num">100%</span>
              <span className="metric-label">Data Isolation</span>
            </div>
          </div>
        </section>

        {/* Right Column: Live Dispatch Log & Event Stream */}
        <section className="right-panel">
          <div className="panel-card stream-card">
            {/* Stream Header */}
            <div className="stream-header-row">
              <div className="stream-title-group">
                <h2 className="panel-heading">Real-Time Event Stream</h2>
                <span className="event-count-badge">{filteredLogs.length} events</span>
              </div>
              {/* Category Filter Pills */}
              <div className="filter-chip-row">
                {['All', 'Emergency', 'Technical Support', 'Billing', 'Sales Inquiry'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => {
                      playTap();
                      setSelectedCategory(cat);
                    }}
                  >
                    {cat === 'Technical Support' ? 'Tech' : cat === 'Sales Inquiry' ? 'Sales' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Filter Search */}
            <div className="stream-search-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                className="search-input"
                placeholder="Filter by caller, keyword or classification..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                >
                  ×
                </button>
              )}
            </div>

            {/* Event List Feed */}
            {filteredLogs.length === 0 ? (
              <div className="empty-stream-state">
                <div className="empty-glyph">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" x2="12" y1="8" y2="12" />
                    <line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                </div>
                <h3 className="empty-title">No Voice Events In Stream</h3>
                <p className="empty-sub">
                  Trigger an inbound voice dispatch on the left to observe real-time classification and multi-tenant FastN connector routing.
                </p>
              </div>
            ) : (
              <div className="event-feed-scroll">
                {filteredLogs.map(log => {
                  const isExpanded = expandedLogId === log.id;
                  const categoryName = log.classification.category;
                  const isEmergency = categoryName.toLowerCase().includes('emergency');
                  const isBilling = categoryName.toLowerCase().includes('billing');
                  const isSales = categoryName.toLowerCase().includes('sales');

                  let categoryClass = 'cat-tech';
                  if (isEmergency) categoryClass = 'cat-emergency';
                  else if (isBilling) categoryClass = 'cat-billing';
                  else if (isSales) categoryClass = 'cat-sales';

                  return (
                    <article key={log.id} className={`event-card ${isExpanded ? 'expanded' : ''}`}>
                      {/* Top Meta Header */}
                      <div className="event-meta-bar">
                        <div className="event-tag-group">
                          <span className={`category-tag ${categoryClass}`}>
                            {log.classification.category}
                          </span>
                          <span className="priority-tag">
                            {log.classification.priority}
                          </span>
                        </div>
                        <div className="event-timestamp">
                          <span className="timestamp-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Caller Identification */}
                      <div className="caller-row">
                        <div className="caller-avatar">
                          {log.callerName
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="caller-text">
                          <span className="caller-name">{log.callerName}</span>
                          <span className="caller-contact">{log.callerContact}</span>
                        </div>
                      </div>

                      {/* Speech Excerpt Quote */}
                      <blockquote className="speech-quote">
                        "{log.rawQuery}"
                      </blockquote>

                      {/* Action Badges Output */}
                      <div className="action-badges-cluster">
                        {log.actionsTaken.hubspotTicketId && (
                          <div className="action-pill hubspot-pill">
                            <span className="pill-dot" />
                            <span>Ticket {log.actionsTaken.hubspotTicketId}</span>
                          </div>
                        )}
                        {log.actionsTaken.slackChannelNotified && (
                          <div className="action-pill slack-pill">
                            <span className="pill-dot" />
                            <span>Slack {log.actionsTaken.slackChannelNotified}</span>
                          </div>
                        )}
                        {log.actionsTaken.gmailSentTo && (
                          <div className="action-pill gmail-pill">
                            <span className="pill-dot" />
                            <span>Receipt Sent</span>
                          </div>
                        )}
                        {log.actionsTaken.sheetsRowAppended && (
                          <div className="action-pill sheets-pill">
                            <span className="pill-dot" />
                            <span>Audit Logged</span>
                          </div>
                        )}
                      </div>

                      {/* Inspector Toggle */}
                      <div className="expand-trigger-row">
                        <button
                          type="button"
                          className="expand-btn"
                          onClick={() => {
                            playTap();
                            setExpandedLogId(isExpanded ? null : log.id);
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            style={{
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 180ms ease-out',
                            }}
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          <span>{isExpanded ? 'Hide Payload Trace' : 'Inspect Dispatch Payload'}</span>
                        </button>

                        <button
                          type="button"
                          className="copy-id-btn"
                          onClick={() => handleCopyId(log.id)}
                        >
                          {copiedId === log.id ? 'Copied ✓' : log.id.slice(0, 14)}
                        </button>
                      </div>

                      {/* Structured JSON Payload Inspector */}
                      {isExpanded && (
                        <div className="payload-inspector">
                          <div className="inspector-bar">
                            <span className="inspector-label">FastN Event Dispatch Trace</span>
                            <span className="inspector-tenant">Tenant Vault: {log.tenantId}</span>
                          </div>
                          <pre className="inspector-pre">
                            {JSON.stringify(
                              {
                                id: log.id,
                                tenant: log.tenantId,
                                timestamp: log.timestamp,
                                classification: log.classification,
                                dispatchedConnectors: log.actionsTaken,
                                status: log.status || 'dispatched',
                              },
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
