"use client";

export const COPY_FAILED_MESSAGE =
  "Couldn't copy automatically. Select the code or link and copy it manually.";

function copyWithSelection(value: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  // Inside a modal the focus trap would steal focus from a body-level node.
  const host =
    document.activeElement?.closest('[role="dialog"]') ?? document.body;
  host.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    host.removeChild(textarea);
  }
}

/**
 * Copies text, falling back to a selection copy when the Clipboard API is
 * missing or refuses (Safari after an await, embedded browsers, unfocused
 * documents). Throws COPY_FAILED_MESSAGE when neither path worked.
 */
export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      /* fall through to the selection copy */
    }
  }
  if (!copyWithSelection(value)) {
    throw new Error(COPY_FAILED_MESSAGE);
  }
}

export function isSecureAccessCodePlaceholder(accessValue: string | null | undefined) {
  return !accessValue || /configured securely/i.test(accessValue);
}

export type SessionAccessMaterial = {
  accessCode: string;
  joinUrl: string;
};

export async function fetchSessionAccessMaterial(
  sessionId: string,
): Promise<SessionAccessMaterial> {
  const response = await fetch(
    `/api/hiring-manager/sessions/${encodeURIComponent(sessionId)}/join-link`,
    { cache: "no-store" },
  );
  const body = (await response.json().catch(() => ({}))) as {
    data?: { accessCode?: string; joinUrl?: string };
    error?: string;
  };
  if (!response.ok || !body.data?.accessCode || !body.data?.joinUrl) {
    throw new Error(body.error || "Session access details could not be loaded");
  }
  return {
    accessCode: body.data.accessCode,
    joinUrl: body.data.joinUrl,
  };
}

/** @deprecated Prefer fetchSessionAccessMaterial — join URL alone hid the shareable code. */
export async function fetchSessionJoinLink(sessionId: string): Promise<string> {
  const material = await fetchSessionAccessMaterial(sessionId);
  return material.joinUrl;
}

export async function copySessionJoinLink(sessionId: string): Promise<string> {
  const material = await fetchSessionAccessMaterial(sessionId);
  await copyText(material.joinUrl);
  return material.joinUrl;
}

export async function copySessionAccessCode(sessionId: string): Promise<string> {
  const material = await fetchSessionAccessMaterial(sessionId);
  await copyText(material.accessCode);
  return material.accessCode;
}

export async function fetchInvitationAcceptLink(invitationId: string): Promise<string> {
  void invitationId;
  throw new Error(
    "Invitation tokens are one-shot. Copy the accept link shown after you send or resend the invite.",
  );
}

export async function copyInvitationAcceptLink(invitationId: string): Promise<string> {
  const url = await fetchInvitationAcceptLink(invitationId);
  await copyText(url);
  return url;
}
