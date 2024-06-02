export const REPO_URL = "https://github.com/khwstolle/git-lfs3";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// Self-contained landing page. No external fonts/JS/images, so a strict CSP applies and
// the page works identically on git-lfs3.pages.dev and the lfs.khws.io mirror.
export function landingPage(host) {
  const h = escapeHtml(host || "your-instance.pages.dev");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>git-lfs3 — Git LFS server</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem;
    font: 16px/1.6 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    background: #f6f7f9; color: #1b1f24;
  }
  main {
    max-width: 40rem; width: 100%; background: #fff; border: 1px solid #e3e6ea;
    border-radius: 14px; padding: 2rem clamp(1.25rem, 4vw, 2.5rem);
    box-shadow: 0 1px 3px rgba(0,0,0,.06);
  }
  h1 { margin: 0 0 .25rem; font-size: 1.6rem; letter-spacing: -.01em; }
  .tagline { margin: 0 0 1.25rem; color: #5b6470; }
  p { margin: 0 0 1rem; }
  code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  pre {
    background: #0d1117; color: #e6edf3; padding: .9rem 1rem; border-radius: 10px;
    overflow-x: auto; font-size: .85rem; margin: 0 0 1.25rem;
  }
  a.cta {
    display: inline-block; background: #1b1f24; color: #fff; text-decoration: none;
    padding: .55rem 1rem; border-radius: 8px; font-weight: 600;
  }
  a.cta:hover { background: #34404d; }
  footer { margin-top: 1.5rem; font-size: .8rem; color: #8a929c; }
  footer a { color: inherit; }
  @media (prefers-color-scheme: dark) {
    body { background: #0d1117; color: #e6edf3; }
    main { background: #161b22; border-color: #30363d; box-shadow: none; }
    .tagline { color: #9aa4b0; }
    a.cta { background: #2f81f7; }
    a.cta:hover { background: #4c95ff; }
  }
</style>
</head>
<body>
<main>
  <h1>git-lfs3</h1>
  <p class="tagline">A Git LFS server backed by any S3-compatible bucket.</p>
  <p>You've reached a <strong>Git LFS endpoint</strong>, not a website. Point your Git
     client at this host using a URL of the form:</p>
  <pre>git config -f .lfsconfig lfs.url \\
  https://&lt;KEY&gt;:&lt;SECRET&gt;@${h}/&lt;ENDPOINT&gt;/&lt;BUCKET&gt;</pre>
  <p>Replace <code>&lt;KEY&gt;</code>/<code>&lt;SECRET&gt;</code> with your object-store
     access key, <code>&lt;ENDPOINT&gt;</code> with its S3 API host, and
     <code>&lt;BUCKET&gt;</code> with your bucket name.</p>
  <footer>Open source · <a href="${REPO_URL}">github.com/khwstolle/git-lfs3</a></footer>
</main>
</body>
</html>`;
}

export function landingResponse(host) {
  return new Response(landingPage(host), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'",
    },
  });
}
