import { fetchClient } from "@/lib/fetch-client";
import { normalizePortalError } from "@/lib/portal-fetch-cache";

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "awaiting_user"
  | "closed";

export type SupportTicketMessage = {
  id: string;
  documentId?: string;
  body: string;
  isInternal?: boolean;
  author?: {
    id: string;
    documentId?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: { name?: string; type?: string };
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportTicket = {
  id: string;
  documentId?: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: SupportTicketStatus | string;
  resolution?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  portal?: string | null;
  metadata?: Record<string, unknown> | null;
  submittedBy?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: { name?: string };
  } | null;
  assignedTo?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
  escalatedTo?: "ops" | "billing" | null;
  escalatedAt?: string | null;
  escalationNote?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketStats = {
  open: number;
  in_progress: number;
  awaiting_user: number;
  resolved: number;
  closed: number;
  total: number;
};

export class SupportTicketService {
  private static myTicketsInFlight: Promise<SupportTicket[]> | null = null;
  private static myTicketsCache: SupportTicket[] | null = null;
  private static myTicketsFetchedAt = 0;
  private static lastMyTicketsForceAt = 0;

  private static readonly MY_TICKETS_TTL_MS = 90_000;
  private static readonly MY_TICKETS_MIN_REFETCH_MS = 5_000;

  static hasFreshMyTicketsCache() {
    return (
      this.myTicketsCache !== null &&
      this.myTicketsFetchedAt > 0 &&
      Date.now() - this.myTicketsFetchedAt < this.MY_TICKETS_TTL_MS
    );
  }

  static getCachedMyTickets(): SupportTicket[] | null {
    return this.hasFreshMyTicketsCache() ? this.myTicketsCache : null;
  }

  static invalidateMyTickets() {
    this.myTicketsInFlight = null;
    this.myTicketsCache = null;
    this.myTicketsFetchedAt = 0;
  }

  static async createTicket(data: {
    subject: string;
    description: string;
    category: string;
    priority: string;
    metadata?: Record<string, unknown>;
  }): Promise<SupportTicket> {
    const response = await fetchClient("/support-tickets", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const body = await readJson<{ data: SupportTicket }>(response);
    this.invalidateMyTickets();
    return body.data;
  }

  static async getMyTickets(options?: { force?: boolean }): Promise<SupportTicket[]> {
    if (
      options?.force &&
      this.myTicketsCache &&
      this.hasFreshMyTicketsCache() &&
      Date.now() - this.lastMyTicketsForceAt < this.MY_TICKETS_MIN_REFETCH_MS
    ) {
      return this.myTicketsCache;
    }

    if (!options?.force && this.hasFreshMyTicketsCache()) {
      return this.myTicketsCache!;
    }

    if (!options?.force && this.myTicketsInFlight) {
      return this.myTicketsInFlight;
    }

    if (options?.force) {
      this.lastMyTicketsForceAt = Date.now();
    }

    this.myTicketsInFlight = fetchClient("/support-tickets/mine", {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await readJson<{ data: SupportTicket[] }>(response);
        const tickets = Array.isArray(body.data) ? body.data : [];
        this.myTicketsCache = tickets;
        this.myTicketsFetchedAt = Date.now();
        return tickets;
      })
      .catch((error) => {
        const rawMessage =
          error instanceof Error ? error.message : "Request could not be completed";
        const message = normalizePortalError(rawMessage, true);

        if (!message || /not found|404|forbidden|403/i.test(rawMessage)) {
          this.myTicketsCache = this.myTicketsCache ?? [];
          this.myTicketsFetchedAt = Date.now();
          return this.myTicketsCache ?? [];
        }

        throw new Error(message || "We could not load your tickets. Please try again shortly.");
      })
      .finally(() => {
        this.myTicketsInFlight = null;
      });

    return this.myTicketsInFlight;
  }

  static async getAllTickets(filters?: {
    status?: string;
    category?: string;
    priority?: string;
    search?: string;
  }): Promise<SupportTicket[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.priority) params.set("priority", filters.priority);
    if (filters?.search) params.set("search", filters.search);

    const qs = params.toString();
    const url = `/support-tickets${qs ? `?${qs}` : ""}`;

    const response = await fetchClient(url, { cache: "no-store" });
    const body = await readJson<{ data: SupportTicket[] }>(response);
    return Array.isArray(body.data) ? body.data : [];
  }

  static async getTicket(id: string): Promise<SupportTicket> {
    const response = await fetchClient(`/support-tickets/${id}`, {
      cache: "no-store",
    });
    const body = await readJson<{ data: SupportTicket }>(response);
    return body.data;
  }

  static async updateTicket(
    id: string,
    data: {
      status?: string;
      assignedTo?: string;
      resolution?: string;
    }
  ): Promise<SupportTicket> {
    const response = await fetchClient(`/support-tickets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    const body = await readJson<{ data: SupportTicket }>(response);
    return body.data;
  }

  static async getTicketStats(): Promise<TicketStats> {
    const response = await fetchClient("/support-tickets/stats", {
      cache: "no-store",
    });
    const body = await readJson<{ data: TicketStats }>(response);
    return (
      body.data ?? {
        open: 0,
        in_progress: 0,
        awaiting_user: 0,
        resolved: 0,
        closed: 0,
        total: 0,
      }
    );
  }

  static async getTicketMessages(id: string): Promise<SupportTicketMessage[]> {
    const response = await fetchClient(`/support-tickets/${id}/messages`, {
      cache: "no-store",
    });
    const body = await readJson<{ data: SupportTicketMessage[] }>(response);
    return Array.isArray(body.data) ? body.data : [];
  }

  static async addTicketMessage(
    id: string,
    data: { body: string; isInternal?: boolean }
  ): Promise<SupportTicketMessage> {
    const response = await fetchClient(`/support-tickets/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const body = await readJson<{ data: SupportTicketMessage }>(response);
    this.invalidateMyTickets();
    return body.data;
  }

  static async confirmTicketResolution(
    id: string,
    action: "confirm" | "reopen",
    body?: string
  ): Promise<SupportTicket> {
    const response = await fetchClient(`/support-tickets/${id}/confirm-resolution`, {
      method: "POST",
      body: JSON.stringify({ action, body }),
    });
    const result = await readJson<{ data: SupportTicket }>(response);
    this.invalidateMyTickets();
    return result.data;
  }

  static async escalateTicket(
    id: string,
    data: { target: "ops" | "billing"; note?: string },
  ): Promise<SupportTicket> {
    const response = await fetchClient(`/support-tickets/${id}/escalate`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    const body = await readJson<{ data: SupportTicket }>(response);
    return body.data;
  }
}
