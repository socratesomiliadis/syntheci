interface ConnectorStatus {
  id: string;
  provider: string;
  scopes: string[];
  updatedAt: Date;
}

export function ConnectorsPanel({ connectors }: { connectors: ConnectorStatus[] }) {
  return (
    <section className="panel grid">
      <div className="row">
        <h2 style={{ margin: 0 }}>Connectors</h2>
        <span className="badge">Gmail + Slack</span>
      </div>

      <div className="row" style={{ justifyContent: "flex-start" }}>
        <a href="/api/connect/google/start" className="btn">
          Connect Gmail/Calendar
        </a>
        <a href="/api/connect/slack/start" className="btn secondary">
          Connect Slack
        </a>
      </div>

      {connectors.length === 0 ? (
        <p className="muted">No connectors yet.</p>
      ) : (
        <div className="grid">
          {connectors.map((connector) => (
            <div key={connector.id} className="panel" style={{ background: "#0b1220" }}>
              <div className="row">
                <strong>{connector.provider}</strong>
                <span className="muted">
                  Updated {new Date(connector.updatedAt).toLocaleString()}
                </span>
              </div>
              <p className="muted" style={{ marginBottom: 0 }}>
                Scopes: {connector.scopes.join(", ") || "(none)"}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
