import "server-only";

import type { ReturnTypeOfCreateFirebaseDomainApi } from "@/lib/firebase-domain-api-types";
import type {
  SupportTicket,
  SupportTicketMessage,
  TicketStats,
} from "@/services/support-ticket.service";

type FirebaseDomainRequester = Pick<
  ReturnTypeOfCreateFirebaseDomainApi,
  "request"
>;

type Envelope<T> = { data: T };

export function createFirebaseSupportApi(
  domainApi: FirebaseDomainRequester,
  firebaseSessionCookie: string,
) {
  return {
    createTicket(body: {
      subject: string;
      description: string;
      category: string;
      priority: string;
      metadata?: Record<string, unknown>;
    }): Promise<SupportTicket> {
      return domainApi
        .request<Envelope<SupportTicket>>({
          path: "/v1/support-tickets",
          method: "POST",
          firebaseSessionCookie,
          body,
        })
        .then((response) => response.data);
    },

    listMine(): Promise<SupportTicket[]> {
      return domainApi
        .request<Envelope<SupportTicket[]>>({
          path: "/v1/support-tickets/mine",
          firebaseSessionCookie,
        })
        .then((response) => response.data);
    },

    listAll(filters?: {
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
      return domainApi
        .request<Envelope<SupportTicket[]>>({
          path: `/v1/support-tickets${qs ? `?${qs}` : ""}`,
          firebaseSessionCookie,
        })
        .then((response) => response.data);
    },

    getStats(): Promise<TicketStats> {
      return domainApi
        .request<Envelope<TicketStats>>({
          path: "/v1/support-tickets/stats",
          firebaseSessionCookie,
        })
        .then((response) => response.data);
    },

    getTicket(ticketId: string): Promise<SupportTicket> {
      return domainApi
        .request<Envelope<SupportTicket>>({
          path: `/v1/support-tickets/${encodeURIComponent(ticketId)}`,
          firebaseSessionCookie,
        })
        .then((response) => response.data);
    },

    updateTicket(
      ticketId: string,
      body: {
        status?: string;
        assignedTo?: string | null;
        resolution?: string;
        priority?: string;
      },
    ): Promise<SupportTicket> {
      return domainApi
        .request<Envelope<SupportTicket>>({
          path: `/v1/support-tickets/${encodeURIComponent(ticketId)}`,
          method: "PUT",
          firebaseSessionCookie,
          body,
        })
        .then((response) => response.data);
    },

    listMessages(ticketId: string): Promise<SupportTicketMessage[]> {
      return domainApi
        .request<Envelope<SupportTicketMessage[]>>({
          path: `/v1/support-tickets/${encodeURIComponent(ticketId)}/messages`,
          firebaseSessionCookie,
        })
        .then((response) => response.data);
    },

    addMessage(
      ticketId: string,
      body: { body: string; isInternal?: boolean },
    ): Promise<SupportTicketMessage> {
      return domainApi
        .request<Envelope<SupportTicketMessage>>({
          path: `/v1/support-tickets/${encodeURIComponent(ticketId)}/messages`,
          method: "POST",
          firebaseSessionCookie,
          body,
        })
        .then((response) => response.data);
    },

    confirmResolution(
      ticketId: string,
      body: { action: "confirm" | "reopen"; body?: string },
    ): Promise<SupportTicket> {
      return domainApi
        .request<Envelope<SupportTicket>>({
          path: `/v1/support-tickets/${encodeURIComponent(ticketId)}/confirm-resolution`,
          method: "POST",
          firebaseSessionCookie,
          body,
        })
        .then((response) => response.data);
    },

    escalate(
      ticketId: string,
      body: { target: "ops" | "billing"; note?: string },
    ): Promise<SupportTicket> {
      return domainApi
        .request<Envelope<SupportTicket>>({
          path: `/v1/support-tickets/${encodeURIComponent(ticketId)}/escalate`,
          method: "POST",
          firebaseSessionCookie,
          body,
        })
        .then((response) => response.data);
    },
  };
}

export type FirebaseSupportApi = ReturnType<typeof createFirebaseSupportApi>;
