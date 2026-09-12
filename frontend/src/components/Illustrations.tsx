const ink = "#14242B";
const listen = "#1B6B93";
const listenSoft = "#E3F1F6";
const paper = "#F3F6F7";
const warm = "#B85C2A";
const ok = "#2A6B4F";
const line = "#B7C4CA";

function Figure({
  x,
  y,
  fill = listen,
}: {
  x: number;
  y: number;
  fill?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="-18" r="9" fill={fill} />
      <rect x="-12" y="-7" width="24" height="30" rx="11" fill={fill} />
    </g>
  );
}

function RecordCard({
  x,
  y,
  label,
  accent,
  className,
}: {
  x: number;
  y: number;
  label: string;
  accent: string;
  className?: string;
}) {
  return (
    <g className={className} transform={`translate(${x} ${y})`}>
      <rect width="176" height="66" rx="10" fill="#fff" stroke={line} />
      <rect x="14" y="14" width="6" height="38" rx="3" fill={accent} />
      <text x="30" y="28" fontSize="11" fontWeight="600" fill={accent} fontFamily="Source Sans 3, sans-serif">
        {label}
      </text>
      <rect x="30" y="38" width="118" height="6" rx="3" fill={line} />
      <rect x="30" y="50" width="82" height="6" rx="3" fill={line} />
    </g>
  );
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={listen} />
      <path d="M8.5 16c3.4-4.2 11.6-4.2 15 0" fill="none" stroke="#F4F6F7" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 19.4c2.5-2.7 7.5-2.7 10 0" fill="none" stroke="#F4F6F7" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="22.4" r="1.35" fill="#F4F6F7" />
    </svg>
  );
}

export function HeroIllustration() {
  return (
    <svg className="illu illu-hero" viewBox="70 70 440 300" role="img" aria-label="Conversation sound becoming a structured record">
      <circle className="ring" cx="236" cy="214" r="96" fill="#d3e8f1" />
      <circle className="ring" cx="236" cy="214" r="68" fill="none" stroke={listen} strokeWidth="1.5" opacity="0.55" />
      <circle className="ring" cx="236" cy="214" r="42" fill="none" stroke={listen} strokeWidth="1.7" />
      <circle cx="236" cy="214" r="6" fill={listen} />

      <Figure x={128} y={206} fill={ink} />
      <Figure x={178} y={220} fill={listen} />

      <path d="M196 168c14-12 30-12 44 2" fill="none" stroke={listen} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M202 154c18-16 40-14 56 4" fill="none" stroke={listen} strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />

      <path d="M196 190 C218 176, 226 190, 234 204" fill="none" stroke={listen} strokeWidth="1.3" strokeDasharray="3 5" />
      <path d="M244 208 C278 176, 300 140, 322 126" fill="none" stroke={listen} strokeWidth="1.3" strokeDasharray="3 5" />

      <RecordCard className="emerge-1" x={318} y={88} label="Decision" accent={ok} />
      <RecordCard className="emerge-2" x={330} y={166} label="Action" accent={warm} />
      <RecordCard className="emerge-3" x={318} y={244} label="Draft to approve" accent={listen} />
    </svg>
  );
}

export function ProblemIllustration() {
  return (
    <svg className="illu" viewBox="0 0 420 280" role="img" aria-label="Spoken decisions fading before they are written down">
      <rect x="36" y="48" width="200" height="184" rx="12" fill="#fff" stroke={line} />
      <rect x="56" y="72" width="120" height="8" rx="4" fill={line} />
      <rect x="56" y="96" width="148" height="8" rx="4" fill={line} opacity="0.75" />
      <rect x="56" y="120" width="92" height="8" rx="4" fill={line} opacity="0.5" />
      <rect x="56" y="144" width="136" height="8" rx="4" fill={line} opacity="0.32" />
      <rect x="56" y="168" width="80" height="8" rx="4" fill={line} opacity="0.16" />

      <Figure x={300} y={110} fill={ink} />
      <path d="M322 88c16-14 32-14 46 0" fill="none" stroke={warm} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M330 72c18-16 40-14 54 4" fill="none" stroke={warm} strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
      <circle cx="372" cy="58" r="10" fill={warm} opacity="0.15" />
      <path d="M348 168l28-36 22 18-16 34z" fill={paper} stroke={line} strokeWidth="1.2" />
      <path d="M360 154l8 5" stroke={line} strokeWidth="1.2" />
    </svg>
  );
}

export function SolutionIllustration() {
  return (
    <svg className="illu" viewBox="0 0 420 280" role="img" aria-label="Listening ring capturing speech into a structured ledger">
      <circle cx="150" cy="142" r="88" fill={listenSoft} />
      <circle cx="150" cy="142" r="62" fill="none" stroke={listen} strokeWidth="1.3" opacity="0.45" />
      <circle cx="150" cy="142" r="36" fill="none" stroke={listen} strokeWidth="1.6" />
      <circle cx="150" cy="142" r="6" fill={listen} />
      <Figure x={86} y={128} fill={ink} />
      <rect x="248" y="72" width="148" height="148" rx="12" fill="#fff" stroke={line} />
      <rect x="266" y="94" width="44" height="7" rx="3.5" fill={listen} />
      <rect x="266" y="114" width="112" height="6" rx="3" fill={line} />
      <rect x="266" y="130" width="88" height="6" rx="3" fill={line} />
      <rect x="266" y="156" width="44" height="7" rx="3.5" fill={ok} />
      <rect x="266" y="176" width="104" height="6" rx="3" fill={line} />
      <rect x="266" y="192" width="72" height="6" rx="3" fill={line} />
    </svg>
  );
}

export function FlowAssign() {
  return (
    <svg className="illu" viewBox="0 0 160 92" aria-hidden="true">
      <Figure x={48} y={38} fill={ink} />
      <Figure x={108} y={42} fill={listen} />
      <rect x="86" y="14" width="46" height="18" rx="9" fill={listenSoft} stroke={listen} />
      <circle cx="96" cy="23" r="3" fill={listen} />
    </svg>
  );
}

export function FlowListen() {
  return (
    <svg className="illu" viewBox="0 0 160 92" aria-hidden="true">
      <circle cx="80" cy="46" r="28" fill={listenSoft} />
      <path d="M62 46c8-10 28-10 36 0" fill="none" stroke={listen} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M68 56c6-6 18-6 24 0" fill="none" stroke={listen} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="80" cy="64" r="2.4" fill={listen} />
    </svg>
  );
}

export function FlowExtract() {
  return (
    <svg className="illu" viewBox="0 0 160 92" aria-hidden="true">
      <rect x="28" y="18" width="70" height="56" rx="8" fill="#fff" stroke={line} />
      <rect x="38" y="30" width="46" height="5" rx="2.5" fill={line} />
      <rect x="38" y="42" width="38" height="5" rx="2.5" fill={listen} />
      <rect x="38" y="54" width="50" height="5" rx="2.5" fill={line} />
      <rect x="92" y="32" width="46" height="28" rx="6" fill={listenSoft} stroke={listen} />
      <path d="M80 46h12" stroke={listen} strokeWidth="1.4" />
    </svg>
  );
}

export function FlowApprove() {
  return (
    <svg className="illu" viewBox="0 0 160 92" aria-hidden="true">
      <rect x="44" y="22" width="72" height="48" rx="8" fill="#fff" stroke={line} />
      <path d="M44 34l36 18 36-18" fill="none" stroke={listen} strokeWidth="1.5" />
      <circle cx="116" cy="28" r="10" fill={ok} />
      <path d="M111 28l3.2 3.4 7-7" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CapSpeakers() {
  return (
    <svg className="illu" viewBox="0 0 360 220" role="img" aria-label="Tap to mark who is speaking">
      <rect x="40" y="48" width="280" height="124" rx="14" fill="#fff" stroke={line} />
      <Figure x={96} y={96} fill={ink} />
      <Figure x={168} y={104} fill={listen} />
      <rect x="214" y="78" width="78" height="28" rx="14" fill={listen} />
      <rect x="226" y="122" width="66" height="22" rx="11" fill={paper} stroke={line} />
    </svg>
  );
}

export function CapEvidence() {
  return (
    <svg className="illu" viewBox="0 0 360 220" role="img" aria-label="Extracted facts quoting the transcript">
      <rect x="36" y="40" width="168" height="140" rx="12" fill="#fff" stroke={line} />
      <rect x="52" y="60" width="120" height="6" rx="3" fill={line} />
      <rect x="52" y="78" width="96" height="6" rx="3" fill={listen} />
      <rect x="52" y="96" width="128" height="6" rx="3" fill={line} />
      <rect x="52" y="114" width="80" height="6" rx="3" fill={line} />
      <rect x="220" y="70" width="108" height="88" rx="10" fill={listenSoft} stroke={listen} />
      <path d="M204 92h16" stroke={listen} strokeWidth="1.4" />
      <rect x="234" y="88" width="72" height="6" rx="3" fill={listen} />
      <rect x="234" y="106" width="80" height="5" rx="2.5" fill={line} />
      <rect x="234" y="122" width="56" height="5" rx="2.5" fill={line} />
    </svg>
  );
}

export function CapAlerts() {
  return (
    <svg className="illu" viewBox="0 0 360 220" role="img" aria-label="A risk or deadline surfacing from the conversation">
      <circle cx="130" cy="110" r="70" fill={paper} />
      <Figure x={110} y={100} fill={ink} />
      <path d="M138 78c14-12 30-12 44 0" fill="none" stroke={warm} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="210" y="64" width="116" height="92" rx="12" fill="#fff" stroke={line} />
      <path d="M250 88l18 32h-36z" fill={warm} opacity="0.9" />
      <rect x="226" y="130" width="84" height="6" rx="3" fill={line} />
    </svg>
  );
}

export function CapAsk() {
  return (
    <svg className="illu" viewBox="0 0 280 160" aria-hidden="true">
      <rect x="24" y="36" width="232" height="40" rx="8" fill="#fff" stroke={line} />
      <rect x="36" y="52" width="140" height="8" rx="4" fill={line} />
      <rect x="200" y="46" width="44" height="20" rx="6" fill={listen} />
      <rect x="24" y="92" width="180" height="40" rx="8" fill={listenSoft} />
      <path d="M220 112c10 0 18 8 18 18v10" fill="none" stroke={listen} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="238" cy="146" r="3" fill={listen} />
    </svg>
  );
}

export function CapTrust() {
  return (
    <svg className="illu" viewBox="0 0 280 160" aria-hidden="true">
      <rect x="70" y="28" width="140" height="96" rx="12" fill="#fff" stroke={line} />
      <path d="M70 52h140" stroke={line} />
      <path d="M70 52l70 36 70-36" fill="none" stroke={listen} strokeWidth="1.6" />
      <circle cx="204" cy="40" r="16" fill={paper} stroke={listen} />
      <path d="M196 40h16" stroke={listen} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function EmptySessionsArt() {
  return (
    <svg width="120" height="72" viewBox="0 0 120 72" aria-hidden="true">
      <circle cx="40" cy="36" r="22" fill={listenSoft} />
      <path d="M28 36c6-8 18-8 24 0" fill="none" stroke={listen} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="70" y="22" width="38" height="28" rx="6" fill="#fff" stroke={line} />
    </svg>
  );
}

export function EmptyTranscriptArt() {
  return (
    <svg width="88" height="56" viewBox="0 0 88 56" aria-hidden="true">
      <path d="M18 28c10-12 42-12 52 0" fill="none" stroke={listen} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M26 38c8-8 28-8 36 0" fill="none" stroke={listen} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function EventGlyph({ type }: { type: string }) {
  const kind =
    type === "risk" || type === "deadline" || type === "action_item" || type === "decision"
      ? type
      : "default";
  return (
    <span className={`event-glyph event-glyph--${kind}`} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16">
        {type === "decision" && <path d="M3.5 8.2l3 3 6-6.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />}
        {type === "action_item" && <path d="M8 2.5v8.5M5 8.2l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
        {type === "deadline" && (
          <>
            <circle cx="8" cy="8.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 6v3l2 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}
        {type === "risk" && <path d="M8 3.2l5.2 9.1H2.8L8 3.2z" fill="none" stroke="currentColor" strokeWidth="1.4" />}
        {type === "email_request" && <path d="M2.5 5h11v7h-11zM2.5 5l5.5 4L13.5 5" fill="none" stroke="currentColor" strokeWidth="1.4" />}
        {type === "commitment" && <path d="M4 8.5c2-3 6-3 8 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
        {type === "follow_up" && <path d="M4 8h8M9.5 5.5L12 8 9.5 10.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
        {type === "question" && <path d="M6 6a2 2 0 114 .6c0 1.2-2 1.4-2 2.6M8 12.4v.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
        {!["decision", "action_item", "deadline", "risk", "email_request", "commitment", "follow_up", "question"].includes(type) && (
          <circle cx="8" cy="8" r="2.2" fill="currentColor" />
        )}
      </svg>
    </span>
  );
}
