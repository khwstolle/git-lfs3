import { handleBatch } from "./batch.js";
import { landingResponse } from "./landing.js";
import { lfsError } from "./errors.js";

// Cloudflare Pages advanced mode: this worker intercepts ALL routes. Unmatched paths
// return 404 (we never serve static assets via env.ASSETS).
export async function handleRequest(req, env) {
  try {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      if (req.method === "GET") return landingResponse(url.host);
      return lfsError(405, "Method not allowed.", { Allow: "GET" });
    }

    if (url.pathname.endsWith("/objects/batch")) {
      if (req.method !== "POST") return lfsError(405, "Method not allowed.", { Allow: "POST" });
      return await handleBatch(req, env, url);
    }

    return lfsError(404, "Not found.");
  } catch (err) {
    // Log server-side (private to the account); never leak internals/credentials to clients.
    console.error("git-lfs3:", err);
    return lfsError(500, "Internal server error.");
  }
}
