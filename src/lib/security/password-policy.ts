export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "admin123",
  "changeme",
  "letmein",
  "password",
  "password1",
  "password123",
  "qwerty",
  "qwerty123",
  "welcome",
  "welcome123",
]);

export function getPasswordPolicyIssue(password: unknown, email?: unknown): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be no more than ${PASSWORD_MAX_LENGTH} characters`;
  }

  const normalised = password.trim().toLowerCase();
  if (COMMON_PASSWORDS.has(normalised)) return "Choose a password that is not commonly used";
  if (/^(.)\1{11,}$/u.test(password)) return "Choose a password that is harder to guess";

  if (typeof email === "string") {
    const localPart = email.trim().toLowerCase().split("@")[0] ?? "";
    if (localPart.length >= 4 && normalised.includes(localPart)) {
      return "Password must not contain your email name";
    }
  }

  return null;
}
