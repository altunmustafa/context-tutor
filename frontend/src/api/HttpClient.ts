export abstract class HttpClientError extends Error {
  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class HttpNetworkError extends HttpClientError {
  constructor(options?: ErrorOptions) {
    super("The HTTP request could not be completed.", options);
  }
}

export class HttpResponseParseError extends HttpClientError {
  constructor(
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super("The HTTP response body could not be parsed.", options);
  }
}

export class HttpResponseError extends HttpClientError {
  constructor(
    readonly status: number,
    readonly responseBody: unknown,
  ) {
    super(`HTTP request failed with status ${status}.`);
  }
}

interface HttpClientOptions {
  baseUrl: string;
  timeoutMs: number;
  fetcher?: typeof fetch;
}

interface RequestOptions {
  path: string;
  method: "GET" | "POST";
  body: unknown;
  signal: AbortSignal;
}

export class HttpClient {
  private readonly baseUrl: string;

  private readonly fetcher: typeof fetch;

  constructor(private readonly options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/u, "");
    this.fetcher = options.fetcher ?? ((input, init) => globalThis.fetch(input, init));
  }

  get(path: string, signal: AbortSignal): Promise<unknown> {
    return this.request({
      path,
      method: "GET",
      body: undefined,
      signal,
    });
  }

  post<TBody>(path: string, body: TBody, signal: AbortSignal): Promise<unknown> {
    return this.request({ path, method: "POST", body, signal });
  }

  private async request({ path, method, body, signal }: RequestOptions): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/${path.replace(/^\/+/, "")}`, {
        method,
        signal: AbortSignal.any([signal, AbortSignal.timeout(this.options.timeoutMs)]),
        ...(body === undefined
          ? {}
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
      });
    } catch (error) {
      throw new HttpNetworkError({ cause: error });
    }

    let value: unknown;
    try {
      value = await response.json();
    } catch (error) {
      throw new HttpResponseParseError(response.status, { cause: error });
    }

    if (!response.ok) {
      throw new HttpResponseError(response.status, value);
    }

    return value;
  }
}
