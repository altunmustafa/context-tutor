import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { ContextTutorApi } from "./api/ContextTutorApi";
import { HttpClient } from "./api/HttpClient";
import "./styles.css";
import { createWorkspaceBootstrap } from "./workspace/bootstrap";
import { WorkspaceRepository } from "./workspace/repository";

let storage: Storage | null;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}
const workspaceRepository = new WorkspaceRepository(storage);
const apiClient = new ContextTutorApi(
  new HttpClient({
    baseUrl: "/api",
    timeoutMs: 35_000,
  }),
);
const bootstrap = createWorkspaceBootstrap(workspaceRepository.load());

const rootElement = document.querySelector<HTMLElement>("#root");

if (rootElement === null) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App
      apiClient={apiClient}
      workspaceRepository={workspaceRepository}
      initialWorkspace={bootstrap.initialWorkspace}
      initialStorageNotice={bootstrap.initialStorageNotice}
    />
  </StrictMode>,
);
