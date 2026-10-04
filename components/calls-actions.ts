"use server";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const pExecFile = promisify(execFile);
const REVIEW_BIN = "/Users/trilliumsmith/.local/bin/review";

import type { Bead } from "@/lib/schema";

export async function getReviewCalls(): Promise<Bead[]> {
  try {
    const { stdout } = await pExecFile(REVIEW_BIN, ["list", "--json"], {
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, BD_JSON_ENVELOPE: "1" },
    });
    const parsed = JSON.parse(stdout);
    let items = [];
    if (parsed.data && Array.isArray(parsed.data)) {
        items = parsed.data;
    } else if (parsed.beads && Array.isArray(parsed.beads)) {
        items = parsed.beads;
    } else if (Array.isArray(parsed)) {
        items = parsed;
    }
    
    // Sort newest first
    items.sort((a: Bead, b: Bead) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return items.filter((b: Bead) => b.status === "open");
  } catch (err) {
    console.error("Failed to list review calls:", err);
    return [];
  }
}

export async function submitReviewCallChoice(id: string, message: string, close: boolean) {
  try {
    if (message) {
      await pExecFile(REVIEW_BIN, ["note", id, "-m", message], {
        env: process.env,
      });
    }
    if (close) {
      await pExecFile(REVIEW_BIN, ["update", id, "--close"], {
        env: process.env,
      });
    }
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to submit review choice:", err);
    return { success: false, error: (err as Error).message };
  }
}
