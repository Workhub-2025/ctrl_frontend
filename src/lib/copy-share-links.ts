"use client";

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function isSecureAccessCodePlaceholder(accessValue: string | null | undefined) {
  return !accessValue || /configured securely/i.test(accessValue);
}

export async function fetchSessionJoinLink(sessionId: string): Promise<string> {
  const response = await fetch(
    `/api/hiring-manager/sessions/${encodeURIComponent(sessionId)}/join-link`,
    { cache: "no-store" },
  );
  const body = (await response.json().catch(() => ({}))) as {
    data?: { joinUrl?: string };
    error?: string;
  };
  if (!response.ok || !body.data?.joinUrl) {
    throw new Error(body.error || "Join link could not be loaded");
  }
  return body.data.joinUrl;
}

export async function copySessionJoinLink(sessionId: string): Promise<string> {
  const joinUrl = await fetchSessionJoinLink(sessionId);
  await copyText(joinUrl);
  return joinUrl;
}

export async function fetchInvitationAcceptLink(invitationId: string): Promise<string> {
  const response = await fetch(
    `/api/client/invitations/${encodeURIComponent(invitationId)}/accept-link`,
    { cache: "no-store" },
  );
  const body = (await response.json().catch(() => ({}))) as {
    data?: { inviteAcceptUrl?: string };
    error?: string;
  };
  if (!response.ok || !body.data?.inviteAcceptUrl) {
    throw new Error(body.error || "Invite accept link could not be loaded");
  }
  return body.data.inviteAcceptUrl;
}

export async function copyInvitationAcceptLink(invitationId: string): Promise<string> {
  const url = await fetchInvitationAcceptLink(invitationId);
  await copyText(url);
  return url;
}
