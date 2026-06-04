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
<title>git-lfs3 — Git LFS endpoint</title>
<style>
  :root {
    color-scheme: light dark;
    --bg:#002b36; --card:#063843; --code:#001e26; --ink:#eee8d5; --muted:#93a1a1;
    --faint:#586e75; --border:#0f4654; --border-strong:#2c6f7a; --accent:#2aa198;
    --accent2:#b58900; --grid:#06343f; --on-accent:#00232c;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg:#fdf6e3; --card:#fffdf6; --code:#00242e; --ink:#073642; --muted:#586e75;
      --faint:#93a1a1; --border:#e7dfc8; --border-strong:#c7bd9b; --accent:#2aa198;
      --accent2:#b58900; --grid:#efe7d1; --on-accent:#fdf6e3;
    }
  }
  * { box-sizing: border-box; border-radius: 0; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--ink); background-color: var(--bg);
    background-image: linear-gradient(var(--grid) 1px, transparent 1px),
                      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: 46px 46px;
  }
  main {
    max-width: 41rem; width: 100%; background: var(--card);
    border: 1px solid var(--border-strong); box-shadow: 8px 8px 0 0 var(--border-strong);
    padding: clamp(1.5rem, 4vw, 2.5rem);
  }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 1.6rem; flex-wrap: wrap; }
  .wm { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.01em; line-height: 1; }
  .wm b { color: var(--accent); }
  .stamp {
    background: var(--accent); color: var(--on-accent); font-size: 0.66rem; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase; padding: 5px 9px;
  }
  h1 { margin: 0 0 0.5rem; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.01em; line-height: 1.15; }
  h1 .pop { color: var(--accent); }
  p { margin: 0 0 1rem; color: var(--muted); }
  p.lead { color: var(--ink); }
  .label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--faint); margin: 1.4rem 0 0.5rem; }
  code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  code { color: var(--ink); font-size: 0.9em; }
  pre {
    background: var(--code); color: #dfeae8; border: 1px solid var(--border-strong);
    padding: 0.95rem 1.05rem; overflow-x: auto; font-size: 0.82rem; line-height: 1.7; margin: 0 0 1.25rem;
  }
  pre .prompt { color: var(--faint); }
  pre .host { color: var(--accent); }
  pre .ph { color: var(--accent2); }
  dl { margin: 0 0 1.25rem; display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 1rem; }
  dt { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.82rem; color: var(--accent); white-space: nowrap; }
  dd { margin: 0; font-size: 0.92rem; color: var(--muted); }
  .note { border: 1px solid var(--border); padding: 0.85rem 1rem; margin: 0 0 1.5rem; }
  .note .tag { display: block; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); margin-bottom: 0.3rem; }
  .note p { margin: 0; font-size: 0.88rem; }
  .cta {
    display: inline-block; background: var(--accent); color: var(--on-accent); text-decoration: none;
    padding: 0.6rem 1.1rem; font-weight: 700; font-size: 0.78rem; letter-spacing: 0.06em;
    text-transform: uppercase; border: 1px solid var(--accent);
  }
  .cta:hover { background: var(--accent2); border-color: var(--accent2); }
  footer { margin-top: 1.6rem; padding-top: 1.1rem; border-top: 1px solid var(--border); font-size: 0.78rem; color: var(--faint); }
  footer a { color: var(--accent); text-decoration: none; }
  footer a:hover { text-decoration: underline; text-underline-offset: 3px; }
</style>
</head>
<body>
<main>
  <div class="head">
    <span class="wm">LF<b>S3</b></span>
    <span class="stamp">Git LFS · S3 Proxy</span>
  </div>
  <h1>This is a Git LFS <span class="pop">endpoint</span>, not a page to browse.</h1>
  <p class="lead">This host speaks the Git LFS Batch API. Point your Git client at it by adding an <code>.lfsconfig</code> URL of this form to your repository:</p>
  <pre><span class="prompt">$</span> git config -f .lfsconfig lfs.url <span class="ph">&lt;KEY&gt;</span>:<span class="ph">&lt;SECRET&gt;</span>@<span class="host">${h}</span>/<span class="ph">&lt;ENDPOINT&gt;</span>/<span class="ph">&lt;BUCKET&gt;</span></pre>
  <div class="label">Placeholders</div>
  <dl>
    <dt>&lt;KEY&gt;:&lt;SECRET&gt;</dt><dd>Your object-store access key pair (URL-encode any non-alphanumeric characters).</dd>
    <dt>&lt;ENDPOINT&gt;</dt><dd>The S3-compatible API host for your bucket.</dd>
    <dt>&lt;BUCKET&gt;</dt><dd>The bucket name that holds your LFS objects.</dd>
  </dl>
  <div class="note">
    <span class="tag">Stateless by design</span>
    <p>The proxy signs short-lived URLs and your client transfers bytes straight to the bucket. It never stores your credentials and makes no request on your behalf.</p>
  </div>
  <a class="cta" href="https://github.com/khwstolle/git-lfs3">Read the setup guide</a>
  <footer>Open source · MIT · <a href="https://github.com/khwstolle/git-lfs3">github.com/khwstolle/git-lfs3</a></footer>
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
