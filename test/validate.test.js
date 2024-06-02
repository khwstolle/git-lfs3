import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidOid,
  isValidSize,
  parseExpiry,
  isWellFormedTarget,
  MIN_EXPIRY,
  MAX_EXPIRY,
  DEFAULT_EXPIRY,
} from "../src/validate.js";

const HEX64 = "a".repeat(64);

test("isValidOid accepts 64-char lowercase hex", () => {
  assert.equal(isValidOid(HEX64), true);
  assert.equal(isValidOid("0123456789abcdef".repeat(4)), true);
});

test("isValidOid rejects bad oids", () => {
  assert.equal(isValidOid(HEX64.toUpperCase()), false, "uppercase");
  assert.equal(isValidOid("a".repeat(63)), false, "too short");
  assert.equal(isValidOid("a".repeat(65)), false, "too long");
  assert.equal(isValidOid("../../etc/passwd"), false, "traversal");
  assert.equal(isValidOid("a".repeat(32) + "/" + "a".repeat(31)), false, "slash");
  assert.equal(isValidOid(undefined), false);
  assert.equal(isValidOid(123), false);
});

test("isValidSize accepts non-negative integers", () => {
  assert.equal(isValidSize(0), true);
  assert.equal(isValidSize(123), true);
});

test("isValidSize rejects non-integers and negatives", () => {
  assert.equal(isValidSize(-1), false);
  assert.equal(isValidSize(1.5), false);
  assert.equal(isValidSize("1"), false);
  assert.equal(isValidSize(NaN), false);
  assert.equal(isValidSize(undefined), false);
});

test("parseExpiry clamps and defaults", () => {
  assert.equal(parseExpiry(undefined), DEFAULT_EXPIRY);
  assert.equal(parseExpiry("abc"), DEFAULT_EXPIRY);
  assert.equal(parseExpiry("7200"), 7200);
  assert.equal(parseExpiry(7200), 7200);
  assert.equal(parseExpiry("999999999"), MAX_EXPIRY);
  assert.equal(parseExpiry("0"), MIN_EXPIRY);
  assert.equal(parseExpiry("-5"), MIN_EXPIRY);
});

test("parseExpiry treats blank/null as unset (not 1 second)", () => {
  // A defined-but-empty env binding must fall back to the default, not clamp to 1s.
  assert.equal(parseExpiry(""), DEFAULT_EXPIRY);
  assert.equal(parseExpiry("   "), DEFAULT_EXPIRY);
  assert.equal(parseExpiry(null), DEFAULT_EXPIRY);
});

test("isWellFormedTarget requires endpoint + bucket and rejects malformed paths", () => {
  assert.equal(isWellFormedTarget("s3.example.com/my-bucket"), true);
  assert.equal(isWellFormedTarget("minio.local:9000/bucket"), true, "ports allowed");
  assert.equal(isWellFormedTarget("host/path/bucket"), true, "path-prefixed endpoint allowed");
  assert.equal(isWellFormedTarget("only-endpoint"), false, "no bucket");
  assert.equal(isWellFormedTarget("s3.example.com/bucket/"), false, "trailing empty segment");
  assert.equal(isWellFormedTarget("/s3.example.com/bucket"), false, "leading empty segment");
  assert.equal(isWellFormedTarget("s3.example.com/buck//et"), false, "embedded empty segment");
  assert.equal(isWellFormedTarget("user:pw@evil.com/bucket"), false, "embedded credentials");
  assert.equal(isWellFormedTarget("s3.example.com:99999/bucket"), false, "out-of-range port");
  assert.equal(isWellFormedTarget(""), false);
});
