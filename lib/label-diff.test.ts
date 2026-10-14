import { test } from "node:test";
import assert from "node:assert/strict";
import { diffLabels } from "./label-diff";

test("diffLabels adds and removes without replacing the unchanged set", () => {
  assert.deepEqual(diffLabels(["human", "bug"], ["human", "review"]), {
    add: ["review"],
    remove: ["bug"],
  });
  assert.deepEqual(diffLabels(["human"], ["human"]), { add: [], remove: [] });
  assert.deepEqual(diffLabels(["a", "b"], []), { add: [], remove: ["a", "b"] });
  assert.deepEqual(diffLabels([], ["human"]), { add: ["human"], remove: [] });
});
