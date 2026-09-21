import { beforeEach, describe, expect, it } from "vitest";

import {
  readWorkspace,
  WORKSPACE_SCHEMA_VERSION,
  WORKSPACE_STORAGE_KEY,
  writeWorkspace,
  type WorkspaceV1,
} from "./workspace";

const emptyWorkspace: WorkspaceV1 = {
  version: WORKSPACE_SCHEMA_VERSION,
  source: { content: "", hash: "" },
  selectedModel: null,
  summary: null,
  questionCountDraft: 5,
  quiz: null,
  selectedAnswers: [],
  completion: null,
};

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("workspace persistence contract", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("round-trips a versioned workspace", () => {
    writeWorkspace(storage, emptyWorkspace);

    expect(readWorkspace(storage)).toEqual({
      status: "restored",
      workspace: emptyWorkspace,
    });
  });

  it("removes malformed stored state", () => {
    storage.setItem(WORKSPACE_STORAGE_KEY, '{"version":2}');

    expect(readWorkspace(storage)).toEqual({ status: "invalid" });
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();
  });

  it("rejects internally inconsistent quiz state", () => {
    storage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({ ...emptyWorkspace, selectedAnswers: [0] }),
    );

    expect(readWorkspace(storage)).toEqual({ status: "invalid" });
  });
});
