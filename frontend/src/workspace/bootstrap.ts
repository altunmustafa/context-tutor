import { createEmptyWorkspace, type WorkspaceV1 } from "./model";
import type { WorkspaceLoadResult } from "./repository";

export interface WorkspaceBootstrap {
  initialWorkspace: WorkspaceV1;
  initialStorageNotice: string | null;
}

export function createWorkspaceBootstrap(result: WorkspaceLoadResult): WorkspaceBootstrap {
  if (result.status === "loaded") {
    return {
      initialWorkspace: result.workspace,
      initialStorageNotice: null,
    };
  }

  if (result.status === "unavailable") {
    return {
      initialWorkspace: createEmptyWorkspace(),
      initialStorageNotice:
        "Saved work could not be read. You can work in this tab, but previous work could not be restored.",
    };
  }

  if (result.status === "invalid") {
    return {
      initialWorkspace: createEmptyWorkspace(),
      initialStorageNotice:
        result.removal.status === "success"
          ? "Saved work was invalid or used an unsupported version and was removed. A new workspace has been opened."
          : "Saved work was invalid. A new workspace has been opened, but the old record could not be removed.",
    };
  }

  return {
    initialWorkspace: createEmptyWorkspace(),
    initialStorageNotice: null,
  };
}
