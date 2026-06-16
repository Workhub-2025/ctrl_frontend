async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Request failed with ${response.status}`);
  }
  return body;
}

export type SupportTicket = {
  id: string;
  documentId?: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  resolution?: string | null;
  resolvedAt?: string | null;
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
  createdAt: string;
  updatedAt: string;
};

export type TicketStats = {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
};

export class SupportTicketService {
  static async createTicket(data: {
    subject: string;
    description: string;
    category: string;
    priority: string;
    metadata?: Record<string, unknown>;
  }): Promise<SupportTicket> {
    const response = await fetch("/api/support-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await readJson<{ data: SupportTicket }>(response);
    return body.data;
  }

  static async getMyTickets(): Promise<SupportTicket[]> {
    const response = await fetch("/api/support-tickets/mine", {
      cache: "no-store",
    });
    const body = await readJson<{ data: SupportTicket[] }>(response);
    return Array.isArray(body.data) ? body.data : [];
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
    const url = `/api/support-tickets${qs ? `?${qs}` : ""}`;

    const response = await fetch(url, { cache: "no-store" });
    const body = await readJson<{ data: SupportTicket[] }>(response);
    return Array.isArray(body.data) ? body.data : [];
  }

  static async getTicket(id: string): Promise<SupportTicket> {
    const response = await fetch(`/api/support-tickets/${id}`, {
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
    const response = await fetch(`/api/support-tickets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await readJson<{ data: SupportTicket }>(response);
    return body.data;
  }

  static async getTicketStats(): Promise<TicketStats> {
    const response = await fetch("/api/support-tickets/stats", {
      cache: "no-store",
    });
    const body = await readJson<{ data: TicketStats }>(response);
    return (
      body.data ?? {
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
        total: 0,
      }
    );
  }
}
