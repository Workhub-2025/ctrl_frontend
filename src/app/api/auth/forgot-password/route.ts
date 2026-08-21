import { firebaseAuthRouteGoneResponse } from "@/lib/auth/firebase-auth-route-gone";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) {
    return forbidden;
  }
  return firebaseAuthRouteGoneResponse()!;
}
