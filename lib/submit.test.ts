import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSubmitInput,
  parseLabelsInput,
  submitErrorMessage,
  validateSubmitTitle,
} from "./submit";

// Validation: title required, inline error when empty.

test("validateSubmitTitle rejects empty and whitespace-only titles", () => {
  assert.equal(validateSubmitTitle(""), "Title is required");
  assert.equal(validateSubmitTitle("   "), "Title is required");
});

test("validateSubmitTitle accepts a real title", () => {
  assert.equal(validateSubmitTitle("Fix the login redirect"), null);
  assert.equal(validateSubmitTitle("  padded title  "), null);
});

// Labels: multi/tag input, optional.

test("parseLabelsInput splits comma-separated tags and trims", () => {
  assert.deepEqual(parseLabelsInput("ui, dnd, m3"), ["ui", "dnd", "m3"]);
});

test("parseLabelsInput tolerates empty input and stray commas", () => {
  assert.deepEqual(parseLabelsInput(""), []);
  assert.deepEqual(parseLabelsInput("  "), []);
  assert.deepEqual(parseLabelsInput("ui,, ,dnd,"), ["ui", "dnd"]);
});

// Success receipt path: the payload sent to the bead-creation endpoint.

test("buildSubmitInput trims the title and carries labels + description", () => {
  assert.deepEqual(buildSubmitInput("  New bead  ", "ui, dnd", "Some details"), {
    title: "New bead",
    issue_type: "task",
    priority: 2,
    description: "Some details",
    assignee: "",
    labels: ["ui", "dnd"],
    parent: "",
    backlog: false,
  });
});

test("buildSubmitInput works with labels and description omitted", () => {
  const input = buildSubmitInput("Bare bead", "", "");
  assert.equal(input.title, "Bare bead");
  assert.deepEqual(input.labels, []);
  assert.equal(input.description, "");
});

// Failure path: inline error with the form state preserved.

test("submitErrorMessage prefers the server error message", () => {
  assert.equal(submitErrorMessage(new Error("Request failed (500)")), "Request failed (500)");
});

test("submitErrorMessage falls back when the error has no message", () => {
  assert.equal(submitErrorMessage(null), "Couldn’t create the bead — try again");
  assert.equal(submitErrorMessage(new Error("")), "Couldn’t create the bead — try again");
});
