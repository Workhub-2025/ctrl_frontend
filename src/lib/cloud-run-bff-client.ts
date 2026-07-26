import "server-only";

export type CloudRunBffClientConfig = Readonly<{
  baseUrl: string;
  /**
   * Supplies a short-lived Google identity token for the Cloud Run audience.
   * In Vercel this is backed by OIDC -> Workload Identity Federation, never a
   * downloaded service-account JSON key.
   */
  getIdentityToken: (audience: string) => Promise<string>;
  fetchImpl?: typeof fetch;
}>;

export type CloudRunDomainRequest = Readonly<{
  path: `/${string}`;
  /**
   * Required for authenticated domain operations. Session creation is the
   * only operation that deliberately omits it.
   */
  firebaseSessionCookie?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
}>;

export class CloudRunDomainError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "CloudRunDomainError";
  }
}

const RESERVED_HEADERS = new Set([
  "authorization",
  "x-ctrl-firebase-session",
  "content-type",
  "accept",
]);

function assertNoReservedHeaders(headers?: Readonly<Record<string, string>>): void {
  for (const header of Object.keys(headers ?? {})) {
    if (RESERVED_HEADERS.has(header.toLowerCase())) {
      throw new Error(`Cloud Run request cannot override reserved header "${header}"`);
    }
  }
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("Cloud Run domain API must use HTTPS");
  }
  return url.toString().replace(/\/$/, "");
}

export function createCloudRunBffClient(config: CloudRunBffClientConfig) {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async request<ResponseBody>(
      request: CloudRunDomainRequest,
    ): Promise<ResponseBody> {
      assertNoReservedHeaders(request.headers);
      const identityToken = await config.getIdentityToken(baseUrl);
      const response = await fetchImpl(`${baseUrl}${request.path}`, {
        method: request.method ?? (request.body === undefined ? "GET" : "POST"),
        cache: "no-store",
        signal: request.signal,
        headers: {
          ...request.headers,
          accept: "application/json",
          authorization: `Bearer ${identityToken}`,
          ...(request.firebaseSessionCookie
            ? { "x-ctrl-firebase-session": request.firebaseSessionCookie }
            : {}),
          ...(request.body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      });

      const body = (await response.json().catch(() => ({}))) as {
        data?: ResponseBody;
        error?: string;
        message?: string;
        requestId?: string;
      };

      if (!response.ok) {
        const detail =
          typeof body.message === "string" && body.message.trim()
            ? `${body.error ?? "DomainAPIError"}: ${body.message}`
            : body.error ?? `Domain API request failed (${response.status})`;
        throw new CloudRunDomainError(
          detail,
          response.status,
          body.requestId ?? response.headers.get("x-request-id") ?? undefined,
        );
      }

      return (body.data ?? body) as ResponseBody;
    },
  };
}
