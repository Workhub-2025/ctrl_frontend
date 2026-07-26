import "server-only";

import { createFirebaseDomainApi } from "@/lib/firebase-domain-api";

export type ReturnTypeOfCreateFirebaseDomainApi = ReturnType<
  typeof createFirebaseDomainApi
>;
