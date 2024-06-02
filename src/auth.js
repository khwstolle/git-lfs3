const DECODER = new TextDecoder();

// Parse an HTTP Basic Authorization header into { user, pass }.
// Returns { error: "missing" } when absent, { error: "malformed" } when invalid.
// The S3 access key id is `user` and the secret access key is `pass`.
export function parseAuthorization(req) {
  const auth = req.headers.get("Authorization");
  if (!auth) return { error: "missing" };

  const sep = auth.indexOf(" ");
  const scheme = sep === -1 ? auth : auth.slice(0, sep);
  const encoded = sep === -1 ? "" : auth.slice(sep + 1);
  if (scheme.toLowerCase() !== "basic" || !encoded) return { error: "malformed" };

  let decoded;
  try {
    decoded = DECODER.decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)));
  } catch {
    return { error: "malformed" };
  }

  const i = decoded.indexOf(":");
  if (i === -1) return { error: "malformed" };
  return { user: decoded.slice(0, i), pass: decoded.slice(i + 1) };
}
