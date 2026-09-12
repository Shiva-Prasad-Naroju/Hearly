import { useEffect, useRef, useState } from "react";
import { SessionList } from "../components/SessionList";
import {
  CapAlerts,
  CapAsk,
  CapEvidence,
  CapSpeakers,
  CapTrust,
  FlowApprove,
  FlowAssign,
  FlowExtract,
  FlowListen,
  HeroIllustration,
  ProblemIllustration,
  SolutionIllustration,
} from "../components/Illustrations";

interface HomePageProps {
  onStartListening: () => void;
  onOpenSession: (id: string) => void;
  starting: boolean;
}

function ProductFrame() {
  return (
    <div className="product-frame-wrap">
      <div className="product-frame" aria-hidden="true">
        <div className="product-frame-bar">
          <span className="listen-header-mark">
            <span className="dot dot-listen" /> Listening
          </span>
          <span className="t-stat" style={{ fontSize: 14 }}>04:12</span>
        </div>
        <div className="product-frame-body product-frame-body--listen">
          <div className="mock-listen">
            <span className="mock-orb">
              <span className="mock-orb-ring" />
              <span className="mock-orb-core" />
            </span>
            <p className="mock-listen-title">Hearly is listening.</p>
            <p className="t-meta">Names and the conversation appear when you stop.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePage({ onStartListening, onOpenSession, starting }: HomePageProps) {
  const flowRef = useRef<HTMLDivElement>(null);
  const [flowPlayed, setFlowPlayed] = useState(false);

  useEffect(() => {
    const node = flowRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setFlowPlayed(true);
      },
      { threshold: 0.35 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div>
      <section className="wrap landing-hero">
        <div className="hero-copy">
          <h1 className="hero-title">Leave the room with the record.</h1>
          <p className="hero-sub">
            Hearly listens while people talk. When the room ends, you get who said
            what — and only the decisions, actions, and drafts the transcript can prove.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={onStartListening} disabled={starting}>
              {starting ? <span className="spinner" /> : null}
              Start listening
            </button>
            <a className="btn btn-secondary btn-lg" href="#how-it-works">
              How it works
            </a>
          </div>
          <p className="hero-note">Audio is not stored. Nothing is emailed unless you approve it.</p>
        </div>
        <div className="hero-art">
          <HeroIllustration />
        </div>
      </section>

      <section className="landing-section">
        <div className="wrap split">
          <div>
            <p className="landing-kicker">The problem</p>
            <h2 className="landing-h2">Talk is cheap. The record is whoever remembered.</h2>
            <p className="landing-lead">
              Important rooms still end as a fading memory: a decision with no owner,
              an email that was promised, a deadline that lived only in someone&apos;s tone of voice.
            </p>
            <ul className="problem-list">
              <li>
                <strong>Notes lag the conversation.</strong> By the time someone writes, the wording has already drifted.
              </li>
              <li>
                <strong>Action dies in the hallway.</strong> “I&apos;ll send that” rarely becomes a draft you can check.
              </li>
              <li>
                <strong>Risk stays implicit.</strong> A slip in the room is easy to miss until it is expensive.
              </li>
            </ul>
          </div>
          <ProblemIllustration />
        </div>
      </section>

      <section className="landing-section band">
        <div className="wrap split split--reverse">
          <div>
            <p className="landing-kicker">The solution</p>
            <h2 className="landing-h2">A listening layer that quotes the room.</h2>
            <p className="landing-lead">
              Hearly sits in the conversation, not after it. It transcribes live, extracts
              only what it can cite, and waits for you before anything leaves the system.
            </p>
          </div>
          <SolutionIllustration />
        </div>
      </section>

      <section className="landing-section" id="how-it-works">
        <div className="wrap">
          <p className="landing-kicker">How it works</p>
          <h2 className="landing-h2">From spoken responsibility to a structured record.</h2>
          <p className="landing-lead">
            The path is short on purpose. Hearly listens in silence, writes the
            conversation when you stop, then keeps only facts it can quote.
          </p>

          <div className={`flow ${flowPlayed ? "is-played" : ""}`} ref={flowRef}>
            <div className="flow-rail" aria-hidden="true">
              <span className="flow-packet">quoted fact</span>
            </div>
            <article className="flow-stage">
              <div className="flow-stage-art">
                <FlowListen />
              </div>
              <div>
                <div className="flow-index">1</div>
                <h3>The room is listened to</h3>
                <p>Press start and speak naturally. No speaker chips, no live transcript — just a listening pulse.</p>
              </div>
            </article>
            <article className="flow-stage">
              <div className="flow-stage-art">
                <FlowAssign />
              </div>
              <div>
                <div className="flow-index">2</div>
                <h3>The conversation is written</h3>
                <p>When you stop, names and turns appear. Audio clips are transcribed, then discarded.</p>
              </div>
            </article>
            <article className="flow-stage">
              <div className="flow-stage-art">
                <FlowExtract />
              </div>
              <div>
                <div className="flow-index">3</div>
                <h3>Facts must quote the text</h3>
                <p>Decisions, actions, deadlines and risks are kept only if they cite the window they came from.</p>
              </div>
            </article>
            <article className="flow-stage">
              <div className="flow-stage-art">
                <FlowApprove />
              </div>
              <div>
                <div className="flow-index">4</div>
                <h3>You approve the next step</h3>
                <p>Alerts and email drafts appear for review. Hearly never sends mail on its own.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section band">
        <div className="wrap">
          <p className="landing-kicker">What you get</p>
          <h2 className="landing-h2">The product does one job, thoroughly.</h2>

          <div className="capability">
            <div className="capability-copy">
              <h3>Named conversation after you stop</h3>
              <p>
                While the room is live, Hearly stays out of the way. After you stop, you
                get the speakers and their turns — tap a name to rename it.
              </p>
            </div>
            <div className="capability-art">
              <CapSpeakers />
            </div>
          </div>

          <div className="capability capability--flip">
            <div className="capability-copy">
              <h3>Evidence or nothing</h3>
              <p>
                Every extracted fact has to quote the transcript. If the model cannot point
                to the words, the fact is discarded instead of becoming a confident hallucination.
              </p>
            </div>
            <div className="capability-art">
              <CapEvidence />
            </div>
          </div>

          <div className="capability">
            <div className="capability-copy">
              <h3>Risk while it is still in the room</h3>
              <p>
                Commitments, deadlines and slips surface as they are said — not in a recap
                you read after everyone has left.
              </p>
            </div>
            <div className="capability-art">
              <CapAlerts />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="wrap">
          <p className="landing-kicker">After the room</p>
          <h2 className="landing-h2">Ask the conversation. Keep the human in the send.</h2>
          <div className="insight-grid">
            <article className="insight-card">
              <CapAsk />
              <h3>Ask, then hear the answer</h3>
              <p>
                “What did we decide about the cutover?” Hearly answers from this session
                and can speak the reply aloud. Citations stay attached.
              </p>
            </article>
            <article className="insight-card">
              <CapTrust />
              <h3>Drafts, never silent sends</h3>
              <p>
                If someone asks for an email, you get a draft to edit, approve, and copy.
                The system stops at your desk.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--tight">
        <div className="wrap">
          <p className="landing-kicker">In the product</p>
          <h2 className="landing-h2">One screen for the room, one for the record.</h2>
          <p className="landing-lead">
            While you listen, the screen stays quiet. When you stop, the conversation
            and the session record sit side by side so you can reopen them later.
          </p>
          <ProductFrame />
        </div>
      </section>

      <section className="landing-section" id="sessions">
        <div className="wrap wrap-narrow">
          <div className="cta-band">
            <h2 className="landing-h2">Press start. Keep the room.</h2>
            <p>Hearly begins listening after the people around you know they are on the record.</p>
            <button className="btn btn-primary btn-lg" onClick={onStartListening} disabled={starting}>
              {starting ? <span className="spinner" /> : null}
              Start listening
            </button>
          </div>

          <div className="workspace-head" style={{ marginTop: 48 }}>
            <h3 className="t-section" style={{ margin: 0 }}>Your sessions</h3>
            <span className="t-meta">Reopen a record</span>
          </div>
          <SessionList onOpen={onOpenSession} />
        </div>
      </section>
    </div>
  );
}
