/**
 * Non-loopback binds require SCOTTY_BASIC_AUTH=user:password.
 * Same rule as lib/basic-auth.ts serveBindRefusal — this copy is plain JS
 * so scripts/serve.mjs can load it without a TypeScript loader.
 */
export function serveBindRefusal(host, authSpec) {
  const h = String(host).trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return null;
  if (typeof authSpec === "string") {
    const i = authSpec.indexOf(":");
    if (i > 0) return null;
  }
  return `Refusing to bind ${host} without SCOTTY_BASIC_AUTH=user:password. Loopback is open; a LAN or tailnet bind needs basic auth.`;
}
