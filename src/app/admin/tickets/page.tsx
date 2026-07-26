"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ticket,
  RefreshCw,
  Search,
  ChevronDown,
  Loader2,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Globe,
  Monitor,
  Calendar,
  Save,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { portalBadgeClass } from "@/components/dashboard/portal/portal-ui";
import {
  SupportTicketService,
  type SupportTicket,
  type SupportTicketMessage,
  type TicketStats,
} from "@/services/support-ticket.service";
import { AdminPageHeader, AdminStatTile, AdminTableShell } from "@/components/admin/admin-portal-ui";
import { PortalSidePanel } from "@/components/dashboard/portal/portal-workspace-ui";
import { hasAdminPermission } from "@/lib/auth/admin-portal-permissions";

/* ── helpers ─────────────────────────────────────────────── */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug",
  feature_request: "Feature",
  access_issue: "Access",
  assessment_issue: "Assessment",
  reasonable_adjustment: "Adjustment",
  general: "General",
  contact: "Contact",
};

const STATUS_OPTIONS = [
  "open",
  "in_progress",
  "awaiting_user",
  "resolved",
  "closed",
];

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  awaiting_user: "Awaiting User Confirmation",
  resolved: "Resolved (→ awaiting user)",
  closed: "Closed",
};
const CATEGORY_OPTIONS = [
  "bug",
  "feature_request",
  "access_issue",
  "assessment_issue",
  "reasonable_adjustment",
  "general",
  "contact",
];
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];

function userDisplayName(user: SupportTicket["submittedBy"]): string {
  if (!user) return "Unknown";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.email || "Unknown";
}

function userRoleBadge(user: SupportTicket["submittedBy"]): string {
  const roleName = user?.role?.name?.toLowerCase() || "";
  if (roleName.includes("admin")) return "Admin";
  if (roleName.includes("hiring") || roleName.includes("manager")) return "HM";
  return "Candidate";
}

/* ── stat tile uses AdminStatTile from portal-ui ─────────── */

function formatDateTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function messageAuthorLabel(message: SupportTicketMessage): string {
  const author = message.author;
  if (!author) return "System";
  const name = [author.firstName, author.lastName].filter(Boolean).join(" ");
  return name || author.email || "Unknown";
}

/* ── ticket detail workspace ──────────────────────────── */

function TicketDetailDialog({
  ticket,
  open,
  onOpenChange,
  onUpdated,
}: {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
}) {
  const [status, setStatus] = useState(ticket?.status || "open");
  const [resolution, setResolution] = useState(ticket?.resolution || "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [escalationNote, setEscalationNote] = useState("");
  const [escalating, setEscalating] = useState<"ops" | "billing" | null>(null);
  const { data: session } = useSession();
  const canEscalate = hasAdminPermission(session?.user?.role, "tickets.escalate");

  const ticketId = ticket?.documentId || ticket?.id;

  const loadMessages = useCallback(async () => {
    if (!ticketId) return;
    setLoadingMessages(true);
    try {
      const data = await SupportTicketService.getTicketMessages(ticketId);
      setMessages(data);
    } catch (err) {
      console.error("Failed to load ticket messages", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      setResolution(ticket.resolution || "");
      setSaveError("");
      setReply("");
      setIsInternal(false);
      setEscalationNote("");
    }
  }, [ticket]);

  useEffect(() => {
    if (open && ticketId) {
      void loadMessages();
    }
  }, [open, ticketId, loadMessages]);

  const handleSave = async () => {
    if (!ticket) return;
    setSaving(true);
    setSaveError("");
    try {
      await SupportTicketService.updateTicket(
        ticket.documentId || ticket.id,
        {
          status,
          resolution: resolution.trim() || undefined,
        }
      );
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update ticket"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSendReply = async () => {
    if (!ticketId || !reply.trim()) return;
    setSending(true);
    try {
      await SupportTicketService.addTicketMessage(ticketId, {
        body: reply.trim(),
        isInternal,
      });
      setReply("");
      setIsInternal(false);
      await loadMessages();
      onUpdated();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  };

  const handleEscalate = async (target: "ops" | "billing") => {
    if (!ticketId) return;
    setEscalating(target);
    setSaveError("");
    try {
      await SupportTicketService.escalateTicket(ticketId, {
        target,
        note: escalationNote.trim() || undefined,
      });
      setEscalationNote("");
      await loadMessages();
      onUpdated();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to escalate ticket",
      );
    } finally {
      setEscalating(null);
    }
  };

  if (!ticket) return null;

  const metadata = ticket.metadata as { pageUrl?: string; userAgent?: string; recipient?: string } | null;
  const canReply = status !== "closed";

  return (
    <PortalSidePanel
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Support ticket"
      title={ticket.ticketNumber}
      description={ticket.subject}
      icon={Ticket}
      width="lg"
      footer={
        <div className="space-y-2">
          {saveError ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {saveError}
            </p>
          ) : null}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-10 w-full gap-2 rounded-md font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save changes
              </>
            )}
          </Button>
        </div>
      }
    >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] font-bold uppercase tracking-wider ${portalBadgeClass}`}
            >
              {ticket.status.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Updated {formatDateTime(ticket.updatedAt)}
            </span>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </p>
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-4 text-sm leading-relaxed text-foreground">
              {ticket.description}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <User className="h-3 w-3" /> Submitted by
              </p>
              <p className="text-sm font-medium text-foreground">
                {userDisplayName(ticket.submittedBy)}
              </p>
              <p className="text-xs text-muted-foreground">
                {ticket.submittedBy?.email}
              </p>
              <Badge
                variant="outline"
                className="mt-1 text-[10px]"
              >
                {userRoleBadge(ticket.submittedBy)}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-3 w-3" /> Timestamps
              </p>
              <p className="text-xs text-muted-foreground">
                Created: {new Date(ticket.createdAt).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Updated: {new Date(ticket.updatedAt).toLocaleString()}
              </p>
              {ticket.resolvedAt && (
                <p className="text-xs text-muted-foreground">
                  Resolved: {new Date(ticket.resolvedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Category & Priority */}
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${portalBadgeClass}`}
            >
              {CATEGORY_LABELS[ticket.category] || ticket.category}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${portalBadgeClass}`}
            >
              {ticket.priority}
            </Badge>
            {ticket.portal && (
              <Badge
                variant="outline"
                className="text-xs"
              >
                {ticket.portal}
              </Badge>
            )}
          </div>

          {/* Metadata */}
          {metadata && Object.keys(metadata).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Metadata
              </p>
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
                {metadata.pageUrl && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3 shrink-0" />
                    {String(metadata.pageUrl)}
                  </p>
                )}
                {metadata.userAgent && (
                  <p className="flex items-center gap-1.5 break-all text-xs text-muted-foreground">
                    <Monitor className="h-3 w-3 shrink-0" />
                    {truncate(String(metadata.userAgent), 120)}
                  </p>
                )}
                {metadata.recipient && (
                  <p className="text-xs text-muted-foreground">
                    Recipient: {String(metadata.recipient)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Message thread */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conversation
            </p>
            {loadingMessages ? (
              <p className="text-sm text-muted-foreground">Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No thread messages yet.</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {messages.map((message) => (
                  <li
                    key={message.documentId || message.id}
                    className={`rounded-lg border p-3 text-sm ${
                      message.isInternal
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-border bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {messageAuthorLabel(message)}
                        {message.isInternal ? (
                          <span className="ml-2 text-amber-400">Internal</span>
                        ) : null}
                      </span>
                      <time>{formatDateTime(message.createdAt)}</time>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-foreground">
                      {message.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {canReply ? (
              <div className="space-y-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  aria-label="Reply to ticket"
                  placeholder="Reply to the user…"
                  rows={3}
                  className="resize-none rounded-lg bg-background focus-visible:ring-primary"
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="internal-note"
                    checked={isInternal}
                    onCheckedChange={(checked) =>
                      setIsInternal(checked === true)
                    }
                  />
                  <Label
                    htmlFor="internal-note"
                    className="cursor-pointer text-xs text-muted-foreground"
                  >
                    Internal note (not visible to submitter)
                  </Label>
                </div>
                <Button
                  size="sm"
                  onClick={handleSendReply}
                  disabled={sending || !reply.trim()}
                  className="gap-2"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Send reply
                </Button>
              </div>
            ) : null}
          </div>

          {/* Admin Actions */}
          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Admin actions
            </p>

            {ticket.escalatedTo ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">
                  Escalated to {ticket.escalatedTo === "billing" ? "Billing" : "Operations"}
                </Badge>
                {ticket.escalatedAt ? (
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(ticket.escalatedAt)}
                  </span>
                ) : null}
              </div>
            ) : null}

            {canEscalate && canReply ? (
              <div className="space-y-3 rounded-lg border border-dashed border-primary/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  Escalate to another queue
                </p>
                <Textarea
                  value={escalationNote}
                  onChange={(event) => setEscalationNote(event.target.value)}
                  aria-label="Escalation handoff note"
                  placeholder="Optional handoff note for ops or billing…"
                  rows={2}
                  className="resize-none rounded-lg bg-background focus-visible:ring-primary"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleEscalate("ops")}
                    disabled={escalating !== null}
                  >
                    {escalating === "ops" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Escalate to ops
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleEscalate("billing")}
                    disabled={escalating !== null}
                  >
                    {escalating === "billing" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Escalate to billing
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="ticket-status" className="text-xs font-semibold text-muted-foreground">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="ticket-status" className="h-10 rounded-lg bg-background focus:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s] ||
                        s.replace("_", " ").replace(/\b\w/g, (c) =>
                          c.toUpperCase()
                        )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(status === "awaiting_user" || status === "resolved") && (
                <p className="text-xs text-muted-foreground">
                  User must confirm before the ticket closes. Use &quot;Awaiting
                  User Confirmation&quot; or &quot;Resolved&quot; — both notify
                  the submitter.
                </p>
              )}
            </div>

            {(status === "awaiting_user" ||
              status === "resolved" ||
              status === "closed") && (
              <div className="space-y-2">
                <Label htmlFor="ticket-resolution" className="text-xs font-semibold text-muted-foreground">
                  Resolution notes
                </Label>
                <Textarea
                  id="ticket-resolution"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Describe the resolution…"
                  rows={3}
                  className="resize-none rounded-lg bg-background focus-visible:ring-primary"
                />
              </div>
            )}
          </div>
        </div>
    </PortalSidePanel>
  );
}

/* ── main page ─────────────────────────────────────────── */

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    open: 0,
    in_progress: 0,
    awaiting_user: 0,
    resolved: 0,
    closed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const [ticketsData, statsData] = await Promise.all([
        SupportTicketService.getAllTickets(),
        SupportTicketService.getTicketStats(),
      ]);
      setTickets(ticketsData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => fetchData(false);

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }
    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tickets, statusFilter, categoryFilter, priorityFilter, search]);

  const statusTabs = [
    { key: "all", label: "All", count: stats.total },
    { key: "open", label: "Open", count: stats.open },
    { key: "in_progress", label: "In Progress", count: stats.in_progress },
    {
      key: "awaiting_user",
      label: "Awaiting User",
      count: stats.awaiting_user ?? 0,
    },
    { key: "resolved", label: "Resolved", count: stats.resolved },
    { key: "closed", label: "Closed", count: stats.closed },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Support tickets"
        description="Review, triage, and resolve user-submitted tickets."
        action={
          <Button
            variant="outline"
            className="rounded-lg gap-2"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminStatTile
          label="Open"
          value={loading ? "—" : stats.open}
          icon={AlertCircle}
        />
        <AdminStatTile
          label="In Progress"
          value={loading ? "—" : stats.in_progress}
          icon={Clock}
        />
        <AdminStatTile
          label="Resolved"
          value={loading ? "—" : stats.resolved}
          icon={CheckCircle2}
        />
        <AdminStatTile
          label="Total"
          value={loading ? "—" : stats.total}
          icon={Inbox}
        />
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 pb-4">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
              statusFilter === tab.key
                ? "bg-primary/15 text-primary border border-primary/20"
                : "border border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            }`}
          >
            {tab.label}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
                statusFilter === tab.key
                  ? "bg-primary/20 text-primary"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ticket # or subject…"
            className="pl-9 rounded-xl border-border/70 focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px] h-9 rounded-xl border-border/70 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c] || c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-9 rounded-xl border-border/70 text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ticket List */}
      <AdminTableShell>
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-48 flex-1" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/30">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              No tickets found
            </p>
            <p className="text-xs text-muted-foreground">
              {search || statusFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your filters."
                : "No support tickets have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40 dark:divide-white/5">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => {
                  setSelectedTicket(ticket);
                  setDetailOpen(true);
                }}
                className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/20"
              >
                {/* Ticket # */}
                <span className="font-mono text-xs font-bold text-primary shrink-0 w-[90px]">
                  {ticket.ticketNumber}
                </span>

                {/* Subject */}
                <span className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">
                  {ticket.subject}
                </span>

                {/* Category */}
                <Badge
                  variant="outline"
                  className={`shrink-0 text-[10px] font-bold uppercase ${portalBadgeClass}`}
                >
                  {CATEGORY_LABELS[ticket.category] || ticket.category}
                </Badge>

                {/* Priority */}
                <Badge
                  variant="outline"
                  className={`shrink-0 text-[10px] font-bold uppercase ${portalBadgeClass}`}
                >
                  {ticket.priority}
                </Badge>

                {/* Status */}
                <Badge
                  variant="outline"
                  className={`shrink-0 text-[10px] font-bold uppercase ${portalBadgeClass}`}
                >
                  {ticket.status.replace("_", " ")}
                </Badge>

                {/* Submitted by */}
                <div className="hidden lg:flex items-center gap-1.5 shrink-0 w-[140px]">
                  <span className="truncate text-xs text-muted-foreground">
                    {userDisplayName(ticket.submittedBy)}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-border bg-muted/30 text-[9px] text-muted-foreground"
                  >
                    {userRoleBadge(ticket.submittedBy)}
                  </Badge>
                </div>

                {/* Time */}
                <span className="w-[70px] shrink-0 text-right text-[11px] text-muted-foreground">
                  {relativeTime(ticket.createdAt)}
                </span>

                {/* Arrow */}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </button>
            ))}
          </div>
        )}
      </AdminTableShell>
      <TicketDetailDialog
        ticket={selectedTicket}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleRefresh}
      />
    </div>
  );
}
