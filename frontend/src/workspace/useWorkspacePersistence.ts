import { useEffect, useState } from "react";

import type { WorkspaceV1 } from "./model";
import type { WorkspaceRepository } from "./repository";

const WRITE_FAILURE_NOTICE =
  "Changes could not be saved. Keep this tab open; reloading may lose your work.";

export function useWorkspacePersistence({
  repository,
  workspace,
  initialNotice,
}: {
  repository: WorkspaceRepository;
  workspace: WorkspaceV1;
  initialNotice: string | null;
}): string {
  const [writeFailed, setWriteFailed] = useState(false);

  useEffect(() => {
    const result = repository.save(workspace);
    let current = true;
    queueMicrotask(() => {
      if (current) setWriteFailed(result.status === "unavailable");
    });
    return () => {
      current = false;
    };
  }, [repository, workspace]);

  return [initialNotice, writeFailed ? WRITE_FAILURE_NOTICE : null]
    .filter((notice) => notice !== null)
    .join(" ");
}
