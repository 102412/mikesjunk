# Independent browser desktop

Vercel hosts the panel, but cannot run a persistent Chromium desktop. Run this
Docker Compose service on a separate Linux server (a small VM with at least
2 GB RAM is a starting point). This is a real streamed Chromium browser using
LinuxServer's Chromium/Selkies image, with a profile separate from the viewer's
local browser. There is no subscription API or browser API key to configure.
The server itself may have hosting costs.

1. Install Docker and Docker Compose on the server.
2. Set `BROWSER_USER` and a strong `BROWSER_PASSWORD` in the server environment.
   Keep credentials out of the repository and out of the desktop URL.
3. From this directory, run `docker compose up -d`.
4. Put a TLS reverse proxy on the same host in front of `127.0.0.1:3000`.
   Enable WebSocket forwarding and robust access control (for example,
   SWAG/Authelia). Do not expose port 3000 directly to the Internet. The desktop
   includes a terminal and access to the container; only trusted users should
   be allowed to reach it. Use a dedicated server without sensitive host mounts.
5. Configure the proxy to allow embedding from your exact Vercel production
   origin using `Content-Security-Policy: frame-ancestors https://your-site.example`.
   Ensure its `X-Frame-Options` policy does not block that origin. Keep other
   security headers. Test the authentication flow in the embed; some identity
   providers and third-party cookie settings require signing in in a separate
   tab. A same-site desktop subdomain is preferable where available.
6. Set `NEXT_PUBLIC_BROWSER_DESKTOP_URL=https://browser.your-domain.example`
   in the Vercel project and redeploy. This is a public endpoint, not a secret.
7. Triple-click **Build a dashboard** in the landing page's top navigation,
   leaving less than 450 ms between clicks. Single clicks still navigate after
   that brief window; keyboard and modified clicks retain normal link behavior.

The desktop supplies its own address bar, tabs, back/forward navigation,
JavaScript, and logins. The outer toolbar reconnects, enters fullscreen, opens
in a separate tab, or closes the panel. Clipboard, downloads, media, and browser
shortcuts depend on the remote desktop, viewer permissions, and device support;
DRM and some sites may restrict remote browsers. This is not a guarantee that
every desktop-browser feature works inside every viewer browser.

One deployment is **one shared remote profile**, not a private session per site
visitor. Authenticate it independently: the triple click is a UI entrance, not
access control. Closing the panel does not clear remote cookies/history or stop
the container. For separate users, provision separate authenticated containers.
Stop with `docker compose down`; remove the named volume only when intentionally
erasing the remote profile. The iframe-load event confirms only that a document
loaded, not that authentication or the desktop connection succeeded.

Image and operational documentation:
https://github.com/linuxserver/docker-chromium
