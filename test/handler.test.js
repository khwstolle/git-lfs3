import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/router.js";

const OID = "abc123".padEnd(64, "0"); // 64 lowercase hex chars
const HOST = "lfs.example.dev";

function req({ path = "/s3.example.com/my-bucket/objects/batch", method = "POST", auth = "AKID:SECRET", body, rawBody } = {}) {
  const headers = {};
  if (auth) headers.Authorization = "Basic " + btoa(auth);
  const init = { method, headers };
  if (rawBody !== undefined) init.body = rawBody;
  else if (body !== undefined) init.body = JSON.stringify(body);
  return new Request("https://" + HOST + path, init);
}
const batch = (extra) => ({ operation: "download", objects: [{ oid: OID, size: 1 }], ...extra });

test("GET / returns the landing page with the request host", async () => {
  const res = await handleRequest(new Request("https://" + HOST + "/"), {});
  assert.equal(res.status, 200);
  assert.match(res.headers.get("Content-Type"), /text\/html/);
  const html = await res.text();
  assert.match(html, /Git LFS endpoint/);
  assert.ok(html.includes(HOST), "injects the visitor's host");
});

test("non-GET on / → 405 Allow: GET", async () => {
  const res = await handleRequest(new Request("https://" + HOST + "/", { method: "POST" }), {});
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("Allow"), "GET");
});

test("unknown path → 404", async () => {
  const res = await handleRequest(new Request("https://" + HOST + "/nope"), {});
  assert.equal(res.status, 404);
});

test("non-POST batch → 405 Allow: POST", async () => {
  const res = await handleRequest(req({ method: "GET", body: undefined }), {});
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("Allow"), "POST");
});

test("missing auth → 401 with LFS-Authenticate (not WWW-Authenticate)", async () => {
  const res = await handleRequest(req({ auth: null, body: batch() }), {});
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("LFS-Authenticate"), 'Basic realm="Git LFS"');
  assert.equal(res.headers.get("WWW-Authenticate"), null);
});

test("malformed auth → 400", async () => {
  const bad = new Request("https://" + HOST + "/s3.example.com/b/objects/batch", {
    method: "POST",
    headers: { Authorization: "Bearer x" },
    body: JSON.stringify(batch()),
  });
  assert.equal((await handleRequest(bad, {})).status, 400);
});

test("invalid JSON body → 400", async () => {
  const res = await handleRequest(req({ rawBody: "{not json" }), {});
  assert.equal(res.status, 400);
});

test("unsupported hash_algo → 422", async () => {
  const res = await handleRequest(req({ body: batch({ hash_algo: "sha1" }) }), {});
  assert.equal(res.status, 422);
});

test("invalid operation → 422", async () => {
  const res = await handleRequest(req({ body: batch({ operation: "frob" }) }), {});
  assert.equal(res.status, 422);
});

test("empty objects → 422", async () => {
  const res = await handleRequest(req({ body: batch({ objects: [] }) }), {});
  assert.equal(res.status, 422);
});

test("download happy path signs a path-style URL", async () => {
  const res = await handleRequest(req({ body: batch() }), {});
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.transfer, "basic");
  const o = json.objects[0];
  assert.equal(o.oid, OID);
  assert.equal(o.authenticated, true);
  const href = o.actions.download.href;
  assert.ok(href.startsWith("https://s3.example.com/my-bucket/" + OID + "?"), href);
  const params = new URL(href).searchParams;
  assert.ok(params.get("X-Amz-Signature"));
  assert.equal(params.get("X-Amz-Expires"), "3600");
  // service defaults to s3, region defaults to us-east-1 → visible in the credential scope
  assert.match(params.get("X-Amz-Credential"), /\/us-east-1\/s3\/aws4_request$/);
  assert.equal(o.actions.download.expires_in, 3600);
});

test("signature is stable per method and changes with the method (frozen clock)", async () => {
  // Freeze Date so X-Amz-Date is identical across calls: then a signature difference
  // is attributable only to the HTTP method, and same-method calls must be identical.
  mock.timers.enable({ apis: ["Date"], now: 1_700_000_000_000 });
  try {
    const sig = (json, op) => new URL(json.objects[0].actions[op].href).searchParams.get("X-Amz-Signature");
    const dl1 = await (await handleRequest(req({ body: batch() }), {})).json();
    const dl2 = await (await handleRequest(req({ body: batch() }), {})).json();
    const ul = await (await handleRequest(req({ body: batch({ operation: "upload" }) }), {})).json();
    assert.ok(ul.objects[0].actions.upload.href);
    assert.equal(sig(dl1, "download"), sig(dl2, "download"), "same method + clock → identical signature");
    assert.notEqual(sig(dl1, "download"), sig(ul, "upload"), "method (GET vs PUT) changes the signature");
  } finally {
    mock.timers.reset();
  }
});

test("malformed / incomplete endpoint in path → 400 (not 500)", async () => {
  const paths = [
    "/only-endpoint/objects/batch", // no bucket
    "/user:pw@evil.com/bucket/objects/batch", // embedded credentials
    "/s3.example.com:99999/bucket/objects/batch", // out-of-range port
    "/s3.example.com/my-bucket//objects/batch", // double slash → empty segment
  ];
  for (const path of paths) {
    const res = await handleRequest(req({ path, body: batch() }), {});
    assert.equal(res.status, 400, path);
  }
});

test("empty service= option does not blank out the s3 default", async () => {
  const res = await handleRequest(
    req({ path: "/service=/s3.example.com/my-bucket/objects/batch", body: batch() }),
    {},
  );
  const href = (await res.json()).objects[0].actions.download.href;
  assert.match(new URL(href).searchParams.get("X-Amz-Credential"), /\/s3\/aws4_request$/);
});

test("too many objects → 413", async () => {
  const objects = Array.from({ length: 1001 }, () => ({ oid: OID, size: 1 }));
  const res = await handleRequest(req({ body: { operation: "download", objects } }), {});
  assert.equal(res.status, 413);
});

test("whitelisted region option applies; non-whitelisted key is ignored and doesn't shift bucket", async () => {
  const res = await handleRequest(
    req({ path: "/foo=bar/region=auto/s3.example.com/my-bucket/objects/batch", body: batch() }),
    {},
  );
  const href = (await res.json()).objects[0].actions.download.href;
  assert.ok(href.startsWith("https://s3.example.com/my-bucket/" + OID), href);
  assert.match(new URL(href).searchParams.get("X-Amz-Credential"), /\/auto\/s3\/aws4_request$/);
});

test("EXPIRY env is clamped to the S3 maximum", async () => {
  const res = await handleRequest(req({ body: batch() }), { EXPIRY: "999999999" });
  const href = (await res.json()).objects[0].actions.download.href;
  assert.equal(new URL(href).searchParams.get("X-Amz-Expires"), "604800");
});

test("mixed batch: bad oid → per-object error, good oid → actions, still HTTP 200", async () => {
  const res = await handleRequest(
    req({ body: { operation: "download", objects: [{ oid: OID, size: 1 }, { oid: "ZZZ", size: 2 }] } }),
    {},
  );
  assert.equal(res.status, 200);
  const [good, bad] = (await res.json()).objects;
  assert.ok(good.actions.download.href);
  assert.equal(bad.error.code, 422);
  assert.equal(bad.actions, undefined);
});

test("invalid size → per-object error", async () => {
  const res = await handleRequest(
    req({ body: { operation: "download", objects: [{ oid: OID, size: -5 }] } }),
    {},
  );
  const o = (await res.json()).objects[0];
  assert.equal(o.error.code, 422);
});
