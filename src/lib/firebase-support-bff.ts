import "server-only";

import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { createFirebaseSupportApi } from "@/lib/firebase-support-api";
import { getCachedDomainUserContext } from "@/lib/firebase-user-context-cache";

export async function requireFirebaseSupportSession(
  ...roles: Array<"candidate" | "hiring_manager" | "client" | "admin">
) {
  const auth = await requireFirebaseSession(...roles);
  const context = await getCachedDomainUserContext({
    firebaseUid: auth.firebaseUid,
    load: () => auth.domainApi.getUserContext(auth.firebaseSessionCookie),
  });
  if (context.accountStatus !== "active") {
    throw new Error("Account is not active");
  }
  return {
    ...auth,
    context,
    support: createFirebaseSupportApi(auth.domainApi, auth.firebaseSessionCookie),
  };
}
