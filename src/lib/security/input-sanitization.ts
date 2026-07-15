const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const CONTROL_CHARACTERS_GLOBAL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG = /<\/?[a-z][^>]*>/i;

export function sanitisePlainText(
  input: unknown,
  options: { maxLength?: number; allowNewlines?: boolean } = {},
) {
  const maxLength = Math.max(1, Math.min(options.maxLength ?? 500, 10_000));
  if (typeof input !== "string") return "";

  const normalised = input.normalize("NFKC").replace(CONTROL_CHARACTERS_GLOBAL, "");
  const singlePurposeText = options.allowNewlines
    ? normalised.replace(/\r\n?/g, "\n")
    : normalised.replace(/[\r\n\t]+/g, " ");

  return singlePurposeText.replace(/ {2,}/g, " ").trim().slice(0, maxLength);
}

export function sanitiseAccessCode(input: unknown) {
  if (typeof input !== "string") return "";
  return input
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 32);
}

export function containsHtmlMarkup(input: unknown) {
  return typeof input === "string" && HTML_TAG.test(input);
}

export function isSafePlainText(input: unknown, maxLength = 500) {
  return (
    typeof input === "string" &&
    input.length <= maxLength &&
    !CONTROL_CHARACTERS.test(input) &&
    !containsHtmlMarkup(input)
  );
}
