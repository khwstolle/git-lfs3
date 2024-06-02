const OID_RE = /^[0-9a-f]{64}$/;

export const MIN_EXPIRY = 1; // S3 X-Amz-Expires minimum (seconds)
export const MAX_EXPIRY = 604800; // S3 X-Amz-Expires maximum (7 days)
export const DEFAULT_EXPIRY = 3600;

// A Git LFS sha-256 oid is exactly 64 lowercase hex chars. Validating this also
// prevents path traversal, since the oid is used verbatim as the S3 object key.
export function isValidOid(oid) {
  return typeof oid === "string" && OID_RE.test(oid);
}

export function isValidSize(size) {
  return typeof size === "number" && Number.isInteger(size) && size >= 0;
}

// Parse the EXPIRY env var (string|number) into a clamped integer second count.
// Unset (undefined/null), empty/whitespace, or non-numeric → DEFAULT_EXPIRY;
// out-of-range numeric → clamped to [MIN, MAX]. Note: an empty/whitespace string is
// treated as unset, because a defined-but-blank env binding (e.g. EXPIRY= in the
// dashboard) would otherwise coerce via Number("") to 0 and clamp to a useless 1 second.
export function parseExpiry(value) {
  if (value == null || (typeof value === "string" && value.trim() === "")) return DEFAULT_EXPIRY;
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_EXPIRY;
  const i = Math.trunc(n);
  if (i < MIN_EXPIRY) return MIN_EXPIRY;
  if (i > MAX_EXPIRY) return MAX_EXPIRY;
  return i;
}

// Validate the "<endpoint>/<bucket>" target before it is used to build a presigned URL.
// Requires at least an endpoint and a bucket (no empty segments), a host that parses as a
// URL, and no embedded credentials (userinfo would make `new Request` throw). Rejecting
// malformed targets here turns a would-be opaque 500 into a clean 4xx.
export function isWellFormedTarget(target) {
  if (typeof target !== "string") return false;
  const segments = target.split("/");
  if (segments.length < 2 || segments.some((s) => s === "")) return false;
  let url;
  try {
    url = new URL("https://" + target + "/_lfs_probe");
  } catch {
    return false;
  }
  return url.username === "" && url.password === "";
}
