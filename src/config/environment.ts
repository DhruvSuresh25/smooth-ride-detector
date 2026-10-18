/** Pure validation only. Read server environment variables inside a handler, then pass them here. */
export function requireBackendConfig(url: string | undefined, key: string | undefined) {
  if (!url || !key) throw new Error("The service is not configured. Please try again later.");
  return { url, key };
}