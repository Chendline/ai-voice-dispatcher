import { useEffect } from 'react';
import { navigate } from '../lib/router';
import { LogoMark, ShieldIcon, ArrowRight, CheckIcon } from '../components/Icons';
import { playTap } from '../utils/soundEffects';
import '../styles/legal.css';

const CURRENT_YEAR = new Date().getFullYear();

export function PrivacyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy — AEGIS';
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
              className="legal-nav-link active"
              aria-current="page"
              onClick={(e) => {
                e.preventDefault();
                navigate('/privacy');
              }}
            >
              Privacy Policy
            </a>
            <a
              href="/cookies"
              className="legal-nav-link"
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
            <span>Data Protection & Privacy</span>
          </div>
          <h1 className="legal-title">Privacy Policy</h1>
          <div className="legal-meta">
            <span className="legal-meta-badge">Privacy by Design</span>
            <span>Last Updated: November 2026</span>
            <span>•</span>
            <span>Zero Tracking Architecture</span>
          </div>
        </header>

        <div className="legal-callout">
          <div className="legal-callout-title">
            <CheckIcon size={16} />
            <span>Our Privacy Commitments</span>
          </div>
          <p>
            AEGIS is designed with radical data minimization. We do not use tracking cookies, advertising SDKs,
            or third-party analytics scripts. Your voice is transcribed and synthesized entirely inside your web browser.
            Provider credentials and dispatch destination URLs never leave the server.
          </p>
        </div>

        <div className="legal-body">
          <section className="legal-section">
            <h2>1. Information We Do Not Collect</h2>
            <p>
              Unlike conventional SaaS applications, AEGIS is architected to minimize data collection at every layer:
            </p>
            <ul>
              <li><strong>No tracking cookies:</strong> We do not place advertising or behavioral tracking cookies on your device.</li>
              <li><strong>No third-party analytics:</strong> We do not embed external tracking pixels or session recording scripts.</li>
              <li><strong>No cloud audio telemetry:</strong> We do not record, store, or stream raw microphone audio to AEGIS servers.</li>
              <li><strong>No data brokerage:</strong> We never sell, rent, or monetize your workspace data or operational content.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>2. Information Handled by the Application</h2>
            <p>
              To deliver operational AI chat, voice synthesis, and governed dispatch, the application processes the following data:
            </p>
            <ul>
              <li>
                <strong>Server-Side Configuration & Credentials:</strong> API keys for AI providers (e.g.{' '}
                <span className="legal-code-badge">ANTHROPIC_API_KEY</span>, <span className="legal-code-badge">OPENAI_API_KEY</span>)
                and target destination URLs are stored exclusively on the server. The client receives only safe metadata, such as provider
                IDs, model names, and target hostnames.
              </li>
              <li>
                <strong>Conversations & Prompt History:</strong> Messages, prompts, and assistant responses submitted within the workspace
                are temporarily stored in the workspace store to enable conversation context and history rails.
              </li>
              <li>
                <strong>Dispatch Logs & Audit Records:</strong> When you execute a dispatch, AEGIS records the event title, summary,
                priority, target host, HTTP status code, round-trip latency, and a sanitized execution summary.
              </li>
              <li>
                <strong>Local Browser Storage:</strong> Speech preferences (selected voice, pitch, rate, and volume) are stored locally
                in your browser via <span className="legal-code-badge">localStorage</span> under{' '}
                <span className="legal-code-badge">aegis.tts.settings.v1</span>.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Local Audio & Voice Privacy</h2>
            <p>
              AEGIS utilizes browser-native Web Speech capabilities:
            </p>
            <ul>
              <li>
                <strong>Speech Recognition:</strong> Dictation uses your browser&rsquo;s native{' '}
                <span className="legal-code-badge">SpeechRecognition</span> or{' '}
                <span className="legal-code-badge">webkitSpeechRecognition</span> engine. Audio capture begins only upon your explicit
                action (clicking the microphone icon) and terminates immediately when stopped.
              </li>
              <li>
                <strong>Speech Synthesis:</strong> Spoken replies use your device&rsquo;s native local synthesis voices through the{' '}
                <span className="legal-code-badge">window.speechSynthesis</span> API. Text is rendered into audio on your local hardware.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Third-Party Data Transmission</h2>
            <p>
              When you interact with the Service, data is transmitted to third parties only under your direct operational instruction:
            </p>
            <ul>
              <li>
                <strong>Selected AI Model Providers:</strong> When initiating a conversation turn or dispatch plan, prompt text and
                bounded prior turns are sent to the provider you chose (e.g. Anthropic, OpenAI, Google Gemini, Groq, OpenRouter).
                Each provider processes data under its own privacy commitments.
              </li>
              <li>
                <strong>Configured Dispatch Targets:</strong> Upon your explicit approval, dispatch JSON payloads (containing title,
                summary, priority, and original instruction) are sent to the HTTPS webhooks or Slack endpoints you selected.
              </li>
              <li>
                <strong>Optional Storage Provider:</strong> If configured with <span className="legal-code-badge">BLOB_READ_WRITE_TOKEN</span>,
                workspace state snapshots are stored in your private Vercel Blob store.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Security Safeguards</h2>
            <p>
              We implement disciplined technical safeguards to defend workspace integrity:
            </p>
            <ul>
              <li>
                <strong>Server-Side Secret Isolation:</strong> Provider keys and full webhook URLs with query parameters are never
                reflected back to client API responses.
              </li>
              <li>
                <strong>Server-Side Request Forgery (SSRF) Guardrails:</strong> Target URLs undergo strict validation blocking
                loopback addresses, link-local addresses, and private RFC 1918 networks.
              </li>
              <li>
                <strong>Error Sanitization:</strong> Internal error messages and network failures are sanitized before delivery to
                the browser to prevent leaking headers, internal paths, or credentials.
              </li>
              <li>
                <strong>Request Rate Limiting:</strong> Endpoints are protected by rate limits (120 req/min for standard APIs, 40 req/min
                for AI and dispatch routes) to mitigate abuse.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Data Retention & Erasure</h2>
            <p>
              In standard deployments without persistent storage configured, all conversations, agent settings, and dispatch logs
              reside in process memory and are irrevocably erased upon server restart.
            </p>
            <p>
              In deployments utilizing persistent storage, individual conversations, agents, and targets can be permanently deleted
              directly within the workspace interface at any time.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Policy Updates & Inquiries</h2>
            <p>
              We may update this Privacy Policy periodically to reflect enhancements in functionality or security architecture.
              Changes will be published directly on this page with an updated revision date.
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
