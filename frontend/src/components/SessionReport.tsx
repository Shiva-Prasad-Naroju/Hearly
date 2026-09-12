import type { SessionReport as ReportType } from "../api/types";

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="report-section">
      <h3>{title}</h3>
      <ul className="report-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function SessionReportView({ report, title }: { report: ReportType; title: string }) {
  return (
    <article className="report-doc">
      <div className="row-between" style={{ marginBottom: 4 }}>
        <h2>{title}</h2>
        <span className="pill pill-green">Complete</span>
      </div>
      <p className="report-summary">{report.summary}</p>

      <Section title="Key decisions" items={report.decisions} />
      <Section title="Action items" items={report.action_items} />
      <Section title="Deadlines" items={report.deadlines} />
      <Section title="Follow-ups" items={report.follow_ups} />
      <Section title="Open questions" items={report.open_questions} />
      <Section title="Participants" items={report.participants} />
    </article>
  );
}
