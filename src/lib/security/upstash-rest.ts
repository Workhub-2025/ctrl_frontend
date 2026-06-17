const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const isUpstashConfigured = () =>
  Boolean(UPSTASH_URL && UPSTASH_TOKEN);

const baseHeaders = () => ({
  Authorization: `Bearer ${UPSTASH_TOKEN}`,
  "Content-Type": "application/json",
});

export async function upstashGet(key: string): Promise<string | null> {
  if (!isUpstashConfigured()) {
    return null;
  }

  try {
    const response = await fetch(
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

    const response = await fetch(url, { method: "POST", headers: baseHeaders() });
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
    const response = await fetch(
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
    const response = await fetch(
      `${UPSTASH_URL}/lpush/${encodeURIComponent(key)}/${encodeURIComponent(value)}`,
      { method: "POST", headers: baseHeaders() }
    );
    const json = (await response.json()) as { result?: number };
    return typeof json.result === "number" && json.result > 0;
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
