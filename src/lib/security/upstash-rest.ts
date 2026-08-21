const UPSTASH_TIMEOUT_MS = 3_000;

function upstashUrl() {
  return process.env.UPSTASH_REDIS_REST_URL;
}

function upstashToken() {
  return process.env.UPSTASH_REDIS_REST_TOKEN;
}

export const isUpstashConfigured = () =>
  Boolean(upstashUrl() && upstashToken());

const baseHeaders = () => ({
  Authorization: `Bearer ${upstashToken()}`,
  "Content-Type": "application/json",
});

async function upstashFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
  });
}

type RedisArg = string | number;

/**
 * Execute a Redis command via the REST body, not the URL path. Portal payloads
 * are too large for `/set/{key}/{value}` and those writes fail silently.
 */
export async function upstashCommand(
  command: RedisArg[],
): Promise<unknown> {
  if (!isUpstashConfigured()) {
    return null;
  }
  const url = upstashUrl();
  if (!url) {
    return null;
  }

  try {
    const response = await upstashFetch(url, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(command),
    });
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as { result?: unknown };
    return json.result ?? null;
  } catch {
    return null;
  }
}

export async function upstashPipeline(
  commands: RedisArg[][],
): Promise<unknown[] | null> {
  if (!isUpstashConfigured()) {
    return null;
  }
  const url = upstashUrl();
  if (!url) {
    return null;
  }

  try {
    const response = await upstashFetch(`${url}/pipeline`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(commands),
    });
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as Array<{ result?: unknown }> | {
      result?: unknown;
    };
    if (!Array.isArray(json)) {
      return null;
    }
    return json.map((item) => item.result ?? null);
  } catch {
    return null;
  }
}

export async function upstashGet(key: string): Promise<string | null> {
  const result = await upstashCommand(["GET", key]);
  return typeof result === "string" ? result : null;
}

export async function upstashSet(
  key: string,
  value: string,
  ttlMs?: number,
): Promise<boolean> {
  const command: RedisArg[] =
    ttlMs && ttlMs > 0
      ? ["SET", key, value, "PX", ttlMs]
      : ["SET", key, value];
  const result = await upstashCommand(command);
  return result === "OK";
}

export async function upstashDel(key: string): Promise<boolean> {
  const result = await upstashCommand(["DEL", key]);
  return typeof result === "number" && result >= 0;
}

export async function upstashLpush(key: string, value: string): Promise<boolean> {
  const result = await upstashCommand(["LPUSH", key, value]);
  return typeof result === "number" && result > 0;
}

export async function upstashLlen(key: string): Promise<number> {
  const result = await upstashCommand(["LLEN", key]);
  return typeof result === "number" && result >= 0 ? result : 0;
}

export async function upstashLtrim(
  key: string,
  start: number,
  stop: number,
): Promise<boolean> {
  const result = await upstashCommand(["LTRIM", key, start, stop]);
  return result === "OK";
}

export async function upstashLrange(
  key: string,
  start: number,
  stop: number,
): Promise<string[]> {
  const result = await upstashCommand(["LRANGE", key, start, stop]);
  return Array.isArray(result)
    ? result.filter((item): item is string => typeof item === "string")
    : [];
}

export async function upstashPexpire(key: string, ttlMs: number): Promise<boolean> {
  if (ttlMs <= 0) {
    return false;
  }
  const result = await upstashCommand(["PEXPIRE", key, ttlMs]);
  return result === 1;
}

export async function upstashGetJson<T>(key: string): Promise<T | null> {
  const raw = await upstashGet(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function upstashSetJson(
  key: string,
  value: unknown,
  ttlMs?: number,
): Promise<boolean> {
  return upstashSet(key, JSON.stringify(value), ttlMs);
}
