# Git LFS S3 Proxy

A [Git LFS](https://git-lfs.com/) server that runs on [Cloudflare Pages](https://pages.cloudflare.com/) and stores objects in any S3-compatible bucket.

Why use it:

- **Cheaper than GitHub LFS.** GitHub charges $0.0875/GiB transfer above 10 GiB/month across all repos [and forks](https://docs.github.com/en/repositories/working-with-files/managing-large-files/collaboration-with-git-large-file-storage#pushing-large-files-to-forks), and $0.07/GB-month for storage. Backed by [R2](https://developers.cloudflare.com/r2), this proxy makes transfer free and drops storage to $0.015/GB-month.
- **Serve assets directly.** Latency is low enough to [serve whole websites](https://github.com/khwstolle/git-lfserve) from LFS, which also bypasses the [25 MiB Cloudflare Pages file size limit](https://developers.cloudflare.com/pages/platform/limits/#file-size).

## How it works

git-lfs3 implements the [Git LFS Batch API](https://github.com/git-lfs/git-lfs/blob/main/docs/api/batch.md). For each object your client asks to transfer, the worker presigns a time-limited, path-style S3 URL using the S3 credentials from your LFS URL and returns it; your client then uploads/downloads bytes **directly** to/from the bucket. The worker is stateless — it never stores your credentials and sends no outbound request on your behalf. See [SECURITY.md](SECURITY.md) for the full trust model.

You can supply `region`/`service`/`sessionToken` as `key=value` path segments before the endpoint (e.g. `…@<INSTANCE>/region=auto/<ENDPOINT>/<BUCKET>`). `service` defaults to `s3`. Cloudflare R2 works with the defaults; **Amazon S3 requires the bucket's region** (e.g. `region=us-east-1`).

Because the worker is stateless and never contacts the store, a few behaviors follow:

- It cannot tell whether an object already exists, so `git lfs push` re-uploads every object (an S3 `PUT` of identical content is idempotent, so this is harmless — just extra transfer).
- The worker still returns a signed URL for an object missing from the bucket; the failure surfaces later as an S3 transfer error rather than a Git LFS "not found" message.
- The worker signs at most 1000 objects per batch request; Git LFS chunks larger transfers automatically.

## Deploy the proxy

Fork this repository, then create a Cloudflare Pages project connected to your fork:

- **Framework preset:** None.
- **Build command:** `npm install --omit=dev` (installs [`aws4fetch`](https://www.npmjs.com/package/aws4fetch) for Cloudflare's bundler; `--omit=dev` skips the local-dev/test tooling so it isn't uploaded as static assets).
- **Build output directory:** `/`.

After the first deploy, Cloudflare assigns the project a `*.pages.dev` hostname (you can also attach a custom domain). This hostname becomes `<INSTANCE>` in later steps.

To change the signed URL lifetime, set the `EXPIRY` environment variable (seconds; default 3600). The worker clamps `EXPIRY` to S3's allowed range of 1–604800 seconds (7 days); empty, unset, or non-numeric values fall back to the 3600-second default.

Visiting the deployment in a browser shows a short landing page explaining how to point a Git client at it (try [lfs.khws.io](https://lfs.khws.io)).

## Connect an S3-compatible bucket

### Create a bucket and access key

On an S3-compatible object store, create a bucket to host your LFS assets and an access key with read/write permission for it. Each provider names the credential pair differently; the links below cover both steps. Options, cheapest first:

- **Cloudflare R2** — [create a bucket](https://developers.cloudflare.com/r2/buckets/create-buckets/), then an [Access Key ID and Secret Access Key](https://developers.cloudflare.com/r2/api/s3/tokens/).
- **Backblaze B2** — [create a bucket](https://help.backblaze.com/hc/en-us/articles/1260803542610-Creating-a-B2-Bucket-using-the-Web-UI), then an [Application Key ID and Application Key](https://www.backblaze.com/docs/cloud-storage-create-and-manage-app-keys).
- **Wasabi** — [create a bucket](https://docs.wasabi.com/docs/creating-a-bucket), then an [Access Key and Secret Key](https://knowledgebase.wasabi.com/hc/en-us/articles/360019677192-Creating-a-Wasabi-API-Access-Key-Set).
- **Amazon S3** — [create a bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-bucket.html), then an [Access Key ID and Secret Access Key](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_CreateAccessKey), ideally scoped to a dedicated [IAM user](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html).
- **Google Cloud Storage** — [create a bucket](https://cloud.google.com/storage/docs/creating-buckets), then an [HMAC Key Access ID and HMAC Key Secret](https://cloud.google.com/storage/docs/authentication/managing-hmackeys), ideally scoped to a [service account](https://cloud.google.com/iam/docs/service-accounts-create).
- **Linode Object Storage** — [create a bucket](https://www.linode.com/docs/products/storage/object-storage/guides/manage-buckets/), then an [Access Key and Secret Key](https://www.linode.com/docs/products/storage/object-storage/get-started/#generate-an-access-key).
- **DigitalOcean Spaces** — [create a bucket](https://docs.digitalocean.com/products/spaces/how-to/create/), then an [Access Key and Secret Key](https://docs.digitalocean.com/products/spaces/how-to/manage-access/#access-keys).

R2 has the most generous free tier — 10 GB of storage, 1 million writes and 10 million reads per month, and unlimited bandwidth — and shares datacenters with the [LFS Client Worker](https://github.com/khwstolle/git-lfserve).

Whatever the provider's labels, the credential is a pair: an access key ID such as `AKIAIOSFODNN7EXAMPLE` and a secret access key such as `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`. URL-encode either value if it contains non-alphanumeric characters.

### Build the LFS server URL

The URL template is:

```sh
https://<ACCESS_KEY_ID>:<SECRET_ACCESS_KEY>@<INSTANCE>/<ENDPOINT>/<BUCKET>
```

Placeholders:

- `<ACCESS_KEY_ID>`, `<SECRET_ACCESS_KEY>`: from [Create a bucket and access key](#create-a-bucket-and-access-key).
- `<INSTANCE>`: the Cloudflare Pages hostname (e.g. `lfs.khws.io`, or a custom domain).
- `<ENDPOINT>`: the S3-compatible API endpoint for your object store.
- `<BUCKET>`: the bucket name from [Create a bucket and access key](#create-a-bucket-and-access-key).

**Example.** For an R2 bucket `my-site` (Cloudflare [account ID](https://developers.cloudflare.com/fundamentals/get-started/basic-tasks/find-account-and-zone-ids/) `7795d95f5507a0c89bd1ed3de8b57061`), access key `ed41437d53a69dfc:dc49cbe38583b850a7454c89d74fcd51`, and proxy at `lfs.khws.io`, the URL is:

```sh
https://ed41437d53a69dfc:dc49cbe38583b850a7454c89d74fcd51@lfs.khws.io/7795d95f5507a0c89bd1ed3de8b57061.r2.cloudflarestorage.com/my-site
```

## Install Git LFS on your workstation

Check whether you already have Git LFS:

```sh
git lfs version
```

If the command reports `git: 'lfs' is not a git command`, follow the upstream [installation instructions](https://github.com/git-lfs/git-lfs#installing).

Then set up the smudge and clean filters for your user account:

```sh
git lfs install
```

## Fetch existing LFS objects (only if migrating)

Fetch a local copy of every existing object **before** changing the LFS URL:

```sh
git lfs fetch --all
```

## Point Git at the proxy

Two ways, depending on who can push:

- **Separate read and write keys.** The committed `.lfsconfig` carries only a read-only URL; the read/write key reaches each clone out-of-band. Use this for public repos and most private repos with several collaborators.
- **Shared read/write key.** The committed `.lfsconfig` carries the read/write URL, so anyone with a clone can push. Simpler, less secure.

### Separate read and write keys

[Create another access key](#create-a-bucket-and-access-key) with read-only permission, [build a server URL](#build-the-lfs-server-url) with it, and add the URL to an `.lfsconfig` file at the root of your repository:

```sh
cd "$(git rev-parse --show-toplevel)"  # move to root of repository
git config -f .lfsconfig lfs.url 'https://<RO_ACCESS_KEY_ID>:<RO_SECRET_ACCESS_KEY>@<INSTANCE>/<ENDPOINT>/<BUCKET>'
git add .lfsconfig
git commit -m "Add .lfsconfig"
```

To grant a clone write access, add a read/write URL to its `.git/config`:

```sh
git config lfs.url 'https://<RW_ACCESS_KEY_ID>:<RW_SECRET_ACCESS_KEY>@<INSTANCE>/<ENDPOINT>/<BUCKET>'
```

Git does not commit `.git/config`, so the read/write key stays private.

### Shared read/write key

Put the read/write URL directly in `.lfsconfig`. Anyone with a clone can then push:

```sh
cd "$(git rev-parse --show-toplevel)"  # move to root of repository
git config -f .lfsconfig lfs.url 'https://<RW_ACCESS_KEY_ID>:<RW_SECRET_ACCESS_KEY>@<INSTANCE>/<ENDPOINT>/<BUCKET>'
git add .lfsconfig
git commit -m "Add .lfsconfig"
```

## Push existing LFS objects to the proxy (only if migrating)

After pointing Git at the proxy, push every fetched object to the new server:

```sh
git lfs push --all origin
```

## Track files with Git LFS

After Git points at the proxy, use Git LFS as usual. A few common operations:

- Route any `.iso` files added in future commits through Git LFS, with [`git lfs track`](https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-track.adoc):

  ```sh
  git lfs track '*.iso'
  git add .gitattributes
  git commit -m "Add .iso files to Git LFS"
  ```

- Move all existing `.iso` files into Git LFS, with [`git lfs migrate`](https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-migrate.adoc) (this rewrites history):

  ```sh
  git fetch --all
  git lfs migrate import --everything --include='*.iso'
  git push --all --force-with-lease
  ```

- Move every existing file above 25 MiB into Git LFS (also rewrites history):

  ```sh
  git fetch --all
  git lfs migrate import --everything --above=25MiB
  git push --all --force-with-lease
  ```

See the upstream [Git LFS examples](https://github.com/git-lfs/git-lfs#example-usage) for more operations.

## Development

```sh
npm install            # install runtime + dev dependencies
npm test               # run the offline test suite (node --test)
npm run check:bundle   # verify the worker bundles the way Cloudflare Pages bundles it
npm run dev            # serve locally with Wrangler (fetched on demand via npx)
```

The worker logic lives in `src/`; `_worker.js` is the entry point Cloudflare bundles. Tests are offline because S3 signing is local crypto (no network).

## License

[MIT](LICENSE) © 2026 Kurt Stolle
