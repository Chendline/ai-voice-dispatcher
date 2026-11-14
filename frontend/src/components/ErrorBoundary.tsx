import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertIcon, LogoMark, RefreshIcon } from './Icons';

interface Props {
  children: ReactNode;
  compact?: boolean;
  title?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[AEGIS ErrorBoundary caught rendering crash]:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div
            style={{
              padding: '32px 24px',
              margin: 'auto',
              maxWidth: '560px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--c-copper)',
                marginBottom: '8px',
              }}
            >
              <AlertIcon size={20} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                {this.props.title || 'Panel encountered an error'}
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 16px' }}>
              An unexpected error occurred in this workspace section. You can retry or switch sections.
            </p>
            {this.state.error?.message ? (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-subtle)',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: 'var(--c-copper)',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.message}
              </div>
            ) : null}
            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onReset?.();
              }}
            >
              <RefreshIcon size={14} />
              <span>Retry section</span>
            </button>
          </div>
        );
      }

      return (
        <div className="app-gate">
          <div className="gate-card">
            <div className="gate-brand">
              <LogoMark size={24} />
              <span>AEGIS</span>
            </div>
            <h1 style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertIcon size={22} />
              <span>Something went wrong</span>
            </h1>
            <p>
              An unexpected client runtime error occurred while rendering the workspace.
            </p>
            {this.state.error?.message ? (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-subtle)',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: 'var(--c-copper)',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.message}
              </div>
            ) : null}
            <div className="gate-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="button button-dark" onClick={this.handleReload}>
                <RefreshIcon size={16} />
                <span>Reload workspace</span>
              </button>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                Return to home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

