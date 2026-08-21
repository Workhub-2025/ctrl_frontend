import "server-only";

import { createDomainApi } from "@/lib/domain-api";

export type DomainApi = ReturnType<typeof createDomainApi>;
