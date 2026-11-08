import type { WorkspaceConfig } from "@/lib/workspace-schema";

export function WorkspaceMetrics({ config, compact = false }: { config: WorkspaceConfig; compact?: boolean }) {
  const metrics = config.kpis?.length ? config.kpis : [];
  if (!metrics.length) return null;
  return <div className={`blueprint-metrics${compact ? " compact" : ""}`}>
    {metrics.map(metric => <article key={`${metric.label}-${metric.context}`}>
      <small>{metric.label}</small>
      <b>{metric.value}</b>
      <span>{metric.context}</span>
    </article>)}
  </div>;
}

export function WorkspaceViews({ config, compact = false }: { config: WorkspaceConfig; compact?: boolean }) {
  const sections = config.sections?.length ? config.sections : [];
  if (!sections.length) return null;
  return <div className={`blueprint-views${compact ? " compact" : ""}`}>
    {sections.map(section => <section className={`blueprint-view blueprint-view-${section.view}`} key={section.title}>
      <header><div><small>{config.dashboardKind ?? "workspace"} view</small><h3>{section.title}</h3></div><span>Setup view</span></header>
      {section.view === "board" ? <div className="blueprint-board">{section.items.map(item => <article key={item}><b>{item}</b><span>No items yet</span></article>)}</div> : null}
      {section.view === "timeline" ? <ol className="blueprint-timeline">{section.items.map((item, index) => <li key={item}><i/><div><b>{item}</b><small>Step {index + 1}</small></div></li>)}</ol> : null}
      {section.view === "calendar" ? <div className="blueprint-calendar">{section.items.map((item, index) => <article key={item}><small>View {String(index + 1).padStart(2, "0")}</small><b>{item}</b></article>)}</div> : null}
      {section.view === "table" ? <div className="blueprint-table-wrap"><table className="blueprint-table"><thead><tr>{section.items.slice(0, 4).map(item => <th key={item}>{item}</th>)}</tr></thead><tbody><tr><td colSpan={Math.max(1, Math.min(4, section.items.length))}>Connect a source or add your first record to populate this view.</td></tr></tbody></table></div> : null}
      {section.view === "list" ? <ul className="blueprint-list">{section.items.map(item => <li key={item}><i/>{item}<small>Ready to configure</small></li>)}</ul> : null}
    </section>)}
  </div>;
}
