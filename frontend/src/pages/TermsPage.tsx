import { useEffect } from 'react';
import { navigate } from '../lib/router';
import { LogoMark, ShieldIcon, ArrowRight, CheckIcon } from '../components/Icons';
import { playTap } from '../utils/soundEffects';
import '../styles/legal.css';

const CURRENT_YEAR = new Date().getFullYear();

export function TermsPage() {
  useEffect(() => {
    document.title = 'Terms of Service — AEGIS';
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
              className="legal-nav-link active"
              aria-current="page"
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
            <span>Legal Agreement</span>
          </div>
          <h1 className="legal-title">Terms of Service</h1>
          <div className="legal-meta">
            <span className="legal-meta-badge">Version 2.0</span>
            <span>Last Updated: November 2026</span>
            <span>•</span>
            <span>Governed Dispatch Architecture</span>
          </div>
        </header>

        <div className="legal-callout">
          <div className="legal-callout-title">
            <CheckIcon size={16} />
            <span>Key Principles at a Glance</span>
          </div>
          <p>
            AEGIS is an independent, voice-first operational AI workspace. You bring your own model provider credentials,
            which remain stored strictly on the server. AI models propose actions, but execution to HTTPS webhooks or Slack
            channels requires explicit human review and authorization. We enforce radical honesty: outcomes, failures, and
            rules fallbacks are never faked.
          </p>
        </div>

        <div className="legal-body">
          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the AEGIS software, application interface, or associated APIs (collectively, the &ldquo;Service&rdquo;),
              you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, do not
              access or use the Service.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Scope & Nature of the Service</h2>
            <p>
              AEGIS provides an operational workspace enabling users to conduct voice and text conversations with configured
              artificial intelligence models, generate structured dispatch plans from conversational context, and dispatch approved
              payloads to designated HTTP endpoints (generic HTTPS webhooks and Slack incoming webhooks).
            </p>
            <p>
              <strong>Single-Workspace Implementation:</strong> The Service is currently distributed and deployed as a single-workspace
              application without built-in multi-tenant isolation or end-user identity authentication. You are responsible for securing
              network access to any deployment containing sensitive credentials or operational endpoints.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Bring-Your-Own-Key (BYOK) & Third-Party Model Providers</h2>
            <p>
              AEGIS operates as an interface and orchestration layer across independent model providers, including Anthropic,
              OpenAI, Google Gemini, OpenRouter, Groq, and custom OpenAI-compatible endpoints:
            </p>
            <ul>
              <li>
                <strong>Credential Ownership:</strong> You supply and maintain your own provider API keys. All keys must be configured
                in server environment variables and are never transmitted to client browsers.
              </li>
              <li>
                <strong>Provider Terms:</strong> Your use of third-party model providers is subject to each respective provider&rsquo;s
                terms of service, acceptable use policies, and privacy notices. You are responsible for all API usage fees incurred
                on your accounts.
              </li>
              <li>
                <strong>Output Disclaimers:</strong> AI responses and dispatch proposals are generated by third-party models or transparent
                local fallback rules. AEGIS does not warrant the factual correctness, reliability, or safety of model-generated text.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Governed Dispatch & Human-in-the-Loop Approval</h2>
            <p>
              The fundamental architecture of AEGIS separates <em>planning</em> from <em>execution</em>:
            </p>
            <ul>
              <li>
                <strong>Mandatory Review:</strong> A dispatch plan generated by an AI model or local rule engine is a non-binding proposal.
                No HTTP request is dispatched until an authorized operator explicitly selects the target destination(s) and confirms execution.
              </li>
              <li>
                <strong>Target Authorization:</strong> You represent and warrant that you own, operate, or have express authorization
                to deliver webhook events and Slack messages to each target URL saved in the Target Registry.
              </li>
              <li>
                <strong>Truthful Audit Logging:</strong> Execution outcomes are logged literally as <span className="legal-code-badge">dispatched</span>,{' '}
                <span className="legal-code-badge">partial</span>, <span className="legal-code-badge">failed</span>, or{' '}
                <span className="legal-code-badge">skipped</span>. AEGIS does not fabricate connector success.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Security & Prohibited Uses</h2>
            <p>
              To protect infrastructure integrity, the Service enforces strict Server-Side Request Forgery (SSRF) controls on all
              dispatch destinations:
            </p>
            <ul>
              <li>All target URLs must use HTTPS by default.</li>
              <li>Embedded credentials in URLs are rejected.</li>
              <li>
                DNS resolution is validated server-side; destination addresses in loopback (127.0.0.0/8), link-local, multicast,
                and private RFC 1918 ranges (e.g. 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) are strictly blocked.
              </li>
              <li>HTTP redirects are disabled to prevent DNS rebinding attacks.</li>
            </ul>
            <p>
              You agree not to circumvent security guardrails, probe unroutable internal systems, inject malicious payloads, or use
              the Service in violation of applicable laws or regulations.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Client-Side Voice Processing</h2>
            <p>
              Speech recognition (speech-to-text) and voice playback (text-to-speech) utilize the native Web Speech API implemented
              by your web browser. Audio synthesis and recognition execute locally on your client hardware. AEGIS does not stream,
              record, or transmit your voice audio to proprietary cloud speech servers.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Storage & Data Durability</h2>
            <p>
              By default, workspace data (agents, active conversations, target configurations, and dispatch logs) resides in server
              memory and resets upon process restart. Optional durable snapshots may be stored in Vercel Blob storage when explicitly
              configured by the deployer. You are responsible for maintaining independent archives of essential operational records.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Disclaimer of Warranties & Limitation of Liability</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              NON-INFRINGEMENT, OR UNINTERRUPTED AVAILABILITY.
            </p>
            <p>
              IN NO EVENT SHALL THE CREATORS, MAINTAINERS, OR AFFILIATES OF AEGIS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM FAILED DISPATCHES, MISCONFIGURED TARGETS, MODEL HALLUCINATIONS,
              SERVICE INTERRUPTIONS, OR DATA LOSS.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Modifications & Termination</h2>
            <p>
              We reserve the right to modify these Terms at any time. Updated Terms will be posted on this page with a revised
              effective date. Your continued access to or use of the Service following posted updates constitutes acceptance of the
              revised Terms.
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
