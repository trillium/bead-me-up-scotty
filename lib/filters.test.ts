import { test } from "node:test";
import assert from "node:assert/strict";
import type { Bead } from "./schema";
import { emptyFilters, matchesFilters } from "./filters";

const report = {
  id: "brain-g1gc7",
  title: "Research: Beads-native shared day planning",
  issue_type: "spike",
  status: "closed",
  priority: 2,
  description: "Summary of shared planning research.",
  notes: "See https://github.com/gastownhall/beads for the canonical source.",
  design: "Keep Beads as the authoritative work graph.",
  acceptance_criteria: "Human and agents can review the plan.",
  comments: [{ author: "scout", text: "Source discussion: CalDAV is a projection.", created_at: "2026-10-02" }],
  labels: ["research"],
} as Bead;

function search(q: string) {
  return matchesFilters(report, { ...emptyFilters, search: q }, []);
}

test("report search includes long-form planning fields", () => {
  assert.equal(search("authoritative work graph"), true);
  assert.equal(search("Human and agents"), true);
});

test("report search includes source URLs and comments", () => {
  assert.equal(search("github.com/gastownhall/beads"), true);
  assert.equal(search("CalDAV is a projection"), true);
});

test("report search still excludes unrelated text", () => {
  assert.equal(search("unrelated needle"), false);
});
