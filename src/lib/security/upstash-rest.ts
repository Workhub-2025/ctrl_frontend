const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const UPSTASH_TIMEOUT_MS = 3_000;

export const isUpstashConfigured = () =>
  Boolean(UPSTASH_URL && UPSTASH_TOKEN);

const baseHeaders = () => ({
  Authorization: `Bearer ${UPSTASH_TOKEN}`,
  "Content-Type": "application/json",
});

async function upstashFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
  });
}

export async function upstashGet(key: string): Promise<string | null> {
  if (!isUpstashConfigured()) {
    return null;
  }

  try {
    const response = await upstashFetch(
      `${UPSTASH_URL}/get/${encodeURIComponent(key)}`,
      { method: "POST", headers: baseHeaders() }
    );
    const json = (await response.json()) as { result?: string | null };
    return typeof json.result === "string" ? json.result : null;
  } catch {
    return null;
  }
}

export async function upstashSet(
  key: string,
  value: string,
  ttlMs?: number
): Promise<boolean> {
  if (!isUpstashConfigured()) {
    return false;
  }

  try {
    const url =
      ttlMs && ttlMs > 0
        ? `${UPSTASH_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/px/${ttlMs}`
        : `${UPSTASH_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`;

    const response = await upstashFetch(url, { method: "POST", headers: baseHeaders() });
    const json = (await response.json()) as { result?: string };
    return json.result === "OK";
  } catch {
    return false;
  }
}

export async function upstashDel(key: string): Promise<boolean> {
  if (!isUpstashConfigured()) {
    return false;
  }

  try {
    const response = await upstashFetch(
      `${UPSTASH_URL}/del/${encodeURIComponent(key)}`,
      { method: "POST", headers: baseHeaders() }
    );
    const json = (await response.json()) as { result?: number };
    return typeof json.result === "number" && json.result >= 0;
  } catch {
    return false;
  }
}

export async function upstashLpush(key: string, value: string): Promise<boolean> {
  if (!isUpstashConfigured()) {
    return false;
  }

  try {
    const response = await upstashFetch(
      `${UPSTASH_URL}/lpush/${encodeURIComponent(key)}/${encodeURIComponent(value)}`,
      { method: "POST", headers: baseHeaders() }
    );
    const json = (await response.json()) as { result?: number };
    return typeof json.result === "number" && json.result > 0;
  } catch {
    return false;
  }
}

export async function upstashLlen(key: string): Promise<number> {
  if (!isUpstashConfigured()) {
    return 0;
  }

  try {
    const response = await upstashFetch(
      `${UPSTASH_URL}/llen/${encodeURIComponent(key)}`,
      { method: "POST", headers: baseHeaders() }
    );
    const json = (await response.json()) as { result?: number };
    return typeof json.result === "number" && json.result >= 0 ? json.result : 0;
  } catch {
    return 0;
  }
}

export async function upstashLtrim(
  key: string,
  start: number,
  stop: number
): Promise<boolean> {
  if (!isUpstashConfigured()) {
    return false;
  }

  try {
    const response = await upstashFetch(
      `${UPSTASH_URL}/ltrim/${encodeURIComponent(key)}/${start}/${stop}`,
      { method: "POST", headers: baseHeaders() }
    );
    const json = (await response.json()) as { result?: string };
    return json.result === "OK";
  } catch {
    return false;
  }
}

export async function upstashLrange(key: string, start: number, stop: number): Promise<string[]> {
  if (!isUpstashConfigured()) {
    return [];
  }

  try {
    const response = await upstashFetch(
      `${UPSTASH_URL}/lrange/${encodeURIComponent(key)}/${start}/${stop}`,
      { method: "POST", headers: baseHeaders() }
    );
    const json = (await response.json()) as { result?: string[] | null };
    return Array.isArray(json.result) ? json.result : [];
  } catch {
    return [];
  }
}

export async function upstashPexpire(key: string, ttlMs: number): Promise<boolean> {
  if (!isUpstashConfigured() || ttlMs <= 0) {
    return false;
  }

  try {
    const response = await upstashFetch(
      `${UPSTASH_URL}/pexpire/${encodeURIComponent(key)}/${ttlMs}`,
      { method: "POST", headers: baseHeaders() }
    );
    const json = (await response.json()) as { result?: number };
    return json.result === 1;
  } catch {
    return false;
  }
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
  ttlMs?: number
): Promise<boolean> {
  return upstashSet(key, JSON.stringify(value), ttlMs);
}
