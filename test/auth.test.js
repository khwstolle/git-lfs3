import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAuthorization } from "../src/auth.js";

function reqWith(authHeader) {
  const headers = {};
  if (authHeader !== undefined) headers.Authorization = authHeader;
  return new Request("https://x.dev/", { headers });
}

test("missing header → error missing", () => {
  assert.deepEqual(parseAuthorization(reqWith(undefined)), { error: "missing" });
});

test("non-Basic scheme → error malformed", () => {
  assert.equal(parseAuthorization(reqWith("Bearer abc")).error, "malformed");
});

test("Basic scheme is case-insensitive", () => {
  const r = parseAuthorization(reqWith("basic " + btoa("k:s")));
  assert.deepEqual(r, { user: "k", pass: "s" });
});

test("malformed base64 → error malformed", () => {
  assert.equal(parseAuthorization(reqWith("Basic @@@not-base64@@@")).error, "malformed");
});

test("missing colon → error malformed", () => {
  assert.equal(parseAuthorization(reqWith("Basic " + btoa("nocolon"))).error, "malformed");
});

test("valid pair parses", () => {
  assert.deepEqual(parseAuthorization(reqWith("Basic " + btoa("AKID:SECRET"))), {
    user: "AKID",
    pass: "SECRET",
  });
});

test("password may contain colons", () => {
  const r = parseAuthorization(reqWith("Basic " + btoa("user:a:b:c")));
  assert.deepEqual(r, { user: "user", pass: "a:b:c" });
});
