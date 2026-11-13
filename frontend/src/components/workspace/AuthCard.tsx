import { useState, useEffect } from 'react';
import type { AuthStatus, PublicUser } from '../../types';
import { api, ApiError } from '../../lib/api';
import { Pill, Spinner } from '../ui';
import { CheckIcon, ShieldIcon } from '../Icons';

export function AuthCard() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const loadStatus = async () => {
    try {
      const res = await api.getAuthStatus();
      setStatus(res);
      setError(null);
    } catch (err) {
      console.warn('Failed to load auth status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.setupAuth({ email, password, name });
      setStatus({ initialized: true, user: res.user });
      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Setup failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.login({ email, password });
      setStatus({ initialized: true, user: res.user });
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setSubmitting(true);
    try {
      await api.logout();
      setStatus(curr => curr ? { ...curr, user: null } : null);
    } catch (err) {
      console.warn('Logout failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="settings-card compact">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
          <Spinner />
          <span>Checking security perimeter…</span>
        </div>
      </section>
    );
  }

  const currentUser: PublicUser | null = status?.user ?? null;
  const isInitialized = status?.initialized ?? false;

  return (
    <section className="settings-card compact">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <ShieldIcon size={16} />
          <span>Operator Authentication</span>
        </h3>
        {currentUser ? (
          <Pill tone="ok">{currentUser.role.toUpperCase()}</Pill>
        ) : (
          <Pill tone={isInitialized ? 'warn' : 'muted'}>{isInitialized ? 'Locked' : 'Uninitialized'}</Pill>
        )}
      </div>

      {currentUser ? (
        <div>
          <p className="settings-copy" style={{ marginBottom: '0.75rem' }}>
            Authenticated on-server via SQLite session cookie.
          </p>
          <div style={{ background: 'var(--bg-surface-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 650, color: 'var(--text-primary)' }}>{currentUser.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{currentUser.email}</div>
          </div>
          <button
            type="button"
            className="button button-quiet button-small"
            onClick={() => void handleLogout()}
            disabled={submitting}
          >
            {submitting ? <Spinner /> : 'Log out operator'}
          </button>
        </div>
      ) : !isInitialized ? (
        <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <p className="settings-copy">
            No admin account configured. Create the initial administrator to lock the workspace perimeter.
          </p>
          {error ? <div style={{ color: 'var(--c-copper)', fontSize: '12px' }}>{error}</div> : null}
          <input
            className="input"
            placeholder="Operator name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            className="input"
            type="email"
            placeholder="admin@yourcompany.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="button button-dark button-small" disabled={submitting}>
            {submitting ? <Spinner /> : <CheckIcon size={14} />}
            <span>Create Admin & Sign in</span>
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <p className="settings-copy">
            Workspace is locked. Sign in with your operator credentials to manage targets and dispatch.
          </p>
          {error ? <div style={{ color: 'var(--c-copper)', fontSize: '12px' }}>{error}</div> : null}
          <input
            className="input"
            type="email"
            placeholder="Operator email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="button button-dark button-small" disabled={submitting}>
            {submitting ? <Spinner /> : <CheckIcon size={14} />}
            <span>Sign in to Workspace</span>
          </button>
        </form>
      )}
    </section>
  );
}
