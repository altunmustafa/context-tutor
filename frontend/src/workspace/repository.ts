import type { WorkspaceV1 } from "./model";
import { parseWorkspace } from "./parser";

export const WORKSPACE_STORAGE_KEY = "context-tutor.workspace.v1";

export type WorkspaceSaveResult = { status: "success" } | { status: "unavailable" };

export type WorkspaceLoadResult =
  | { status: "missing" }
  | { status: "invalid"; removal: WorkspaceSaveResult }
  | { status: "unavailable" }
  | { status: "loaded"; workspace: WorkspaceV1 };

/** Persist validated workspaces; null represents a denied storage getter. */
export class WorkspaceRepository {
  constructor(private readonly storage: Storage | null) {}

  load(): WorkspaceLoadResult {
    let storedValue: string | null;
    try {
      if (!this.storage) return { status: "unavailable" };
      storedValue = this.storage.getItem(WORKSPACE_STORAGE_KEY);
    } catch {
      return { status: "unavailable" };
    }
    if (storedValue === null) return { status: "missing" };
    try {
      const workspace = parseWorkspace(JSON.parse(storedValue) as unknown);
      if (workspace) return { status: "loaded", workspace };
    } catch {
      // Malformed JSON follows the same reset policy as an invalid schema.
    }
    return { status: "invalid", removal: this.remove() };
  }

  save(workspace: WorkspaceV1): WorkspaceSaveResult {
    try {
      if (!this.storage) return { status: "unavailable" };
      this.storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
      return { status: "success" };
    } catch {
      return { status: "unavailable" };
    }
  }

  remove(): WorkspaceSaveResult {
    try {
      if (!this.storage) return { status: "unavailable" };
      this.storage.removeItem(WORKSPACE_STORAGE_KEY);
      return { status: "success" };
    } catch {
      return { status: "unavailable" };
    }
  }
}
