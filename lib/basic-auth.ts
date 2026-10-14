/** `SCOTTY_BASIC_AUTH=user:password`. Unset or malformed means auth is off. */
export function parseAuthSpec(spec: string | undefined): { user: string; password: string } | null {
  if (!spec) return null;
  const i = spec.indexOf(":");
  if (i <= 0) return null;
  return { user: spec.slice(0, i), password: spec.slice(i + 1) };
}

function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function decodeBasic(header: string): string | null {
  const token = header.slice("Basic ".length).trim();
  try {
    return Buffer.from(token, "base64").toString("utf8");
  } catch {
    return null;
  }
}

/** `off` when no credentials are configured. Otherwise `ok` or `deny`. */
export function authorizeBasic(
  authorization: string | null,
  spec: string | undefined,
): "off" | "ok" | "deny" {
  const expected = parseAuthSpec(spec);
  if (!expected) return "off";
  if (!authorization?.startsWith("Basic ")) return "deny";
  const decoded = decodeBasic(authorization);
  if (decoded === null) return "deny";
  const i = decoded.indexOf(":");
  const user = i === -1 ? decoded : decoded.slice(0, i);
  const password = i === -1 ? "" : decoded.slice(i + 1);
  if (safeEqual(user, expected.user) && safeEqual(password, expected.password)) return "ok";
  return "deny";
}

export function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/**
 * Non-loopback binds (LAN, tailnet) require basic auth. Returns the refusal
 * message, or null when the bind is allowed. Keep in step with
 * `scripts/bind-guard.mjs`, which the production launcher actually runs.
 */
export function serveBindRefusal(host: string, authSpec: string | undefined): string | null {
  if (isLoopbackHost(host)) return null;
  if (parseAuthSpec(authSpec)) return null;
  return `Refusing to bind ${host} without SCOTTY_BASIC_AUTH=user:password. Loopback is open; a LAN or tailnet bind needs basic auth.`;
}
