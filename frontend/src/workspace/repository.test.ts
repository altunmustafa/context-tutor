import { beforeEach, describe, expect, it } from "vitest";

import { createEmptyWorkspace } from "./model";
import { WORKSPACE_STORAGE_KEY, WorkspaceRepository } from "./repository";

const emptyWorkspace = createEmptyWorkspace();

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
  let repository: WorkspaceRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new WorkspaceRepository(storage);
  });

  it("round-trips a versioned workspace", () => {
    repository.save(emptyWorkspace);

    expect(repository.load()).toEqual({
      status: "loaded",
      workspace: emptyWorkspace,
    });
  });

  it("removes malformed stored state", () => {
    storage.setItem(WORKSPACE_STORAGE_KEY, '{"version":2}');

    expect(repository.load()).toEqual({
      status: "invalid",
      removal: { status: "success" },
    });
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();
  });
});

describe("storage failure boundaries", () => {
  it("does not confuse read failures with invalid data or delete unread data", () => {
    const repository = new WorkspaceRepository({
      length: 0,
      clear() {
        /* Not exercised by the repository. */
      },
      getItem() {
        throw new Error("blocked");
      },
      key() {
        return null;
      },
      setItem() {
        /* Not exercised by reading. */
      },
      removeItem() {
        throw new Error("must not delete");
      },
    });
    expect(repository.load()).toEqual({ status: "unavailable" });
  });

  it("reports save and removal failures independently", () => {
    const repository = new WorkspaceRepository({
      length: 1,
      clear() {
        /* Not exercised by the repository. */
      },
      getItem() {
        return "bad json";
      },
      key() {
        return WORKSPACE_STORAGE_KEY;
      },
      setItem() {
        throw new Error("quota");
      },
      removeItem() {
        throw new Error("blocked");
      },
    });
    expect(repository.load()).toEqual({
      status: "invalid",
      removal: { status: "unavailable" },
    });
    expect(repository.save(emptyWorkspace)).toEqual({
      status: "unavailable",
    });
    expect(repository.remove()).toEqual({ status: "unavailable" });
  });

  it("supports denied access to the browser storage object", () => {
    const repository = new WorkspaceRepository(null);
    expect(repository.load()).toEqual({ status: "unavailable" });
    expect(repository.save(emptyWorkspace)).toEqual({
      status: "unavailable",
    });
    expect(repository.remove()).toEqual({ status: "unavailable" });
  });
});
