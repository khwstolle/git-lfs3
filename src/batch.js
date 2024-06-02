import { parseAuthorization } from "./auth.js";
import { createS3Client, presign } from "./s3.js";
import { isValidOid, isValidSize, parseExpiry, isWellFormedTarget } from "./validate.js";
import { lfsError, LFS_HEADERS } from "./errors.js";

const METHOD_FOR = { upload: "PUT", download: "GET" };
const MAX_BATCH_OBJECTS = 1000;

// Parse "/<k=v>/.../<ENDPOINT>/<BUCKET>/objects/batch" into { options, target } where
// target is "<ENDPOINT>/<BUCKET>". Throws (via decodeURIComponent) on malformed escapes.
export function parsePath(pathname) {
  const segments = pathname.split("/").slice(1, -2); // drop leading "" + trailing objects/batch
  const options = {};
  let i = 0;
  for (; i < segments.length; i++) {
    const eq = segments[i].indexOf("=");
    if (eq === -1) break;
    const key = decodeURIComponent(segments[i].slice(0, eq));
    options[key] = decodeURIComponent(segments[i].slice(eq + 1));
  }
  return { options, target: segments.slice(i).join("/") };
}

export async function handleBatch(req, env, url) {
  const auth = parseAuthorization(req);
  if (auth.error === "missing") {
    // Spec: LFS-Authenticate (not WWW-Authenticate) so browsers don't prompt for a password.
    return lfsError(401, "Authentication required.", { "LFS-Authenticate": 'Basic realm="Git LFS"' });
  }
  if (auth.error) return lfsError(400, "Malformed Authorization header.");

  let target, options;
  try {
    ({ target, options } = parsePath(url.pathname));
  } catch {
    return lfsError(400, "Malformed request path.");
  }
  if (!isWellFormedTarget(target)) {
    return lfsError(400, "Malformed or incomplete object store endpoint or bucket in the URL path.");
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return lfsError(400, "Request body is not valid JSON.");
  }
  if (body === null || typeof body !== "object") {
    return lfsError(422, "Request body must be a JSON object.");
  }

  const { objects, operation, hash_algo = "sha256" } = body;
  if (hash_algo !== "sha256") {
    return lfsError(422, `Unsupported hash algorithm '${String(hash_algo)}'. Only 'sha256' is supported.`);
  }
  if (operation !== "upload" && operation !== "download") {
    return lfsError(422, "Field 'operation' must be 'upload' or 'download'.");
  }
  if (!Array.isArray(objects) || objects.length === 0) {
    return lfsError(422, "Field 'objects' must be a non-empty array.");
  }
  if (objects.length > MAX_BATCH_OBJECTS) {
    return lfsError(413, `Too many objects in batch (maximum ${MAX_BATCH_OBJECTS}).`);
  }

  const client = createS3Client(auth.user, auth.pass, options);
  const expiresIn = parseExpiry(env?.EXPIRY);
  const method = METHOD_FOR[operation];

  const resultObjects = await Promise.all(
    objects.map(async (obj) => {
      const oid = obj == null ? undefined : obj.oid;
      const size = obj == null ? undefined : obj.size;
      if (!isValidOid(oid)) {
        return { oid, size, error: { code: 422, message: "Invalid oid; expected a 64-character lowercase hex sha-256 digest." } };
      }
      if (!isValidSize(size)) {
        return { oid, size, error: { code: 422, message: "Invalid size; expected a non-negative integer." } };
      }
      return {
        oid,
        size,
        authenticated: true,
        actions: { [operation]: { href: await presign(client, target, oid, method, expiresIn), expires_in: expiresIn } },
      };
    }),
  );

  return new Response(JSON.stringify({ transfer: "basic", hash_algo: "sha256", objects: resultObjects }), {
    status: 200,
    headers: LFS_HEADERS,
  });
}
