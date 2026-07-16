export function getClientSharedCandidateStatusBffPath(sharedCandidateId: string) {
  return `/api/client/shared-candidates/${encodeURIComponent(sharedCandidateId)}/status`;
}

export function getClientSharedCandidateReopenBffPath(sharedCandidateId: string) {
  return `/api/client/shared-candidates/${encodeURIComponent(sharedCandidateId)}/reopen`;
}
