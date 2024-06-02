import { AwsClient } from "aws4fetch";

// Only these path-encoded options are forwarded to the S3 client. This prevents a
// crafted URL from overriding accessKeyId/secretAccessKey or injecting arbitrary config.
export const WHITELISTED_OPTIONS = new Set(["region", "service", "sessionToken"]);

// Build an AwsClient from credentials + whitelisted path options.
// service defaults to "s3": aws4fetch does NOT default it, and leaves it empty for
// non-AWS hosts (R2/B2/Wasabi), which produces an invalid SigV4 credential scope.
export function createS3Client(accessKeyId, secretAccessKey, options) {
  const config = { accessKeyId, secretAccessKey, service: "s3" };
  for (const key of WHITELISTED_OPTIONS) {
    // Skip empty values so e.g. a stray `service=` cannot blank out the "s3" default.
    if (Object.prototype.hasOwnProperty.call(options, key) && options[key] !== "") {
      config[key] = options[key];
    }
  }
  return new AwsClient(config);
}

// Presign a path-style URL `https://<target>/<oid>`. `target` is "<endpoint>/<bucket>".
// X-Amz-Expires must be in the URL query before signing (aws4fetch reads it from there,
// not from a sign option). signQuery makes this pure local crypto — no network request.
export async function presign(client, target, oid, method, expiresIn) {
  const url = `https://${target}/${oid}?X-Amz-Expires=${expiresIn}`;
  const signed = await client.sign(new Request(url, { method }), { aws: { signQuery: true } });
  return signed.url;
}
