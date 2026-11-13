import { useEffect } from 'react';
import { navigate } from '../lib/router';
import { LogoMark, ShieldIcon, ArrowRight, CheckIcon } from '../components/Icons';
import { playTap } from '../utils/soundEffects';
import '../styles/legal.css';

const CURRENT_YEAR = new Date().getFullYear();

export function CookiesPage() {
  useEffect(() => {
    document.title = 'Cookie Policy — AEGIS';
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const launch = () => {
    playTap();
    navigate('/app');
  };

  return (
    <div className="legal-page">
      <header className="legal-nav">
        <div className="legal-nav-inner">
          <a
            className="legal-brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
          >
            <span className="brand-mark" aria-hidden="true">
              <LogoMark size={20} />
            </span>
            <span>AEGIS</span>
          </a>

          <nav className="legal-nav-links" aria-label="Legal navigation">
            <a
              href="/"
              className="legal-nav-link"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
              }}
            >
              Home
            </a>
            <a
              href="/terms"
              className="legal-nav-link"
              onClick={(e) => {
                e.preventDefault();
                navigate('/terms');
              }}
            >
              Terms of Service
            </a>
            <a
              href="/privacy"
              className="legal-nav-link"
              onClick={(e) => {
                e.preventDefault();
                navigate('/privacy');
              }}
            >
              Privacy Policy
            </a>
            <a
              href="/cookies"
              className="legal-nav-link active"
              aria-current="page"
              onClick={(e) => {
                e.preventDefault();
                navigate('/cookies');
              }}
            >
              Cookie Policy
            </a>
          </nav>

          <button type="button" className="legal-launch-btn" onClick={launch}>
            <span>Open Workspace</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <main className="legal-main">
        <header className="legal-header">
          <div className="legal-eyebrow">
            <ShieldIcon size={14} />
            <span>Transparency & Compliance</span>
          </div>
          <h1 className="legal-title">Cookie & Storage Policy</h1>
          <div className="legal-meta">
            <span className="legal-meta-badge">Zero Tracking</span>
            <span>Last Updated: November 2026</span>
            <span>•</span>
            <span>First-Party Essential State Only</span>
          </div>
        </header>

        <div className="legal-callout">
          <div className="legal-callout-title">
            <CheckIcon size={16} />
            <span>Zero Tracking Architecture</span>
          </div>
          <p>
            AEGIS operates with radical data transparency. We do not use third-party analytics cookies, advertising trackers,
            profiling scripts, or cross-site tracking beacons. The only cookie utilized is strictly necessary for authenticated
            operator sessions on the host system.
          </p>
        </div>

        <div className="legal-body">
          <section className="legal-section">
            <h2>1. What Are Cookies and Web Storage?</h2>
            <p>
              Cookies are small data files placed on your device by websites you visit. They are widely used to maintain
              active login sessions, enhance security, and remember application state.
            </p>
            <p>
              HTML5 Web Storage (such as <code className="legal-code-badge">localStorage</code>) allows modern web applications to store
              preferences locally inside your browser without sending that data to any server during routine page requests.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Strictly Necessary First-Party Cookies</h2>
            <p>
              Under global privacy frameworks (including the EU ePrivacy Directive 2002/58/EC and GDPR Article 6), cookies that
              are strictly necessary to provide an explicitly requested operational service do not require prior consent banners,
              though transparent disclosure is mandatory.
            </p>
            <p>
              When user authentication is enabled on the AEGIS backend, the following strictly necessary cookie is set:
            </p>
            <ul>
              <li>
                <strong>Cookie Identifier:</strong> <code className="legal-code-badge">aegis_session</code>
              </li>
              <li>
                <strong>Provider / Origin:</strong> First-party (issued strictly by the running AEGIS backend).
              </li>
              <li>
                <strong>Purpose:</strong> Stores a cryptographically secure 256-bit random session token confirming your
                authenticated workspace session and role-based permissions (admin, operator, viewer).
              </li>
              <li>
                <strong>Security Flags:</strong> Configured with <code className="legal-code-badge">HttpOnly</code> (blocking client-side script access),
                {' '}<code className="legal-code-badge">SameSite=Lax</code> (mitigating Cross-Site Request Forgery), and <code className="legal-code-badge">Secure</code> in HTTPS environments.
              </li>
              <li>
                <strong>Lifespan:</strong> 7 days or until you explicitly click "Sign Out".
              </li>
              <li>
                <strong>Personal Data:</strong> Contains no personal attributes, email addresses, or secrets. It is an opaque random token mapped solely to an on-server database record.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Client-Side Browser Storage (localStorage)</h2>
            <p>
              To deliver responsive voice synthesis without transmitting operator device settings to remote servers, AEGIS utilizes
              browser <code className="legal-code-badge">localStorage</code>:
            </p>
            <ul>
              <li>
                <strong>Key:</strong> <code className="legal-code-badge">aegis.tts.settings.v1</code>
              </li>
              <li>
                <strong>Purpose:</strong> Stores your local speech synthesis preferences (selected browser voice URI, speech rate, pitch, volume, and playback engine preference).
              </li>
              <li>
                <strong>Scope:</strong> Client-side only. This data is never transmitted to the AEGIS server or any third party.
              </li>
              <li>
                <strong>Retention:</strong> Retained in your local browser until you clear your browser site data or reset settings.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. What We Do Not Use</h2>
            <p>
              To maintain the highest level of privacy and operational integrity:
            </p>
            <ul>
              <li>
                <strong>No Third-Party Advertising:</strong> No behavioral tracking, retargeting pixels, or ad networks (e.g. Google Ads, Meta Pixel).
              </li>
              <li>
                <strong>No Third-Party Analytics:</strong> No tracking SDKs (e.g. Google Analytics, Mixpanel, Hotjar) inspecting user clicks or behaviors.
              </li>
              <li>
                <strong>No Cross-Site Identification:</strong> No device fingerprinting or cross-domain correlation.
              </li>
              <li>
                <strong>No Data Monetization:</strong> We do not sell, rent, or trade operator information, usage metrics, or workflow metadata.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. External AI Providers & Webhook Targets</h2>
            <p>
              AEGIS acts as a dispatch orchestration layer between your authorized operational workflows and selected external targets:
            </p>
            <ul>
              <li>
                <strong>AI Model Providers:</strong> When configured, requests to model APIs (OpenAI, Anthropic, Google Gemini) are executed
                strictly server-to-server. Upstream AI providers never receive browser cookies, session identifiers, or client-side storage keys.
              </li>
              <li>
                <strong>Dispatched Webhooks & Slack:</strong> Automated webhooks dispatched by AEGIS carry only the structured JSON payload
                defined in the dispatch plan. No browser tracking cookies or session tokens are ever forwarded to target endpoints.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Managing & Clearing Cookies</h2>
            <p>
              You maintain total control over cookies and storage mechanisms on your machine:
            </p>
            <ul>
              <li>
                <strong>Browser Settings:</strong> You can inspect, block, or delete cookies at any time through your browser's security or privacy preferences (e.g. Chrome, Firefox, Safari, Edge).
              </li>
              <li>
                <strong>Impact of Blocking:</strong> Because <code className="legal-code-badge">aegis_session</code> is strictly required for operator authentication, blocking cookies will prevent you from signing in or remaining logged into protected workspace accounts.
              </li>
              <li>
                <strong>Clearing Storage:</strong> You can reset speech settings at any time by clearing local storage for this domain in your browser developer tools or settings.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>7. Contact & Governance</h2>
            <p>
              For questions regarding our cookie practices, technical implementation, or self-hosted deployment architecture, please
              refer to the <a href="/privacy" className="text-link" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>Privacy Policy</a> or
              inspect the open-source repository documentation.
            </p>
          </section>
        </div>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <div className="legal-footer-copy">
            <span>© {CURRENT_YEAR} AEGIS. Independent operational AI workspace.</span>
          </div>
          <nav className="legal-footer-links" aria-label="Footer links">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
              }}
            >
              Home
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                navigate('/terms');
              }}
            >
              Terms of Service
            </a>
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                navigate('/privacy');
              }}
            >
              Privacy Policy
            </a>
            <a
              href="/cookies"
              onClick={(e) => {
                e.preventDefault();
                navigate('/cookies');
              }}
            >
              Cookie Policy
            </a>
            <button type="button" onClick={launch}>
              Launch Workspace
            </button>
          </nav>
        </div>
      </footer>
    </div>
  );
}
