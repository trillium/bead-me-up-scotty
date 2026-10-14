import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeBasic, serveBindRefusal } from "./basic-auth";
import { serveBindRefusal as serveBindRefusalMjs } from "../scripts/bind-guard.mjs";

function header(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

test("auth is off when SCOTTY_BASIC_AUTH is unset", () => {
  assert.equal(authorizeBasic(null, undefined), "off");
  assert.equal(authorizeBasic(null, "not-a-pair"), "off");
});

test("basic auth accepts the configured user and rejects the rest", () => {
  const spec = "trillium:secret";
  assert.equal(authorizeBasic(null, spec), "deny");
  assert.equal(authorizeBasic(header("trillium", "nope"), spec), "deny");
  assert.equal(authorizeBasic(header("other", "secret"), spec), "deny");
  assert.equal(authorizeBasic(header("trillium", "secret"), spec), "ok");
  assert.equal(authorizeBasic(header("trillium", "secret:extra"), "trillium:secret:extra"), "ok");
});

test("non-loopback binds need basic auth", () => {
  assert.equal(serveBindRefusal("127.0.0.1", undefined), null);
  assert.equal(serveBindRefusal("localhost", undefined), null);
  assert.equal(serveBindRefusal("::1", undefined), null);
  assert.match(serveBindRefusal("0.0.0.0", undefined) ?? "", /SCOTTY_BASIC_AUTH/);
  assert.equal(serveBindRefusal("0.0.0.0", "trillium:secret"), null);
  assert.match(serveBindRefusalMjs("0.0.0.0", undefined) ?? "", /SCOTTY_BASIC_AUTH/);
  assert.equal(serveBindRefusalMjs("127.0.0.1", undefined), null);
  assert.equal(serveBindRefusalMjs("0.0.0.0", "trillium:secret"), null);
});
