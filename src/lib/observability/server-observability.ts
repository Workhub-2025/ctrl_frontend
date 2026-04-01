import { randomUUID } from "crypto";

type TelemetryMeta = Record<string, unknown>;

const OBSERVABILITY_PREFIX = "[ACTION_TRACE]";

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  return {
    message: String(error),
  };
};

const safeLog = (payload: TelemetryMeta) => {
  try {
    console.info(OBSERVABILITY_PREFIX, JSON.stringify(payload));
  } catch {
    console.info(OBSERVABILITY_PREFIX, payload);
  }
};

export const resolveCorrelationId = (incoming?: string | null): string => {
  if (typeof incoming === "string" && incoming.trim().length > 0) {
    return incoming.trim();
  }
  return randomUUID();
};

export const startServerActionTrace = (
  action: string,
  metadata: TelemetryMeta = {}
) => {
  const correlationId = resolveCorrelationId(
    typeof metadata.correlationId === "string"
      ? (metadata.correlationId as string)
      : null
  );
  const startedAt = Date.now();

  safeLog({
    event: "action_start",
    action,
    correlationId,
    timestamp: new Date().toISOString(),
    ...metadata,
  });

  return {
    correlationId,
    success(extra: TelemetryMeta = {}) {
      safeLog({
        event: "action_success",
        action,
        correlationId,
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        ...extra,
      });
    },
    failure(error: unknown, extra: TelemetryMeta = {}) {
      safeLog({
        event: "action_failure",
        action,
        correlationId,
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        error: serializeError(error),
        ...extra,
      });
    },
  };
};
