"use client";

import { Download, FileCode2, FileJson, LayoutPanelTop } from "lucide-react";
import { useEffect, useState } from "react";
import { hasStoredWorkspace, readData, readWorkspace, type WorkspaceData } from "@/lib/storage";
import type { WorkspaceConfig } from "@/lib/workspace-schema";

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export function DashboardExport() {
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (hasStoredWorkspace()) { setConfig(readWorkspace()); setData(readData()); }
    setReady(true);
  }, []);
  if (ready && (!config || !data)) return <main className="export-page"><header><div><span>PROJECTOS / EXPORT</span><h1>Build a dashboard first.</h1><p>Exports become available after the AI has created a dashboard from your project brief.</p></div></header></main>;
  if (!config || !data) return <main className="export-page"><p className="muted">Loading your dashboard export…</p></main>;
  const safeName = config.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "dashboard";
  const exportJson = () => download(`${safeName}-projectos.json`, JSON.stringify({ exportedAt: new Date().toISOString(), dashboard: config, data }, null, 2), "application/json");
  const exportHtml = () => {
    const modules = config.modules.map(module => `<li>${escapeHtml(module)}</li>`).join("");
    const tasks = data.tasks.map(task => `<li>${task.done ? "✓" : "○"} ${escapeHtml(task.title)}</li>`).join("");
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(config.name)}</title><style>body{margin:0;background:#171f44;color:#f2fcff;font:16px system-ui;padding:48px}main{max-width:900px;margin:auto}section{margin-top:18px;padding:22px;border:1px solid #74ffed44;border-radius:18px;background:#0b1230aa}small{color:#74ffed;text-transform:uppercase;letter-spacing:.1em}h1{font-size:48px;margin:8px 0}li{margin:9px 0;color:#d6e4f4}</style><main><small>Kernova dashboard export</small><h1>${escapeHtml(config.name)}</h1><p>${escapeHtml(config.description)}</p><section><small>Priorities</small><ul>${config.priorities.map(priority => `<li>${escapeHtml(priority)}</li>`).join("")}</ul></section><section><small>Modules</small><ul>${modules}</ul></section><section><small>Tasks</small><ul>${tasks}</ul></section></main>`;
    download(`${safeName}-dashboard.html`, html, "text/html");
  };
  return <main className="export-page"><header><div><span>PROJECTOS / EXPORT</span><h1>Take the dashboard with you.</h1><p>Export a portable workspace configuration or a standalone HTML snapshot of the dashboard as it exists now.</p></div><LayoutPanelTop size={28}/></header><section className="export-preview glass-card"><small>Ready to export</small><h2>{config.name}</h2><p>{config.modules.length} modules · {data.tasks.length} local tasks · {config.layout} layout</p></section><section className="export-options"><article className="glass-card"><FileJson size={22}/><h2>Workspace JSON</h2><p>Includes the dashboard plan and local tasks, notes, links, and activity. Best for portability or a future import path.</p><button className="button" onClick={exportJson}><Download size={15}/> Download JSON</button></article><article className="glass-card"><FileCode2 size={22}/><h2>Standalone HTML</h2><p>A static, shareable snapshot of the dashboard structure and current tasks. It does not include live AI or integrations.</p><button className="button" onClick={exportHtml}><Download size={15}/> Download HTML</button></article></section></main>;
}
