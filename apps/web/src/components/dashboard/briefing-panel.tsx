import type { BriefingItem } from "@syntheci/shared";

export function BriefingPanel({
  briefing
}: {
  briefing:
    | {
        briefingDate: string;
        summary: string;
        items: BriefingItem[];
      }
    | null;
}) {
  return (
    <section className="panel grid">
      <div className="row">
        <h2 style={{ margin: 0 }}>Daily Briefing</h2>
        <span className="badge">09:00 local</span>
      </div>

      {!briefing ? (
        <p className="muted">No briefing generated yet.</p>
      ) : (
        <>
          <p className="muted" style={{ margin: 0 }}>
            For {briefing.briefingDate}
          </p>
          <p style={{ marginTop: 0 }}>{briefing.summary}</p>
          <div className="grid">
            {briefing.items.map((item, idx) => (
              <div key={`${item.type}-${idx}`} className="panel" style={{ background: "#0b1220" }}>
                <div className="row">
                  <strong>{item.title}</strong>
                  <span className="badge">{item.type}</span>
                </div>
                <p className="muted" style={{ margin: "0.4rem 0 0" }}>
                  {item.reason}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
