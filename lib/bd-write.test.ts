import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createBdStore } from "./bd-cli";

const root = path.join(os.homedir(), "data", "scratch");
const beadsDir = path.join(root, ".beads");
const ready = fs.existsSync(path.join(beadsDir, "metadata.json"));

test(
  "create, drag, respond, and close against the scratch store",
  { skip: ready ? false : "scratch store is not on this machine" },
  async () => {
    const store = createBdStore(root, {
      cwd: root,
      beadsDir,
      bdName: "scratch",
      sharedServer: true,
    });
    const title = `scotty write-path ${Date.now()}`;
    let id: string | undefined;
    try {
      const created = await store.create(
        {
          title,
          issue_type: "task",
          priority: 4,
          description: "temporary write-path probe",
          assignee: "",
          labels: ["human"],
          parent: "",
          backlog: false,
        },
        "scotty-test",
      );
      id = created.id;
      assert.match(id, /^scratch-/);
      assert.equal(created.status, "open");
      assert.ok((created.labels ?? []).includes("human"));

      const dragged = await store.setStatus(id, "in_progress", "scotty-test");
      assert.equal(dragged.status, "in_progress");

      const commented = await store.addComment(id, "probe response", "scotty-test");
      const sawComment =
        (commented.comments ?? []).some((c) => c.text.includes("probe response")) ||
        (commented.comment_count ?? 0) > 0;
      assert.equal(sawComment, true);

      const cleared = await store.removeLabel(id, "human", "scotty-test");
      assert.equal((cleared.labels ?? []).includes("human"), false);

      const closed = await store.setStatus(id, "closed", "scotty-test", "write-path probe");
      assert.equal(closed.status, "closed");
    } finally {
      if (id) await store.remove(id, "scotty-test");
    }
    if (id) assert.equal(await store.get(id), null);
  },
);
