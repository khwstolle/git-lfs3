export const LFS_MEDIA_TYPE = "application/vnd.git-lfs+json";
export const DOC_URL = "https://github.com/khwstolle/git-lfs3#readme";

// Headers for every LFS JSON response. no-store: signed URLs/credentials must not cache.
export const LFS_HEADERS = {
  "Content-Type": LFS_MEDIA_TYPE,
  "Cache-Control": "no-store",
};

// Build a Git LFS spec error response: { message, documentation_url }, no `objects`.
// `message` must never include credentials, the Authorization header, or a stack trace.
export function lfsError(status, message, extraHeaders = {}) {
  return new Response(JSON.stringify({ message, documentation_url: DOC_URL }), {
    status,
    headers: { ...LFS_HEADERS, ...extraHeaders },
  });
}
