import { test } from "node:test";
import assert from "node:assert/strict";
import type { Bead } from "./schema";
import { resolveCommandInput, isBeadIdShape } from "./command-engine";

// resolveBeadId only reads the Map's keys, never the values, so a bare cast is
// enough to stand in for a real Bead here.
function indexOf(...ids: string[]): Map<string, Bead> {
  return new Map(ids.map((id) => [id, {} as Bead]));
}
const empty = { index: indexOf() };

test("isBeadIdShape accepts bare <store>-<suffix> ids", () => {
  for (const id of ["task-jodb", "brain-av6h", "review-3c71.2", "nightshift-tasks-abc1", "bd-1a2b"]) {
    assert.equal(isBeadIdShape(id), true, id);
  }
});

test("isBeadIdShape rejects non-ids (words, phrases, partials)", () => {
  for (const s of ["clear", "board", "never mind", "open", "", "task-", "-jodb", "show open"]) {
    assert.equal(isBeadIdShape(s), false, JSON.stringify(s));
  }
});

test("bare id NOT in the index defers to a server lookup", () => {
  assert.deepEqual(resolveCommandInput("task-jodb", empty), { verb: "lookupBead", id: "task-jodb" });
});

test("bare id IN the index opens it directly, canonical-cased", () => {
  const ctx = { index: indexOf("task-jodb") };
  assert.deepEqual(resolveCommandInput("TASK-JODB", ctx), { verb: "openBead", id: "task-jodb" });
});

test('"open {id}" still works and also falls back to a cross-store lookup', () => {
  assert.deepEqual(resolveCommandInput("open task-jodb", empty), { verb: "lookupBead", id: "task-jodb" });
  const ctx = { index: indexOf("task-jodb") };
  assert.deepEqual(resolveCommandInput("open task-jodb", ctx), { verb: "openBead", id: "task-jodb" });
  assert.deepEqual(resolveCommandInput("jump to task-jodb", ctx), { verb: "openBead", id: "task-jodb" });
});

test("existing non-bead commands are unaffected", () => {
  assert.deepEqual(resolveCommandInput("show open", empty), { verb: "setStatusFilter", status: "open" });
  assert.deepEqual(resolveCommandInput("go to board", empty), { verb: "switchView", view: "board" });
  assert.deepEqual(resolveCommandInput("clear filters", empty), { verb: "clearFilters" });
  assert.deepEqual(resolveCommandInput("clear", empty), { verb: "clear" });
  assert.deepEqual(resolveCommandInput("never mind", empty), { verb: "clear" });
});

test("a plain word that isn't a command or an id shape returns null", () => {
  assert.equal(resolveCommandInput("frobnicate", empty), null);
});
