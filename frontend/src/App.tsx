import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, KeyboardEvent } from 'react';
import Lenis from 'lenis';
import {
  playTap,
  playSwitch,
  playDispatchLaunch,
  playStepTick,
  playDispatchComplete,
} from './utils/soundEffects';
import { VoicePlayback } from './components/VoicePlayback';
import {
  getConnectionMode,
  loadDispatchLogs,
  loadTenant,
  loadTenants,
  resetSandbox,
  setIntegration,
  triggerDispatch,
} from './lib/api';
import type {
  ConnectionMode,
  DispatchLog,
  IntegrationId,
  IntegrationStatus,
  LeftTab,
  Tenant,
  TenantSummary,
} from './types';
import './App.css';

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

const CATEGORY_FILTERS = ['All', 'Emergency', 'Technical Support', 'Billing', 'Sales Inquiry'];
const WORKSPACE_TABS: LeftTab[] = ['simulator', 'connectors'];
const DEFAULT_TENANTS: TenantSummary[] = [
  { id: 'tenant-a', name: 'Tenant A (Acme Corp)' },
  { id: 'tenant-b', name: 'Tenant B (Nexus Logistics)' },
];

type VaultStatus = 'loading' | 'ready' | 'error';

interface VaultSnapshot {
  tenantId: string;
  tenant: Tenant | null;
  logs: DispatchLog[];
  status: VaultStatus;
}

function timestampNow(): string {
  return new Date().toISOString();
}

function readInitialTenant(): string {
  const tenant = new URLSearchParams(window.location.search).get('tenant');
  return tenant && /^[a-z0-9-]+$/i.test(tenant) ? tenant : 'tenant-a';
}

function readInitialTab(): LeftTab {
  return new URLSearchParams(window.location.search).get('tab') === 'connectors'
    ? 'connectors'
    : 'simulator';
}

function splitTenantName(name: string): { label: string; alias: string } {
  const match = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return match ? { label: match[1], alias: match[2] } : { label: name, alias: name };
}

function ConnectorGlyph({ id }: { id: IntegrationId }) {
  if (id === 'hubspot') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <circle cx="19" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
        <path d="m10.5 13.5-4 4" />
        <path d="m13.5 10.5 4-4" />
      </svg>
    );
  }
  if (id === 'slack') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect width="3" height="8" x="14" y="2" rx="1.5" />
        <path d="M10 2a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-3 0v-3A1.5 1.5 0 0 1 10 2z" />
        <path d="M4 10a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 0 3h-3A1.5 1.5 0 0 1 4 10z" />
        <rect width="8" height="3" x="2" y="14" rx="1.5" />
      </svg>
    );
  }
  if (id === 'gmail') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    );
  }
  if (id === 'sheets') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <line x1="3" x2="21" y1="9" y2="9" />
        <line x1="3" x2="21" y1="15" y2="15" />
        <line x1="9" x2="9" y1="3" y2="21" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export default function App() {
  const [tenants, setTenants] = useState<TenantSummary[]>(DEFAULT_TENANTS);
  const [activeTenantId, setActiveTenantId] = useState<string>(readInitialTenant);
  const [vault, setVault] = useState<VaultSnapshot>(() => ({
    tenantId: readInitialTenant(),
    tenant: null,
    logs: [],
    status: 'loading',
  }));
  const [vaultEpoch, setVaultEpoch] = useState(0);
  const [mode, setMode] = useState<ConnectionMode | 'connecting'>('connecting');

  // Simulation form state
  const [callerName, setCallerName] = useState('Alex Rivers');
  const [callerContact, setCallerContact] = useState('+1 (555) 321-9876');
  const [rawQuery, setRawQuery] = useState(
    'Production database server is reporting critical latency spikes and failover warnings on main instance.'
  );
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStage, setDispatchStage] = useState<number>(0);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchNotice, setDispatchNotice] = useState<{
    kind: 'partial' | 'failed';
    message: string;
  } | null>(null);

  // Filter, search and tab state
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LeftTab>(readInitialTab);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Browser speech recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const activeTenantRef = useRef(activeTenantId);
  const stageTimersRef = useRef<number[]>([]);

  useEffect(() => {
    activeTenantRef.current = activeTenantId;
  }, [activeTenantId]);

  useEffect(
    () => () => {
      stageTimersRef.current.forEach(timer => window.clearTimeout(timer));
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    },
    [],
  );

  // Lenis smooth scrolling (respect reduced-motion preference)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
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

  // Keep tenant and tab choices shareable through the URL
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tenant', activeTenantId);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url);
  }, [activeTenantId, activeTab]);

  // Resolve tenant directory once, validating deep links
  useEffect(() => {
    let cancelled = false;
    loadTenants().then(list => {
      if (cancelled) return;
      setTenants(list);
      setMode(getConnectionMode());
      setActiveTenantId(previous =>
        list.some(tenant => tenant.id === previous) ? previous : list[0].id,
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load only the active vault. The snapshot is keyed by tenant, so stale data
  // from a previous tenant can never render while the next fetch is in flight.
  useEffect(() => {
    let cancelled = false;

    Promise.all([loadTenant(activeTenantId), loadDispatchLogs(activeTenantId)])
      .then(([tenant, nextLogs]) => {
        if (cancelled || activeTenantRef.current !== activeTenantId) return;
        setVault({ tenantId: activeTenantId, tenant, logs: nextLogs, status: 'ready' });
        setMode(getConnectionMode());
      })
      .catch(() => {
        if (cancelled || activeTenantRef.current !== activeTenantId) return;
        setVault({ tenantId: activeTenantId, tenant: null, logs: [], status: 'error' });
        setMode(getConnectionMode());
      });

    return () => {
      cancelled = true;
    };
  }, [activeTenantId, vaultEpoch]);

  const selectTenant = (tenantId: string) => {
    if (tenantId === activeTenantId) return;
    activeTenantRef.current = tenantId;
    setActiveTenantId(tenantId);
    setVault({ tenantId, tenant: null, logs: [], status: 'loading' });
    setExpandedLogId(null);
    setSelectedCategory('All');
    setSearchQuery('');
    setDispatchError(null);
    setDispatchNotice(null);
  };

  const handleToggleListen = () => {
    playTap();
    setSpeechError(null);

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognitionClass =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setRawQuery(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          setSpeechError(`Microphone notice: ${event.error || 'could not capture speech'}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setSpeechError('Could not access microphone. Please check browser permissions.');
      setIsListening(false);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    playTap();
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
    setCallerName(preset.callerName);
    setCallerContact(preset.callerContact);
    setRawQuery(preset.query);
    setDispatchError(null);
    setDispatchNotice(null);
    setSpeechError(null);
  };

  const handleTriggerDispatch = async (event: FormEvent) => {
    event.preventDefault();
    if (!rawQuery.trim() || isDispatching) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }

    const dispatchTenantId = activeTenantId;
    playDispatchLaunch();
    setIsDispatching(true);
    setDispatchError(null);
    setDispatchNotice(null);
    setDispatchStage(1);
    playStepTick(1);

    stageTimersRef.current = [
      window.setTimeout(() => {
        setDispatchStage(2);
        playStepTick(2);
      }, 260),
      window.setTimeout(() => {
        setDispatchStage(3);
        playStepTick(3);
      }, 520),
      window.setTimeout(() => {
        setDispatchStage(4);
        playStepTick(4);
      }, 780),
    ];

    try {
      const log = await triggerDispatch({
        tenantId: dispatchTenantId,
        callerName,
        callerContact,
        rawQuery,
      });
      setMode(getConnectionMode());

      if (activeTenantRef.current === dispatchTenantId) {
        setVault(current =>
          current.tenantId === dispatchTenantId
            ? {
                ...current,
                logs: [log, ...current.logs.filter(item => item.id !== log.id)],
              }
            : current,
        );
        setExpandedLogId(log.id);
        setSelectedCategory('All');
        setSearchQuery('');

        if (log.status === 'failed') {
          setDispatchNotice({
            kind: 'failed',
            message:
              'No connector action completed. This dispatch is logged as failed — inspect the payload trace for the upstream reason.',
          });
        } else if (log.status === 'partial') {
          setDispatchNotice({
            kind: 'partial',
            message:
              'Dispatch partially completed. Some connectors did not confirm — inspect the payload trace for per-connector results.',
          });
          playDispatchComplete();
        } else {
          setDispatchNotice(null);
          playDispatchComplete();
        }
      }
    } catch (error) {
      if (activeTenantRef.current === dispatchTenantId) {
        setDispatchError(
          error instanceof Error && error.message
            ? error.message
            : 'Dispatch could not reach the connector API. Please try again.',
        );
      }
    } finally {
      stageTimersRef.current.forEach(timer => window.clearTimeout(timer));
      stageTimersRef.current = [];
      window.setTimeout(() => {
        setIsDispatching(false);
        setDispatchStage(0);
      }, 400);
    }
  };

  const handleToggleIntegration = async (integration: IntegrationStatus) => {
    if (!tenantData) return;

    playTap();
    const ownerId = tenantData.id;
    const connected = !integration.connected;

    setVault(current => {
      if (current.tenantId !== ownerId || !current.tenant) return current;
      return {
        ...current,
        tenant: {
          ...current.tenant,
          integrations: {
            ...current.tenant.integrations,
            [integration.id]: {
              ...integration,
              connected,
              connectedAt: connected ? timestampNow() : undefined,
            },
          },
        },
      };
    });

    const updated = await setIntegration(
      ownerId,
      integration.id,
      connected,
      integration.accountEmail,
    );
    setMode(getConnectionMode());

    if (updated && activeTenantRef.current === ownerId) {
      setVault(current =>
        current.tenantId === ownerId ? { ...current, tenant: updated } : current,
      );
    }
  };

  const handleCopyId = (id: string) => {
    playTap();
    navigator.clipboard.writeText(id).catch(() => {});
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  const handleWorkspaceKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = WORKSPACE_TABS.indexOf(activeTab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % WORKSPACE_TABS.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + WORKSPACE_TABS.length) % WORKSPACE_TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = WORKSPACE_TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = WORKSPACE_TABS[nextIndex];
    playTap();
    setActiveTab(nextTab);
    document.getElementById(`workspace-tab-${nextTab}`)?.focus();
  };

  const handleTenantKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (tenants.length < 2) return;
    const currentIndex = Math.max(0, tenants.findIndex(tenant => tenant.id === activeTenantId));
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tenants.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + tenants.length) % tenants.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tenants.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTenant = tenants[nextIndex];
    playSwitch();
    selectTenant(nextTenant.id);
    document.getElementById(`tenant-tab-${nextTenant.id}`)?.focus();
  };

  const handleResetSandbox = () => {
    playTap();
    resetSandbox();
    setActiveTab('simulator');
    setSelectedCategory('All');
    setSearchQuery('');
    setExpandedLogId(null);
    setDispatchError(null);
    setDispatchNotice(null);
    setVault({ tenantId: 'tenant-a', tenant: null, logs: [], status: 'loading' });
    setVaultEpoch(previous => previous + 1);
    if (activeTenantId !== 'tenant-a') {
      activeTenantRef.current = 'tenant-a';
      setActiveTenantId('tenant-a');
    }
  };

  const isVaultCurrent = vault.tenantId === activeTenantId;
  const tenantData = isVaultCurrent ? vault.tenant : null;
  const logs = isVaultCurrent ? vault.logs : [];
  const isTenantLoading = !isVaultCurrent || vault.status === 'loading';

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
    tenants.find(tenant => tenant.id === activeTenantId)?.name || 'Tenant';
  const activeTenantParts = splitTenantName(activeTenantName);
  const activeTenantIndex = Math.max(
    0,
    tenants.findIndex(tenant => tenant.id === activeTenantId),
  );
  const integrationList = tenantData ? Object.values(tenantData.integrations) : [];
  const connectedCount = integrationList.filter(integration => integration.connected).length;
  const isFiltering = selectedCategory !== 'All' || searchQuery.trim().length > 0;

  const modeLabel =
    mode === 'live' ? 'Live API' : mode === 'demo' ? 'Demo Sandbox' : 'Connecting';
  const modeTitle =
    mode === 'live'
      ? 'Connected to the Express dispatch API'
      : mode === 'demo'
        ? 'Running the in-browser sandbox vault. Deploy notes live in the README.'
        : 'Resolving the dispatch API';

  return (
    <div className="layout-shell">
      <header className="nav-bar">
        <div className="nav-brand">
          <div className="brand-symbol">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
            <p className="brand-desc">Multi-tenant automated voice ingestion, intent classification &amp; connector routing</p>
          </div>
        </div>

        <div className="tenant-control-panel">
          <span className={`mode-pill ${mode}`} title={modeTitle}>
            <span className="mode-dot" />
            {modeLabel}
          </span>

          <div className="tenant-status-pill">
            <span className="status-dot pulsing" />
            <span className="tenant-isolation-tag">Vault: {activeTenantParts.alias}</span>
          </div>

          <div
            className="segmented-track"
            role="tablist"
            aria-label="Tenant vault"
            style={
              {
                '--tab-count': Math.max(tenants.length, 1),
                '--tab-index': activeTenantIndex,
              } as CSSProperties
            }
          >
            <span className="segmented-thumb" aria-hidden="true" />
            {tenants.map(tenant => {
              const isActive = activeTenantId === tenant.id;
              const parts = splitTenantName(tenant.name);
              return (
                <button
                  key={tenant.id}
                  id={`tenant-tab-${tenant.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="tenant-vault-panel"
                  tabIndex={isActive ? 0 : -1}
                  className={`segmented-pill ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (isActive) return;
                    playSwitch();
                    selectTenant(tenant.id);
                  }}
                  onKeyDown={handleTenantKeyDown}
                >
                  <span className="tenant-pill-dot" aria-hidden="true" />
                  <span className="tenant-pill-text">{parts.label}</span>
                  <span className="tenant-pill-sub">{parts.alias}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main
        className="content-container"
        id="tenant-vault-panel"
        role="tabpanel"
        aria-labelledby={`tenant-tab-${activeTenantId}`}
        tabIndex={-1}
      >
        <section className="left-panel" aria-label="Dispatch workspace">
          <div className="subnav-tabs" role="tablist" aria-label="Workspace view">
            <button
              id="workspace-tab-simulator"
              type="button"
              role="tab"
              aria-selected={activeTab === 'simulator'}
              aria-controls="workspace-panel-simulator"
              tabIndex={activeTab === 'simulator' ? 0 : -1}
              className={`subnav-btn ${activeTab === 'simulator' ? 'active' : ''}`}
              onClick={() => {
                playTap();
                setActiveTab('simulator');
              }}
              onKeyDown={handleWorkspaceKeyDown}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
              <span>Voice Simulation</span>
            </button>
            <button
              id="workspace-tab-connectors"
              type="button"
              role="tab"
              aria-selected={activeTab === 'connectors'}
              aria-controls="workspace-panel-connectors"
              tabIndex={activeTab === 'connectors' ? 0 : -1}
              className={`subnav-btn ${activeTab === 'connectors' ? 'active' : ''}`}
              onClick={() => {
                playTap();
                setActiveTab('connectors');
              }}
              onKeyDown={handleWorkspaceKeyDown}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="20" height="8" x="2" y="2" rx="2" />
                <rect width="20" height="8" x="2" y="14" rx="2" />
                <line x1="6" x2="6.01" y1="6" y2="6" />
                <line x1="6" x2="6.01" y1="18" y2="18" />
              </svg>
              <span>FastN Connectors</span>
              <span className="subnav-count">{integrationList.length || 5}</span>
            </button>
          </div>

          <div className="tab-stage">
            <div
              id="workspace-panel-simulator"
              className="tab-panel"
              role="tabpanel"
              aria-labelledby="workspace-tab-simulator"
              hidden={activeTab !== 'simulator'}
            >
              <div className="panel-card voice-card">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-heading">Inbound Speech Dispatch</h2>
                    <p className="panel-subtext">Transcribed speech is classified by Claude AI and dispatched via FastN.</p>
                  </div>
                  <div
                    className={`audio-waveform ${isDispatching || isListening ? 'active' : ''}`}
                    aria-hidden="true"
                    title={isListening ? 'Microphone active · listening to speech' : isDispatching ? 'Listening · dispatch in progress' : 'Voice channel idle'}
                  >
                    <span className="wave-bar bar-1" />
                    <span className="wave-bar bar-2" />
                    <span className="wave-bar bar-3" />
                    <span className="wave-bar bar-4" />
                    <span className="wave-bar bar-5" />
                  </div>
                </div>

                <div className="scenario-section">
                  <span className="scenario-label">Quick Presets</span>
                  <div className="preset-chip-list">
                    {PRESET_SCENARIOS.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        className="preset-chip"
                        onClick={() => handleApplyPreset(preset)}
                        aria-label={`Apply ${preset.label} preset`}
                      >
                        <span className="chip-cat">{preset.category}</span>
                        <span className="chip-title">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleTriggerDispatch} className="voice-form">
                  <div className="form-row-dual">
                    <div className="input-group">
                      <label className="input-label" htmlFor="caller-name">Caller Identifier</label>
                      <input
                        id="caller-name"
                        className="clean-input"
                        value={callerName}
                        onChange={event => setCallerName(event.target.value)}
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
                        onChange={event => setCallerContact(event.target.value)}
                        placeholder="Phone or Email"
                        required
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <div className="input-label-row">
                      <label className="input-label" htmlFor="raw-speech">
                        <span>Voice Transcription Content</span>
                        <span className="label-aux">Live Dictation / Audio-to-Text</span>
                      </label>
                      <button
                        type="button"
                        className={`mic-dictate-btn ${isListening ? 'listening' : ''}`}
                        onClick={handleToggleListen}
                        aria-pressed={isListening}
                        aria-label={isListening ? 'Stop microphone listening' : 'Start microphone speech input'}
                        title={isListening ? 'Click to stop listening' : 'Click to speak via microphone'}
                      >
                        <span className="mic-dot" aria-hidden="true" />
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" x2="12" y1="19" y2="22" />
                        </svg>
                        <span>{isListening ? 'Listening...' : 'Speak to Mic'}</span>
                      </button>
                    </div>
                    <textarea
                      id="raw-speech"
                      className={`clean-textarea ${isListening ? 'recording-border' : ''}`}
                      rows={4}
                      value={rawQuery}
                      onChange={event => setRawQuery(event.target.value)}
                      placeholder={isListening ? 'Listening to your speech in real-time...' : 'Transcribed voice stream...'}
                      required
                    />
                    {speechError && (
                      <p className="mic-error-notice" role="alert">{speechError}</p>
                    )}
                  </div>

                  {isDispatching && (
                    <div className="dispatch-stepper" role="status" aria-live="polite">
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

                  {dispatchError && (
                    <p className="form-error" role="alert">{dispatchError}</p>
                  )}

                  {dispatchNotice && (
                    <p className={`dispatch-notice ${dispatchNotice.kind}`} role="status">
                      {dispatchNotice.message}
                    </p>
                  )}

                  <button
                    type="submit"
                    className={`dispatch-button ${isDispatching ? 'loading' : ''}`}
                    disabled={isDispatching}
                    aria-busy={isDispatching}
                  >
                    {isDispatching ? (
                      <span className="btn-contents">
                        <span className="spinner-ring" />
                        <span>Dispatching to FastN Vault...</span>
                      </span>
                    ) : (
                      <span className="btn-contents">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>Simulate Inbound Voice Dispatch</span>
                      </span>
                    )}
                  </button>
                </form>
              </div>

              <VoicePlayback text={rawQuery} />
            </div>

            <div
              id="workspace-panel-connectors"
              className="tab-panel"
              role="tabpanel"
              aria-labelledby="workspace-tab-connectors"
              hidden={activeTab !== 'connectors'}
            >
              <div className="panel-card connectors-card">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-heading">Connected FastN Endpoints</h2>
                    <p className="panel-subtext">
                      Tokens and dispatch streams are isolated to{' '}
                      <strong className="inline-strong">{activeTenantName}</strong>. Toggle a connector to watch routing adapt.
                    </p>
                  </div>
                  <div className="connector-header-meta">
                    <span className="connector-live-count">
                      {tenantData ? `${connectedCount}/${integrationList.length} live` : 'Syncing…'}
                    </span>
                    <div className="isolation-badge">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>Isolated</span>
                    </div>
                  </div>
                </div>

                {!tenantData ? (
                  <div className="connector-skeleton-stack" role="status" aria-live="polite">
                    <span className="sr-only">Loading isolated connectors</span>
                    {[0, 1, 2, 3, 4].map(index => (
                      <div key={index} className="connector-skeleton" aria-hidden="true">
                        <span className="skeleton-icon" />
                        <span className="skeleton-lines">
                          <span className="skeleton-line wide" />
                          <span className="skeleton-line narrow" />
                        </span>
                        <span className="skeleton-pill" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="connectors-stack">
                    {integrationList.map(integration => (
                      <div key={integration.id} className={`connector-card ${integration.connected ? '' : 'paused'}`}>
                        <div className="connector-identity">
                          <div className="connector-icon-wrap">
                            <ConnectorGlyph id={integration.id} />
                          </div>
                          <div>
                            <div className="connector-name">{integration.name}</div>
                            <div className="connector-account">
                              {integration.accountEmail || 'Unassigned channel'}
                            </div>
                          </div>
                        </div>

                        <div className="connector-meta-right">
                          <span className={`live-status-pill ${integration.connected ? 'is-connected' : 'is-disconnected'}`}>
                            <span className="status-indicator-dot" aria-hidden="true" />
                            <span>{integration.connected ? 'Connected' : 'Paused'}</span>
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={integration.connected}
                            aria-label={`${integration.connected ? 'Pause' : 'Resume'} ${integration.name}`}
                            className={`connector-switch ${integration.connected ? 'on' : ''}`}
                            onClick={() => handleToggleIntegration(integration)}
                          >
                            <span className="switch-thumb" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="connectors-hint">
                  Paused endpoints are skipped by the dispatcher until re-enabled.
                </p>
              </div>
            </div>
          </div>

          <div className="metrics-strip">
            <div className="metric-box">
              <span className="metric-num">{logs.length}</span>
              <span className="metric-label">Calls Dispatched</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <span className="metric-num">{tenantData ? connectedCount : 5}</span>
              <span className="metric-label">Active Connectors</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-box">
              <span className="metric-num">100%</span>
              <span className="metric-label">Data Isolation</span>
            </div>
          </div>
        </section>

        <section className="right-panel" aria-label="Live dispatch event stream">
          <div className="panel-card stream-card">
            <div className="stream-header-row">
              <div className="stream-title-group">
                <h2 className="panel-heading">Real-Time Event Stream</h2>
                <span className="event-count-badge">
                  {isFiltering ? `${filteredLogs.length}/${logs.length}` : logs.length}{' '}
                  {!isFiltering && logs.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              <div className="filter-chip-row" role="group" aria-label="Filter by category">
                {CATEGORY_FILTERS.map(category => (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={selectedCategory === category}
                    className={`filter-chip ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => {
                      playTap();
                      setSelectedCategory(category);
                    }}
                  >
                    {category === 'Technical Support' ? 'Tech' : category === 'Sales Inquiry' ? 'Sales' : category}
                  </button>
                ))}
              </div>
            </div>

            <div className="stream-search-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                className="search-input"
                placeholder="Filter by caller, keyword or classification..."
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                aria-label="Filter dispatches"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    playTap();
                    setSearchQuery('');
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {isTenantLoading ? (
              <div className="stream-loading" role="status" aria-live="polite">
                <span className="loading-ring" aria-hidden="true" />
                <span>Syncing {activeTenantParts.alias} vault...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="empty-stream-state">
                <div className="empty-glyph">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" x2="12" y1="8" y2="12" />
                    <line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                </div>
                <h3 className="empty-title">No Voice Events In Stream</h3>
                <p className="empty-sub">
                  Trigger an inbound voice dispatch on the left to observe real-time classification and multi-tenant FastN connector routing.
                </p>
                <button
                  type="button"
                  className="empty-action-btn"
                  onClick={() => {
                    playTap();
                    setActiveTab('simulator');
                  }}
                >
                  Open the simulator
                </button>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="empty-stream-state compact">
                <div className="empty-glyph">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <h3 className="empty-title">No Matching Events</h3>
                <p className="empty-sub">
                  No dispatches in {activeTenantParts.alias} match this filter. Try another category or clear the search.
                </p>
                <button
                  type="button"
                  className="empty-action-btn"
                  onClick={() => {
                    playTap();
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="event-feed-scroll" data-lenis-prevent>
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
                      <div className="event-meta-bar">
                        <div className="event-tag-group">
                          <span className={`category-tag ${categoryClass}`}>
                            {log.classification.category}
                          </span>
                          <span className="priority-tag">
                            {log.classification.priority}
                          </span>
                          {log.actionsTaken.mode === 'simulated' && (
                            <span className="mode-badge simulated" title="Executed in the browser sandbox, not against FastN">
                              Sandbox
                            </span>
                          )}
                          {log.status === 'partial' && (
                            <span className="status-badge partial">Partial</span>
                          )}
                          {log.status === 'failed' && (
                            <span className="status-badge failed">Failed</span>
                          )}
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

                      <div className="caller-row">
                        <div className="caller-avatar">
                          {log.callerName
                            .split(' ')
                            .map(name => name[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="caller-text">
                          <span className="caller-name">{log.callerName}</span>
                          <span className="caller-contact">{log.callerContact}</span>
                        </div>
                      </div>

                      <blockquote className="speech-quote">
                        "{log.rawQuery}"
                      </blockquote>

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

                      <div className="expand-trigger-row">
                        <button
                          type="button"
                          className="expand-btn"
                          onClick={() => {
                            playTap();
                            setExpandedLogId(isExpanded ? null : log.id);
                          }}
                          aria-expanded={isExpanded}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            aria-hidden="true"
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
                          aria-label={`Copy dispatch id ${log.id}`}
                        >
                          {copiedId === log.id ? 'Copied ✓' : log.id.slice(0, 14)}
                        </button>
                      </div>

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
                                mode: log.actionsTaken.mode ?? 'simulated',
                                classification: log.classification,
                                dispatchedConnectors: log.actionsTaken,
                                results: log.actionsTaken.results ?? [],
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

      <footer className="site-footer">
        <div className="footer-brand">
          <span className="footer-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </span>
          <span><strong>AEGIS</strong> · Voice dispatch infrastructure for multi-tenant SaaS.</span>
        </div>
        <div className="footer-meta">
          <span>FastN Online Hackathon 2026</span>
          <span className="footer-dot" aria-hidden="true" />
          <a href="https://github.com/Chendline/ai-voice-dispatcher" target="_blank" rel="noreferrer">
            Source
          </a>
          {mode === 'demo' && (
            <>
              <span className="footer-dot" aria-hidden="true" />
              <button type="button" className="footer-btn" onClick={handleResetSandbox}>
                Reset sandbox
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
