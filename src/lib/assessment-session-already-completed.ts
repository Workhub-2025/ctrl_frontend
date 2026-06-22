export type AlreadyCompletedSessionMarker = {
  alreadyCompleted: true;
  completedAt?: string | null;
  score?: number | null;
};

export function isAlreadyCompletedSession(
  value: unknown,
): value is AlreadyCompletedSessionMarker {
  return Boolean(
    value
    && typeof value === "object"
    && (value as AlreadyCompletedSessionMarker).alreadyCompleted === true,
  );
}
