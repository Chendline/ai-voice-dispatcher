import { useState, type MouseEvent } from 'react';
import { ShieldIcon, CloseIcon } from './Icons';
import { isWorkspacePath, navigate, usePathname } from '../lib/router';
import { playTap } from '../utils/soundEffects';
import { hasCookieConsent, recordCookieConsent } from '../utils/cookieConsent';
import '../styles/cookieNotice.css';

export function CookieNotice() {
  const [visible, setVisible] = useState(() => !hasCookieConsent());
  const [closing, setClosing] = useState(false);
  const pathname = usePathname();

  if (!visible) return null;

  const dismiss = () => {
    playTap();
    setClosing(true);
    recordCookieConsent();
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 200);
  };

  const handleReview = (e: MouseEvent) => {
    e.preventDefault();
    playTap();
    navigate('/cookies');
  };

  const isWorkspace = isWorkspacePath(pathname);

  return (
    <aside
      className={`cookie-notice-banner ${closing ? 'is-closing' : ''} ${isWorkspace ? 'in-workspace' : ''}`}
      aria-label="Cookie and storage notice"
      role="region"
      aria-live="polite"
    >
      <div className="cookie-notice-header">
        <div className="cookie-notice-title-wrap">
          <span className="cookie-notice-icon" aria-hidden="true">
            <ShieldIcon size={16} />
          </span>
          <span className="cookie-notice-title">Cookie & Storage Notice</span>
        </div>
        <button
          type="button"
          className="cookie-notice-close"
          onClick={dismiss}
          aria-label="Dismiss cookie notice"
          title="Dismiss"
        >
          <CloseIcon size={14} />
        </button>
      </div>

      <p className="cookie-notice-text">
        AEGIS uses strictly necessary session cookies and client storage for speech preferences. We never use advertising or third-party tracking scripts.
      </p>

      <div className="cookie-notice-actions">
        <button
          type="button"
          className="cookie-notice-btn"
          onClick={dismiss}
        >
          Acknowledge
        </button>
        <a
          href="/cookies"
          className="cookie-notice-link"
          onClick={handleReview}
        >
          Review Policy
        </a>
      </div>
    </aside>
  );
}
