import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { navigate } from '../lib/router';
import {
  AgentsIcon,
  ArrowRight,
  ArrowUpRight,
  BoltIcon,
  ChatIcon,
  CheckIcon,
  DispatchIcon,
  LogoMark,
  ShieldIcon,
  SparkIcon,
  VoiceIcon,
  WebhookIcon,
  SlackIcon,
  ChevronIcon,
} from '../components/Icons';
import { Pill } from '../components/ui';
import { playTap } from '../utils/soundEffects';
import { AegisFieldCanvas } from '../components/AegisFieldCanvas';
import '../styles/landing.css';

const PROVIDERS = ['Anthropic', 'OpenAI', 'Google Gemini', 'OpenRouter', 'Groq', 'OpenAI-compatible'];
const CURRENT_YEAR = new Date().getFullYear();

const CAPABILITIES = [
  {
    icon: <ChatIcon size={22} />,
    title: 'One workspace, many models',
    copy: 'Switch agents between Anthropic, OpenAI, Google Gemini, OpenRouter, Groq, or any OpenAI-compatible endpoint. Provider adapters share one conversation layer.',
    tag: 'Multi-provider',
    index: '01',
  },
  {
    icon: <VoiceIcon size={22} />,
    title: 'Conversations you can speak',
    copy: 'Dictate with the browser microphone, hear replies through native speech synthesis, and keep every turn in server-side conversation history.',
    tag: 'Voice in / voice out',
    index: '02',
  },
  {
    icon: <DispatchIcon size={22} />,
    title: 'Dispatching with a paper trail',
    copy: 'Turn an instruction into a reviewable dispatch plan, send it to approved HTTPS targets, and record every per-target result — including failures.',
    tag: 'Governed execution',
    index: '03',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Connect a provider',
    copy: 'Add one API key on the server. AEGIS discovers the adapter and exposes only the models you allow.',
  },
  {
    number: '02',
    title: 'Configure an agent',
    copy: 'Give the agent a name, a system prompt, a model, temperature, voice settings and the dispatch targets it may use.',
  },
  {
    number: '03',
    title: 'Talk or type',
    copy: 'Use text chat or the voice console. Speech recognition runs in the browser; replies can be spoken immediately.',
  },
  {
    number: '04',
    title: 'Review, then dispatch',
    copy: 'AEGIS drafts a plan. You choose the targets. The engine posts the event and reports exactly what came back.',
  },
];

const TICKER_ITEMS = [
  'Talk to the model',
  'Dispatch the outcome',
  'Keys stay on server',
  'Truthful execution',
  'Browser speech',
  'Real HTTP evidence',
  'Independent AI workspace',
];

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = 'AEGIS — AI voice conversations and governed dispatch';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({
      duration: 1.1,
      easing: (time: number) => Math.min(1, 1.001 - Math.pow(2, -10 * time)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.4,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Scroll reveal observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    const revealElements = document.querySelectorAll('.reveal-elem');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      observer.disconnect();
    };
  }, []);

  // Deep links such as /#voice should land on the section even though React
  // renders the landing page after the browser's initial anchor pass.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ block: 'start', behavior: 'auto' });
    }, 160);

    return () => window.clearTimeout(timer);
  }, []);

  const launch = () => {
    playTap();
    navigate('/app');
  };

  return (
    <div className="landing" ref={containerRef}>
      {/* PERSISTENT FULL-PAGE GRAVITY FIELD (BEHIND CONTENT) */}
      <AegisFieldCanvas />

      {/* BACKGROUND AMBIENT GLOW BLOOMS */}
      <div className="landing-ambient-bloom-top" aria-hidden="true" />
      <div className="landing-ambient-bloom-mid" aria-hidden="true" />

      {/* HEADER NAV */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <a
            className="landing-brand"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              navigate('/');
            }}
          >
            <span className="brand-mark" aria-hidden="true">
              <LogoMark size={20} />
            </span>
            <span className="brand-word">AEGIS</span>
          </a>

          <nav className="landing-links" aria-label="Primary">
            <a href="#product">Product</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#voice">Voice</a>
            <a href="#dispatch">Dispatch</a>
            <a href="#architecture">Architecture</a>
            <a href="#providers">Providers</a>
          </nav>

          <div className="landing-nav-actions">
            <a className="nav-text-link" href="#architecture">
              How it works
            </a>
            <button type="button" className="button button-launch-pill" onClick={launch}>
              <span>Launch AEGIS</span>
              <span className="button-launch-orb">
                <ChevronIcon size={14} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-dot" /> Independent AI workspace
              </div>
              <h1>
                Talk to the model.
                <br />
                Dispatch the <em>outcome.</em>
              </h1>
              <p className="hero-lede">
                AEGIS is a voice-first AI workspace for teams that need conversations to end in action.
                Connect your own AI provider, configure an agent, speak or type — then send a reviewed
                dispatch to the tools you trust.
              </p>

              <div className="hero-actions">
                <button type="button" className="button button-accent button-large button-glow" onClick={launch}>
                  <span>Launch AEGIS</span>
                  <ArrowRight size={17} />
                </button>
                <a className="button button-quiet button-large" href="#product">
                  See the platform
                </a>
              </div>

              <div className="hero-facts">
                <span>
                  <CheckIcon size={14} /> Keys stay on the server
                </span>
                <span>
                  <CheckIcon size={14} /> No simulated success
                </span>
                <span>
                  <CheckIcon size={14} /> Webhook + Slack dispatch
                </span>
              </div>
            </div>

            {/* HERO CONSOLE PREVIEW */}
            <div className="hero-visual" aria-label="AEGIS workspace preview" role="img">
              <div className="console">
                <div className="console-bar">
                  <span className="console-mark">
                    <LogoMark size={14} />
                  </span>
                  <span className="console-title">AEGIS / Voice console</span>
                  <span className="console-state">
                    <span className="live-dot" /> listening
                  </span>
                </div>
                <div className="console-body">
                  <div className="console-meta">Agent · Dispatch Operator &nbsp;/&nbsp; Claude Sonnet</div>

                  <div className="bubble bubble-user">
                    Route the eu-west database outage to the on-call channel and open a tracked handoff.
                  </div>

                  <div className="wave-row" aria-hidden="true">
                    {[10, 22, 14, 30, 18, 36, 26, 12, 32, 20, 28, 15, 24, 11].map((height, index) => (
                      <span key={index} style={{ height }} />
                    ))}
                    <span className="wave-caption">voice transcript · captured locally</span>
                  </div>

                  <div className="bubble bubble-agent">
                    I have a plan: escalate as <strong>urgent</strong>, notify the on-call channel, and post the
                    handoff payload. Review the targets before I send it.
                  </div>

                  <div className="mini-plan">
                    <div className="mini-plan-head">
                      <span>Dispatch plan</span>
                      <Pill tone="warn">Urgent</Pill>
                    </div>
                    <div className="mini-target">
                      <span className="mini-target-icon">
                        <WebhookIcon size={14} />
                      </span>
                      <span>Ops webhook</span>
                      <span className="mini-status ok">200 · 142 ms</span>
                    </div>
                    <div className="mini-target">
                      <span className="mini-target-icon">
                        <SlackIcon size={14} />
                      </span>
                      <span>#incidents</span>
                      <span className="mini-status ok">200 · 98 ms</span>
                    </div>
                    <div className="mini-foot">Every result is recorded. Failures stay visible.</div>
                  </div>
                </div>
              </div>
              <div className="preview-caption">Product preview · webhook and Slack dispatch targets</div>
            </div>
          </div>
        </section>

        {/* PROVIDER STRIP */}
        <section className="provider-strip" id="providers" aria-labelledby="providers-heading">
          <div className="provider-strip-inner reveal-elem">
            <div>
              <div className="eyebrow muted" id="providers-heading">
                Bring your own provider
              </div>
              <p className="provider-strip-copy">One adapter contract. Model choice stays yours.</p>
            </div>
            <ul className="provider-list">
              {PROVIDERS.map((provider) => (
                <li key={provider}>{provider}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* PRODUCT & CAPABILITIES */}
        <section className="section" id="product">
          <div className="section-inner">
            <div className="reveal-elem">
              <SectionHeading
                eyebrow="The platform"
                title="A complete loop from conversation to execution."
                copy="Most AI tools stop at a chat reply. AEGIS is built around what happens next: a plan, an approved target, and a truthful result."
              />
            </div>

            <div className="capability-grid">
              {CAPABILITIES.map((card, i) => (
                <article
                  className="capability-card reveal-elem"
                  key={card.title}
                  style={{ transitionDelay: `${i * 0.12}s` }}
                >
                  <div className="card-top-row">
                    <span className="card-index-mono">{card.index}</span>
                    <span className="capability-tag">{card.tag}</span>
                  </div>
                  <div className="capability-icon">{card.icon}</div>
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                </article>
              ))}
            </div>

            {/* HOW IT WORKS */}
            <div className="how-it-works" id="how-it-works">
              <div className="how-copy reveal-elem">
                <div className="eyebrow muted">How it works</div>
                <h2>Four deliberate steps. No hidden automation.</h2>
                <p>
                  AEGIS separates thinking from acting. The model can draft a plan, but execution is a
                  distinct, logged operation against a target you configured.
                </p>
                <button type="button" className="text-link" onClick={launch}>
                  Open the workspace <ArrowUpRight size={15} />
                </button>
              </div>

              <ol className="step-list">
                {STEPS.map((step, i) => (
                  <li
                    key={step.number}
                    className="reveal-elem"
                    style={{ transitionDelay: `${i * 0.1}s` }}
                  >
                    <span className="step-number">{step.number}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* VOICE SECTION (DEEP FOREST RICH CONTRAST) */}
        <section className="section section-dark" id="voice">
          <div className="section-ambient-glow" aria-hidden="true" />
          <div className="section-inner split">
            <div className="split-copy reveal-elem">
              <div className="eyebrow">Voice interaction</div>
              <h2>Speech that stays inside the browser — and inside the record.</h2>
              <p>
                AEGIS uses the Web Speech API for live dictation and native speech synthesis for replies.
                There is no hidden cloud speech bill and no claim of a neural voice provider that is not
                configured.
              </p>
              <ul className="check-list">
                <li>
                  <CheckIcon size={15} /> Push-to-talk and hands-free turn taking
                </li>
                <li>
                  <CheckIcon size={15} /> Interim transcript feedback while you speak
                </li>
                <li>
                  <CheckIcon size={15} /> Per-agent rate and pitch, editable in the workspace
                </li>
                <li>
                  <CheckIcon size={15} /> Voice and text turns share one conversation history
                </li>
                <li>
                  <CheckIcon size={15} /> Diagnostics for missing voices and unsupported browsers
                </li>
              </ul>
            </div>

            <div className="voice-demo reveal-elem" style={{ transitionDelay: '0.15s' }} aria-hidden="true">
              <div className="voice-demo-head">
                <span className="voice-orb">
                  <VoiceIcon size={24} />
                </span>
                <div>
                  <strong>Voice console</strong>
                  <span>Speaking with Dispatch Operator</span>
                </div>
                <Pill tone="ok">
                  <span className="live-dot" /> Live
                </Pill>
              </div>
              <div className="voice-demo-wave">
                {[18, 34, 26, 52, 38, 64, 30, 58, 44, 72, 40, 56, 28, 48, 22, 36].map((height, index) => (
                  <span key={index} style={{ height }} />
                ))}
              </div>
              <p className="voice-demo-line">“The east region is degraded. Should I escalate it as urgent?”</p>
              <div className="voice-demo-reply">
                <span className="reply-label">AEGIS</span>
                <span>
                  Yes. I can prepare an urgent escalation for the on-call webhook. Open Dispatch to review
                  the target before sending.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* DISPATCHING SECTION */}
        <section className="section" id="dispatch">
          <div className="section-inner">
            <div className="reveal-elem">
              <SectionHeading
                eyebrow="Dispatching"
                title="Approval first. Evidence after."
                copy="AEGIS does not pretend a workflow ran. Each dispatch has a plan, a target selection, a timeout, an HTTP outcome, and a permanent audit entry."
              />
            </div>

            <div className="dispatch-grid">
              <div className="dispatch-panel reveal-elem" style={{ transitionDelay: '0.08s' }}>
                <div className="panel-kicker">Step 1 · Plan</div>
                <h3>Turn intent into a structured plan</h3>
                <p>
                  An AI planner extracts a title, summary and priority. If no provider is configured, the
                  local rules engine produces the plan and labels it as such.
                </p>
                <div className="code-sample">
                  <span>{'{'}</span>
                  <span>&nbsp;&nbsp;"title": "Escalate eu-west outage",</span>
                  <span>&nbsp;&nbsp;"priority": "urgent",</span>
                  <span>&nbsp;&nbsp;"targets": ["ops-webhook", "slack-incidents"]</span>
                  <span>{'}'}</span>
                </div>
              </div>

              <div className="dispatch-panel reveal-elem" style={{ transitionDelay: '0.16s' }}>
                <div className="panel-kicker">Step 2 · Approve</div>
                <h3>You choose where it goes</h3>
                <p>
                  Nothing is sent by the planner. Dispatch targets are explicit: a generic HTTPS webhook or
                  a Slack incoming webhook. Targets can be disabled without being deleted.
                </p>
                <div className="target-preview">
                  <span>
                    <WebhookIcon size={15} /> Ops webhook <em>enabled</em>
                  </span>
                  <span>
                    <SlackIcon size={15} /> #incidents <em>enabled</em>
                  </span>
                  <span className="disabled">
                    <WebhookIcon size={15} /> Archive sink <em>paused</em>
                  </span>
                </div>
              </div>

              <div className="dispatch-panel reveal-elem" style={{ transitionDelay: '0.24s' }}>
                <div className="panel-kicker">Step 3 · Execute</div>
                <h3>Real HTTP, real outcomes</h3>
                <p>
                  Requests run server-side with a hard timeout and redirects disabled. Private-network
                  destinations are rejected. Each target returns a status, latency and sanitized detail.
                </p>
                <div className="result-preview">
                  <span className="ok">
                    <CheckIcon size={14} /> Ops webhook · 200 · 142 ms
                  </span>
                  <span className="fail">Slack · 502 · target rejected the payload</span>
                  <span className="aggregate">Aggregate: partial</span>
                </div>
              </div>
            </div>

            <div className="honesty-band reveal-elem">
              <ShieldIcon size={22} />
              <div>
                <strong>No fabricated connector results.</strong>
                <p>
                  If a dispatch is skipped, the log says skipped. If an upstream call fails, the failure is
                  shown with its HTTP status. New connectors are only listed when they are actually built.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ARCHITECTURE SECTION */}
        <section className="section section-muted" id="architecture">
          <div className="section-inner">
            <div className="reveal-elem">
              <SectionHeading
                eyebrow="Architecture"
                title="Small, explicit layers — designed to grow."
                copy="The application keeps provider credentials and dispatch URLs on the server. The browser only sees safe metadata."
              />
            </div>

            <div className="architecture-map reveal-elem" aria-label="AEGIS architecture">
              <div className="arch-column">
                <div className="arch-node accent">
                  <ChatIcon size={18} />
                  <strong>React workspace</strong>
                  <span>Chat · Voice · Dispatch · Agents</span>
                </div>
                <div className="arch-node">
                  <VoiceIcon size={18} />
                  <strong>Browser speech</strong>
                  <span>Recognition + synthesis</span>
                </div>
              </div>
              <div className="arch-arrow" aria-hidden="true">
                <ArrowRight size={18} />
              </div>
              <div className="arch-column">
                <div className="arch-node stacked">
                  <strong>Express API</strong>
                  <span>Validation · CORS · rate limits · sanitized errors</span>
                </div>
                <div className="arch-split">
                  <div className="arch-node small">
                    <SparkIcon size={16} />
                    <strong>Provider registry</strong>
                    <span>Anthropic, OpenAI, Gemini, OpenRouter, Groq, compatible</span>
                  </div>
                  <div className="arch-node small">
                    <BoltIcon size={16} />
                    <strong>Dispatch engine</strong>
                    <span>Plan → approve → HTTPS POST → result</span>
                  </div>
                </div>
                <div className="arch-node small">
                  <AgentsIcon size={16} />
                  <strong>Workspace store</strong>
                  <span>Agents · conversations · logs · targets</span>
                </div>
              </div>
              <div className="arch-arrow" aria-hidden="true">
                <ArrowRight size={18} />
              </div>
              <div className="arch-column">
                <div className="arch-node external">
                  <strong>AI providers</strong>
                  <span>Your keys, your accounts</span>
                </div>
                <div className="arch-node external">
                  <strong>Dispatch targets</strong>
                  <span>HTTPS webhook · Slack incoming webhook</span>
                </div>
                <div className="arch-node external optional">
                  <strong>Vercel Blob</strong>
                  <span>Optional durable workspace state</span>
                </div>
              </div>
            </div>

            <div className="security-grid">
              <div className="security-card reveal-elem" style={{ transitionDelay: '0.08s' }}>
                <ShieldIcon size={20} />
                <h3>Credentials stay server-side</h3>
                <p>
                  Provider keys are read from the environment and never sent to the browser. Dispatch URLs
                  are returned as host-only references after saving.
                </p>
              </div>
              <div className="security-card reveal-elem" style={{ transitionDelay: '0.16s' }}>
                <CheckIcon size={20} />
                <h3>Truthful state</h3>
                <p>
                  Provider failures, rate limits and missing configuration surface as errors. The UI does
                  not switch to a fake local success path.
                </p>
              </div>
              <div className="security-card reveal-elem" style={{ transitionDelay: '0.24s' }}>
                <BoltIcon size={20} />
                <h3>Bounded execution</h3>
                <p>
                  HTTPS-only targets, DNS checks against private ranges, redirects disabled, request timeouts,
                  and rate limits on AI and dispatch routes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ROADMAP */}
        <section className="section">
          <div className="section-inner">
            <div className="roadmap reveal-elem">
              <div>
                <div className="eyebrow muted">Roadmap, stated plainly</div>
                <h2>Built today. Honest about tomorrow.</h2>
                <p>
                  AEGIS is an independent product in active development. These are the next capabilities,
                  not shipped claims.
                </p>
              </div>
              <ul className="roadmap-list">
                <li>
                  <span>Next</span> Streaming model responses and interruptible speech
                </li>
                <li>
                  <span>Next</span> Account authentication and per-user workspaces
                </li>
                <li>
                  <span>Next</span> Server-side telephony ingestion and cloud speech providers
                </li>
                <li>
                  <span>Later</span> Additional dispatch connectors with verified contracts
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* MARQUEE TICKER */}
        <div className="landing-marquee-wrapper" aria-hidden="true">
          <div className="landing-marquee-track">
            {TICKER_ITEMS.concat(TICKER_ITEMS).map((item, index) => (
              <span className="landing-marquee-item" key={index}>
                {item}
                <span className="landing-marquee-dot" />
              </span>
            ))}
          </div>
        </div>

        {/* CTA BAND */}
        <section className="cta-band">
          <div className="cta-inner reveal-elem">
            <div>
              <div className="eyebrow">Ready when you are</div>
              <h2>Open the workspace and run a real conversation.</h2>
            </div>
            <button type="button" className="button button-accent button-large button-glow" onClick={launch}>
              <span>Launch AEGIS</span>
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-bloom-bottom" aria-hidden="true" />
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="brand-mark">
              <LogoMark size={18} />
            </span>
            <div>
              <strong>AEGIS</strong>
              <span>Independent AI voice and dispatch workspace.</span>
            </div>
          </div>
          <nav className="footer-links" aria-label="Footer">
            <a href="#product">Product</a>
            <a href="#voice">Voice</a>
            <a href="#dispatch">Dispatch</a>
            <a href="#architecture">Architecture</a>
            <button type="button" onClick={launch}>
              Launch
            </button>
          </nav>
          <div className="footer-meta">
            <span>© {CURRENT_YEAR} AEGIS</span>
            <span>Built as an independent product.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="section-heading">
      <div className="eyebrow muted">{eyebrow}</div>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}
