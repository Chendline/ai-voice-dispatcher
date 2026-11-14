import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertIcon, LogoMark, RefreshIcon } from './Icons';

interface Props {
  children: ReactNode;
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
