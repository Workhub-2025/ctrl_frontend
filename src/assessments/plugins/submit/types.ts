export type SubmitValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

export type AssessmentSubmitHandler<T = unknown> = {
  traceAction: string;
  validate: (body: unknown) => SubmitValidationResult<T>;
  buildStrapiBody: (data: T) => Record<string, unknown>;
  strapiResultsPath: string;
  /** Typing submit returns 409 for duplicate submissions. */
  idempotentConflict?: boolean;
};
