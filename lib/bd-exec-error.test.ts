import { test } from "node:test";
import assert from "node:assert/strict";
import { bdErrorFromExec } from "./bd-cli";
import { beadCountLabel } from "./beads-view";

test("an oversized bd export is an overflow, not an empty store", () => {
  const err = bdErrorFromExec({
    code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER",
    message: "stdout maxBuffer length exceeded",
  });
  assert.equal(err.code, "overflow");
  assert.match(err.message, /not an empty store/);
});

test("a killed bd process is a timeout", () => {
  const err = bdErrorFromExec({ killed: true, message: "spawn timed out" });
  assert.equal(err.code, "timeout");
});

test("the list headline stays off zero while the first load is in flight", () => {
  assert.equal(beadCountLabel(0, 0, true, "drag to set run-order"), "Loading beads…");
  assert.equal(
    beadCountLabel(2058, 2063, false, "drag to set run-order"),
    "2058 beads · drag to set run-order",
  );
});

