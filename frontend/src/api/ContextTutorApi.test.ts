import { afterEach, describe, expect, it, vi } from "vitest";

import { UserFacingError } from "../errors/UserFacingError";
import { ContextTutorApi } from "./ContextTutorApi";
import {
  HttpClient,
  HttpNetworkError,
  HttpResponseError,
  HttpResponseParseError,
} from "./HttpClient";
import { codePointLength } from "./limits";

const input = {
  content: "A transaction groups changes.",
  model: "model-a",
  questionCount: 2,
};
const question = {
  question: "Which?",
  options: ["A", "B", "C", "D"],
  correctOptionIndex: 0,
  sourceQuote: "A transaction",
};
const signal = () => new AbortController().signal;
const fetchMock = vi.fn<typeof fetch>();
const apiClient = new ContextTutorApi(
  new HttpClient({ baseUrl: "/api", timeoutMs: 35_000, fetcher: fetchMock }),
);

function respond(value: unknown, status = 200) {
  fetchMock.mockResolvedValue(Response.json(value, { status }));
}

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected the promise to reject.");
}

afterEach(() => fetchMock.mockReset());

describe("API response boundary", () => {
  it("counts Unicode code points instead of UTF-16 code units", () => {
    expect(codePointLength("a😀ş")).toBe(3);
  });
  it("rejects a default outside the catalog", async () => {
    respond({ models: ["a"], defaultModel: "b" });
    const result = apiClient.getModels(signal());
    await expect(result).rejects.toBeInstanceOf(UserFacingError);
    await expect(result).rejects.toThrow("catalog is invalid");
  });
  it.each([[], [""], ["x".repeat(301)], Array.from({ length: 7 }, () => "point")])(
    "rejects malformed summary points %j",
    async (summary) => {
      respond({ summary, model: "model-a" });
      await expect(apiClient.generateSummary(input, signal())).rejects.toThrow("invalid summary");
    },
  );
  it.each([
    { ...question, correctOptionIndex: 4 },
    { ...question, options: ["A", " a ", "C", "D"] },
    { ...question, sourceQuote: "not in source" },
    { ...question, question: " " },
  ])("rejects the complete quiz when any question is invalid", async (invalid) => {
    respond({
      questions: [question, invalid],
      requestedQuestionCount: 2,
      actualQuestionCount: 2,
      model: "model-a",
    });
    await expect(apiClient.generateQuiz(input, signal())).rejects.toThrow("invalid quiz");
  });
  it("rejects normalized duplicate questions", async () => {
    respond({
      questions: [question, { ...question, question: " WHICH? " }],
      requestedQuestionCount: 2,
      actualQuestionCount: 2,
      model: "model-a",
    });
    await expect(apiClient.generateQuiz(input, signal())).rejects.toThrow("invalid quiz");
  });
  it("accepts legitimate under-generation including zero", async () => {
    respond({
      questions: [],
      requestedQuestionCount: 2,
      actualQuestionCount: 0,
      model: "model-a",
    });
    expect((await apiClient.generateQuiz(input, signal())).questions).toEqual([]);
  });
  it("does not reveal unrecognized upstream error details", async () => {
    respond({ error: { code: "NEW_PROVIDER_ERROR", message: "secret" } }, 502);
    const error = await captureRejection(apiClient.generateQuiz(input, signal()));

    expect(error).toBeInstanceOf(UserFacingError);
    if (!(error instanceof UserFacingError)) throw error;
    expect(error.message).toBe("The request failed. Try again.");
    expect(error.cause).toBeInstanceOf(HttpResponseError);
  });

  it("maps unreadable responses while preserving the technical cause", async () => {
    fetchMock.mockResolvedValue(new Response("not json", { status: 502 }));

    const error = await captureRejection(apiClient.getModels(signal()));

    expect(error).toBeInstanceOf(UserFacingError);
    if (!(error instanceof UserFacingError)) throw error;
    expect(error.message).toContain("unreadable response");
    expect(error.cause).toBeInstanceOf(HttpResponseParseError);
  });

  it("uses the configured base URL and serializes JSON requests", async () => {
    respond({ summary: ["Point"], model: "model-a" });

    await apiClient.generateSummary(input, signal());

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/summary",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
  });

  it("maps transport failures to application-owned messages", async () => {
    fetchMock.mockRejectedValue(new Error("provider details"));

    const error = await captureRejection(apiClient.getModels(signal()));

    expect(error).toBeInstanceOf(UserFacingError);
    if (!(error instanceof UserFacingError)) throw error;
    expect(error.message).toContain("Check your connection and try again.");
    expect(error.cause).toBeInstanceOf(HttpNetworkError);
  });
});
