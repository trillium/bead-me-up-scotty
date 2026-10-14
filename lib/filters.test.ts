import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyFilters, labelOptionsFrom, matchesFilters } from "./filters";
import type { Bead } from "./schema";

test("empty status, type, priority, origin, and label filters keep a closed task", () => {
  const bead = {
    id: "brain-1",
    title: "Keep me",
    status: "closed",
    issue_type: "task",
    priority: 2,
    labels: [],
  } as Bead;
  assert.equal(matchesFilters(bead, emptyFilters, []), true);
});

test("the human review label is always a filter option", () => {
  const options = labelOptionsFrom([]);
  assert.deepEqual(options, [{ value: "human", label: "human" }]);
  const withBug = labelOptionsFrom([{ labels: ["bug", "archived"] } as Bead]);
  assert.deepEqual(
    withBug.map((o) => o.value),
    ["bug", "human"],
  );
});
