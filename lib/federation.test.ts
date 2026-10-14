import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bdChildEnv,
  classifyProjectPath,
  isFederationParentPath,
  matchBeadsRepo,
  parseStoresList,
  resolveLanding,
  resolveRegistryPath,
  storeIdForBead,
} from "./federation";

const SAMPLE = `
  brain            /Users/me/data/brain/.beads
  task             /Users/me/data/tasks/.beads
  education        /Users/me/data/education
  nightshift-tasks /Users/me/data/nightshift-tasks/.beads
  not a path line
`;

test("parseStoresList keeps registry names and paths", () => {
  const rows = parseStoresList(SAMPLE);
  assert.deepEqual(
    rows.map((r) => r.name),
    ["brain", "task", "education", "nightshift-tasks"],
  );
  assert.equal(rows[1].registryPath, "/Users/me/data/tasks/.beads");
  assert.equal(rows[2].registryPath, "/Users/me/data/education");
});

test("resolveRegistryPath accepts .beads dirs and store roots", () => {
  const exists = (p: string) => p === "/Users/me/data/education/.beads";
  assert.deepEqual(resolveRegistryPath("/Users/me/data/brain/.beads", exists), {
    beadsDir: "/Users/me/data/brain/.beads",
    root: "/Users/me/data/brain",
  });
  assert.deepEqual(resolveRegistryPath("/Users/me/data/education", exists), {
    root: "/Users/me/data/education",
    beadsDir: "/Users/me/data/education/.beads",
  });
  assert.equal(resolveRegistryPath("/Users/me/data/missing", () => false), null);
});

test("storeIdForBead uses the longest registry prefix", () => {
  const ids = ["task", "brain", "nightshift-tasks", "external_llm_tasks"];
  assert.equal(storeIdForBead("task-k74cy", ids), "task");
  assert.equal(storeIdForBead("brain-ne1mm", ids), "brain");
  assert.equal(storeIdForBead("nightshift-tasks-abc", ids), "nightshift-tasks");
  assert.equal(storeIdForBead("external_llm_tasks-zz", ids), "external_llm_tasks");
  assert.equal(storeIdForBead("review-3c71.2", ids), null);
});

const ADD_STORES = [
  { id: "brain", name: "brain", root: "/Users/me/data/brain", beadsDir: "/Users/me/data/brain/.beads" },
  { id: "task", name: "task", root: "/Users/me/data/tasks", beadsDir: "/Users/me/data/tasks/.beads" },
  {
    id: "education",
    name: "education",
    root: "/Users/me/data/education",
    beadsDir: "/Users/me/data/education/.beads",
  },
];
const addExists = (p: string) =>
  [
    "/Users/me/data/.beads",
    "/Users/me/data/brain/.beads",
    "/Users/me/data/tasks/.beads",
    "/Users/me/data/education/.beads",
    "/tmp/other/.beads",
  ].includes(p);

test("add project opens a store folder, including when the directory name is not the id", () => {
  assert.deepEqual(classifyProjectPath("/Users/me/data/tasks", ADD_STORES, addExists), {
    kind: "store",
    id: "task",
    name: "task",
    root: "/Users/me/data/tasks",
  });
  assert.equal(classifyProjectPath("/Users/me/data/tasks/.beads", ADD_STORES, addExists).kind, "store");
  assert.equal(
    classifyProjectPath("~/data/brain", ADD_STORES, addExists, "/Users/me").kind,
    "store",
  );
  const education = classifyProjectPath("/Users/me/data/education", ADD_STORES, addExists);
  assert.equal(education.kind, "store");
  if (education.kind === "store") assert.equal(education.id, "education");
});

test("add project does not treat the federation parent as a repo, even when it has .beads", () => {
  assert.equal(classifyProjectPath("/Users/me/data", ADD_STORES, addExists).kind, "federation_parent");
  assert.equal(classifyProjectPath("/Users/me/data/.beads", ADD_STORES, addExists).kind, "federation_parent");
  assert.deepEqual(classifyProjectPath("/tmp/other", ADD_STORES, addExists), {
    kind: "repo",
    path: "/tmp/other",
  });
  assert.deepEqual(classifyProjectPath("/tmp/other/.beads", ADD_STORES, addExists), {
    kind: "repo",
    path: "/tmp/other",
  });
  assert.equal(classifyProjectPath("/tmp/missing", ADD_STORES, addExists).kind, "missing");
});

test("the federation parent folder is not a store", () => {
  const stores = [
    { root: "/Users/me/data/brain" },
    { root: "/Users/me/data/tasks" },
  ];
  assert.equal(isFederationParentPath("/Users/me/data", stores), true);
  assert.equal(isFederationParentPath("/Users/me/data/brain", stores), false);
});

test("BEADS_REPO wins over an existing project list", () => {
  const stores = [
    { id: "brain", root: "/Users/me/data/brain", beadsDir: "/Users/me/data/brain/.beads" },
    { id: "task", root: "/Users/me/data/tasks", beadsDir: "/Users/me/data/tasks/.beads" },
  ];
  const projects = [
    { id: "data", path: "/Users/me/data" },
    { id: "task", path: "/Users/me/data/tasks" },
  ];
  assert.deepEqual(resolveLanding({ picker: false, stores, projects }), {
    id: "brain",
    unresolvedRepo: false,
  });
  assert.deepEqual(
    resolveLanding({
      picker: false,
      beadsRepo: "/Users/me/data/tasks",
      stores,
      projects,
    }),
    { id: "task", unresolvedRepo: false },
  );
  assert.equal(
    matchBeadsRepo("/Users/me/data/brain/.beads", stores, projects),
    "brain",
  );
  assert.deepEqual(resolveLanding({ picker: true, stores, projects }), {
    id: null,
    unresolvedRepo: false,
  });
});

test("an unmatched BEADS_REPO is reported so the caller can register it", () => {
  const decision = resolveLanding({
    picker: false,
    beadsRepo: "/tmp/other-repo",
    stores: [{ id: "brain", root: "/Users/me/data/brain", beadsDir: "/Users/me/data/brain/.beads" }],
    projects: [{ id: "task", path: "/Users/me/data/tasks" }],
  });
  assert.deepEqual(decision, { id: null, unresolvedRepo: true });
});

test("bdChildEnv replaces a leaked store and pins the shared server", () => {
  const env = bdChildEnv(
    {
      BEADS_DIR: "/Users/me/data/tasks/.beads",
      BD_NAME: "task",
      BEADS_DOLT_SERVER_HOST: "10.0.0.2",
      PATH: "/usr/bin",
    },
    {
      cwd: "/Users/me/data/brain",
      beadsDir: "/Users/me/data/brain/.beads",
      bdName: "brain",
      sharedServer: true,
    },
    "ada",
  );
  assert.equal(env.BEADS_DIR, "/Users/me/data/brain/.beads");
  assert.equal(env.BD_NAME, "brain");
  assert.equal(env.BEADS_DOLT_SERVER_MODE, "1");
  assert.equal(env.BEADS_DOLT_SERVER_HOST, "10.0.0.2");
  assert.equal(env.BEADS_DOLT_SERVER_PORT, "3307");
  assert.equal(env.BEADS_ACTOR, "ada");
  assert.equal(env.BD_JSON_ENVELOPE, "1");
  assert.equal(env.PATH, "/usr/bin");
});

test("a plain repo does not inherit federation namespace or the dolt pin", () => {
  const env = bdChildEnv(
    {
      BEADS_DIR: "/Users/me/data/tasks/.beads",
      BD_NAME: "task",
      BEADS_DOLT_SERVER_MODE: "1",
      BEADS_DOLT_SHARED_SERVER: "1",
    },
    { cwd: "/tmp/repo", beadsDir: "/tmp/repo/.beads", sharedServer: false },
  );
  assert.equal(env.BEADS_DIR, "/tmp/repo/.beads");
  assert.equal("BD_NAME" in env, false);
  assert.equal("BEADS_DOLT_SERVER_MODE" in env, false);
  assert.equal("BEADS_DOLT_SHARED_SERVER" in env, false);
});
