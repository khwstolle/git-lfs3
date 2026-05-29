# Security Policy

## How git-lfs3 handles credentials (trust model)

git-lfs3 is a **stateless presigner**. Your Git client sends an S3 access key id and
secret access key as HTTP Basic credentials in the LFS URL. For each requested object the
worker computes a time-limited S3 [presigned URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
and returns it; your client then transfers bytes **directly** to/from the object store.

- The worker **never stores** your credentials and does not log them.
- Signing happens **in-memory and offline** (`aws4fetch` computes the signature locally);
  the worker makes **no outbound request** with your secret.
- Your S3 credentials *are* the authorization. A read-only key yields read-only URLs.
  For public repositories, commit only a **read-only** key in `.lfsconfig` and distribute
  the read/write key out of band (see the README).
- Object ids are validated as sha-256 hex before use as object keys, preventing path
  traversal into other keys or buckets.
- Presigned URLs expire (`EXPIRY`, default 3600s, clamped to S3's 1–604800s range).

Anyone who can read your LFS URL can use the embedded credentials against your bucket, so
treat the URL itself as a secret and prefer per-repository, least-privilege keys.

## Reporting a vulnerability

Please report security issues privately via GitHub Security Advisories
("Report a vulnerability" on the repository's **Security** tab) rather than a public issue.
