"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Maximize2, RotateCw, X } from "lucide-react";

function browserEndpoint() {
  const value = process.env.NEXT_PUBLIC_BROWSER_DESKTOP_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function BrowserTrapdoor({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const endpoint = browserEndpoint();

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, []);

  return <dialog ref={dialog} className="browser-trapdoor" aria-labelledby="browser-title" onCancel={onClose}>
    <div className="browser-toolbar">
      <div><strong id="browser-title">Browser</strong><span>Separate Chromium desktop</span></div>
      <div className="browser-actions">
        {endpoint && <>
          <button type="button" aria-label="Reconnect browser" onClick={() => { setLoaded(false); setRevision(value => value + 1); }}><RotateCw size={18}/></button>
          <button type="button" aria-label="Fullscreen browser" onClick={() => { void frame.current?.requestFullscreen?.().catch(() => {}); }}><Maximize2 size={18}/></button>
          <a href={endpoint} target="_blank" rel="noopener noreferrer" aria-label="Open browser desktop in a new tab"><ExternalLink size={18}/></a>
        </>}
        <button type="button" aria-label="Close browser" autoFocus onClick={onClose}><X size={20}/></button>
      </div>
    </div>
    {endpoint ? <div className="browser-viewport">
      {!loaded && <p className="browser-connecting" role="status">Connecting to browser desktop…</p>}
      <iframe ref={frame} key={revision} src={endpoint} title="Independent Chromium browser desktop" allow="clipboard-read; clipboard-write; fullscreen; autoplay" allowFullScreen onLoad={() => setLoaded(true)}/>
      <p className="browser-help">Sign in to the desktop if prompted. Use its Chromium address bar to browse. If the connection is blank or blocked, open the desktop in a new tab using the toolbar.</p>
    </div> : <div className="browser-setup">
      <span className="browser-setup-icon">↗</span>
      <h2>Your browser entrance is ready</h2>
      <p>The independent Chromium desktop needs a running browser server. No browsing session is connected yet.</p>
      <p>Deploy the included <code>infra/browser</code> setup, then set <code>NEXT_PUBLIC_BROWSER_DESKTOP_URL</code> to its authenticated HTTPS address in Vercel and redeploy.</p>
      <p className="browser-help">The desktop has its own cookies, history, and logins. Closing this panel disconnects the view; it does not erase the remote session.</p>
    </div>}
  </dialog>;
}
