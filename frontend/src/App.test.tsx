import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { ContextTutorApi } from "./api/ContextTutorApi";
import { HttpClient } from "./api/HttpClient";
import { createEmptyWorkspace, type WorkspaceV1 } from "./workspace/model";
import { createWorkspaceBootstrap } from "./workspace/bootstrap";
import { WORKSPACE_STORAGE_KEY, WorkspaceRepository } from "./workspace/repository";
import { sourceHash } from "./workspace/sourceHash";

const content =
  "A transaction groups changes into one unit. It either commits all changes or rolls them back. Isolation controls how concurrent transactions see each other's changes. Durability preserves committed changes after a restart.";
const models = { models: ["model-a", "model-b"], defaultModel: "model-a" };
const questions = [
  {
    question: "What groups changes?",
    options: ["A transaction", "A file", "A view", "A key"],
    correctOptionIndex: 0,
    sourceQuote: "A transaction groups changes into one unit.",
  },
  {
    question: "What preserves committed changes?",
    options: ["Isolation", "Durability", "A view", "A key"],
    correctOptionIndex: 1,
    sourceQuote: "Durability preserves committed changes after a restart.",
  },
];

function readyWorkspace(): WorkspaceV1 {
  return {
    ...createEmptyWorkspace(),
    source: { content, hash: sourceHash(content) },
    selectedModel: "model-a",
    quiz: {
      questions: questions.map((question) => ({
        ...question,
        options: question.options as [string, string, string, string],
      })),
      model: "model-a",
      sourceHash: sourceHash(content),
      requestedQuestionCount: 5,
      actualQuestionCount: 2,
    },
    selectedAnswers: [null, null],
  };
}

const storedValues = new Map<string, string>();
const memoryStorage: Storage = {
  get length() {
    return storedValues.size;
  },
  clear() {
    storedValues.clear();
  },
  getItem(key: string) {
    return storedValues.get(key) ?? null;
  },
  key(index: number) {
    return [...storedValues.keys()][index] ?? null;
  },
  setItem(key: string, value: string) {
    storedValues.set(key, value);
  },
  removeItem(key: string) {
    storedValues.delete(key);
  },
};
const fetchMock = vi.fn<typeof fetch>();
const apiClient = new ContextTutorApi(
  new HttpClient({ baseUrl: "/api", timeoutMs: 35_000, fetcher: fetchMock }),
);

function mount(workspace?: WorkspaceV1, storage: Storage | null = memoryStorage) {
  const workspaceRepository = new WorkspaceRepository(storage);
  if (workspace) workspaceRepository.save(workspace);
  const bootstrap = createWorkspaceBootstrap(workspaceRepository.load());
  return render(
    <App
      apiClient={apiClient}
      workspaceRepository={workspaceRepository}
      initialWorkspace={bootstrap.initialWorkspace}
      initialStorageNotice={bootstrap.initialStorageNotice}
    />,
  );
}

async function loaded() {
  await waitFor(() =>
    expect(screen.getByLabelText<HTMLSelectElement>("Generation model").disabled).toBe(false),
  );
}

beforeEach(() => {
  memoryStorage.clear();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation((url, init) => {
    if (url === "/api/models") return Promise.resolve(Response.json(models));
    const input = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as {
      model: string;
      questionCount?: number;
    };
    return Promise.resolve(
      Response.json(
        url === "/api/summary"
          ? { summary: ["Transactions group changes."], model: input.model }
          : {
              questions,
              requestedQuestionCount: input.questionCount,
              actualQuestionCount: 2,
              model: input.model,
            },
      ),
    );
  });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  vi.restoreAllMocks();
});

describe("browser workflow", () => {
  it("generates directly from source, scores unanswered questions, locks answers, and restores results", async () => {
    const user = userEvent.setup();
    const view = mount();
    await loaded();
    fireEvent.change(screen.getByLabelText<HTMLTextAreaElement>("Source text"), {
      target: { value: content },
    });
    await user.click(screen.getByRole("button", { name: "Generate quiz" }));
    await screen.findByText("2 of 5 requested questions generated.");
    expect(screen.queryByText("Source evidence")).toBeNull();
    await user.click(screen.getByRole("radio", { name: "A transaction" }));
    await user.click(screen.getByRole("button", { name: "Finish quiz" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Finish attempt" }));
    expect(screen.getByText("1 / 2 · 50%")).toBeTruthy();
    expect(screen.getByText("1 correct · 0 incorrect · 1 unanswered")).toBeTruthy();
    expect(screen.getAllByText("Source evidence")).toHaveLength(2);
    expect(
      screen.getAllByRole("group").every((group) => (group as HTMLFieldSetElement).disabled),
    ).toBe(true);
    view.unmount();
    mount();
    await loaded();
    expect(screen.getByText("1 / 2 · 50%")).toBeTruthy();
  });

  it("keeps stale quizzes usable and does not mark artifacts stale for model/count changes", async () => {
    const user = userEvent.setup();
    mount(readyWorkspace());
    await loaded();
    await user.selectOptions(
      screen.getByLabelText<HTMLSelectElement>("Generation model"),
      "model-b",
    );
    await user.selectOptions(screen.getByLabelText("Target questions"), "3");
    expect(screen.queryByText(/Outdated/)).toBeNull();
    expect(screen.getByText("2 of 5 requested questions generated.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText<HTMLTextAreaElement>("Source text"), {
      target: { value: `${content} More notes.` },
    });
    expect(screen.getByText(/Outdated/)).toBeTruthy();
    await user.click(screen.getByRole<HTMLInputElement>("radio", { name: "Durability" }));
    await user.click(screen.getByRole("button", { name: "Regenerate quiz" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Durability" }).checked).toBe(true);
  });

  it("preserves quiz answers made while summary generation is pending and disables request controls", async () => {
    const user = userEvent.setup();
    mount(readyWorkspace());
    await loaded();
    let respond!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          respond = resolve;
        }),
    );
    await user.click(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Generate summary",
      }),
    );
    expect(screen.getByLabelText<HTMLTextAreaElement>("Source text").disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "New content" }).disabled).toBe(
      true,
    );
    await user.click(screen.getByRole<HTMLInputElement>("radio", { name: "Durability" }));
    respond(
      Response.json({
        summary: ["Transactions group changes."],
        model: "model-a",
      }),
    );
    await screen.findByText("Transactions group changes.");
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Durability" }).checked).toBe(true);
  });

  it("hides unexpected API error messages from the user", async () => {
    const user = userEvent.setup();
    mount(readyWorkspace());
    await loaded();
    vi.spyOn(apiClient, "generateSummary").mockRejectedValueOnce(
      new Error("secret implementation detail"),
    );

    await user.click(screen.getByRole("button", { name: "Generate summary" }));

    expect(await screen.findByText("Something went wrong. Try again.")).toBeTruthy();
    expect(screen.queryByText("secret implementation detail")).toBeNull();
  });

  it("keeps previous work on generation failure and retries only at the user's request", async () => {
    const user = userEvent.setup();
    mount(readyWorkspace());
    await loaded();
    fetchMock.mockResolvedValueOnce(
      Response.json(
        {
          error: {
            code: "MODEL_RATE_LIMITED",
            message: "secret upstream text",
          },
        },
        { status: 429 },
      ),
    );
    await user.click(screen.getByRole("button", { name: "Regenerate quiz" }));
    await user.click(screen.getByRole("button", { name: "Replace quiz" }));
    await screen.findByText(/temporarily rate limited/);
    expect(screen.queryByText("secret upstream text")).toBeNull();
    expect(screen.getByText("2 of 5 requested questions generated.")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await user.click(screen.getByRole("button", { name: "Replace quiz" }));
    await waitFor(() => expect(screen.queryByText(/temporarily rate limited/)).toBeNull());
  });

  it("keeps restored work readable through catalog failure and falls back to the deployment default", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    mount({ ...readyWorkspace(), selectedModel: "removed-model" });
    await screen.findByRole("button", { name: "Retry model catalog" });
    expect(screen.getByText("2 of 5 requested questions generated.")).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Generate summary",
      }).disabled,
    ).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Retry model catalog" }));
    await loaded();
    expect(screen.getByLabelText<HTMLSelectElement>("Generation model").value).toBe("model-a");
  });

  it("confirms reset, stores an empty workspace, and returns focus to content", async () => {
    const user = userEvent.setup();
    mount(readyWorkspace());
    await loaded();
    await user.click(screen.getByRole<HTMLButtonElement>("button", { name: "New content" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Clear workspace" }),
    );
    await waitFor(() =>
      expect(JSON.parse(memoryStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "null")).toMatchObject({
        source: { content: "", hash: "" },
        summary: null,
        quiz: null,
      }),
    );
    expect(screen.queryByRole("heading", { name: "Quiz" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText<HTMLTextAreaElement>("Source text"));
  });

  it("explains failed storage operations without claiming success", async () => {
    const user = userEvent.setup();
    mount(undefined, {
      length: 1,
      clear() {
        /* Not exercised by the repository. */
      },
      getItem() {
        throw new Error("blocked");
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
    await loaded();
    expect(screen.getByRole("alert").textContent).toContain("could not be read");
    fireEvent.change(screen.getByLabelText<HTMLTextAreaElement>("Source text"), {
      target: { value: content },
    });
    expect(screen.getByRole("alert").textContent).toContain("could not be saved");
    await user.click(screen.getByRole<HTMLButtonElement>("button", { name: "New content" }));
    await user.click(screen.getByRole("button", { name: "Clear workspace" }));
    expect(screen.getByRole("alert").textContent).toContain("could not be saved");
  });

  it("resets invalid saved data with a notice", async () => {
    memoryStorage.setItem(WORKSPACE_STORAGE_KEY, '{"version":99}');
    mount();
    await loaded();
    expect(screen.getByRole("alert").textContent).toContain("unsupported version");
    await waitFor(() =>
      expect(JSON.parse(memoryStorage.getItem(WORKSPACE_STORAGE_KEY) ?? "null")).toMatchObject({
        source: { content: "", hash: "" },
        summary: null,
        quiz: null,
      }),
    );
  });
});
