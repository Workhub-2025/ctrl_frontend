import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";

export function rejectMutatingCrossOrigin(request: Request): Response | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  return rejectCrossOriginRequest(request);
}
