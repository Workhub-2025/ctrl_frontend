"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  RotateCw,
  Send,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdminAlert,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
  AdminStatTile,
} from "@/components/admin/admin-portal-ui";
import {
  PortalEmptyState,
  portalBadgeClass,
} from "@/components/dashboard/portal/portal-ui";
import { formatMoney } from "@/lib/money";
import {
  fetchPortalJson,
  invalidatePortalCache,
} from "@/lib/portal-fetch-cache";
import { cn } from "@/lib/utils";

type AdminUpgradeRequest = {
  id: string;
  requestNumber: string;
  clientDocumentId: string;
  clientName: string;
  subject: string;
  upgradeType: string;
  billingStatus: string;
  amountDuePence?: number | null;
  currency?: string;
  createdAt: string;
};

const UPGRADE_TYPE_LABELS: Record<string, string> = {
  seat_increase: "Seat increase",
  new_assessment: "New assessment",
  assessment_version: "Assessment",
  delivery_feature: "Delivery feature",
  upgrade_bundle: "Bundled upgrade",
  contract_extension: "Contract renewal",
};

const STAGES = [
  {
    key: "requested",
    title: "Requested",
    description: "Submitted by client — ready for you to review and invoice.",
  },
  {
    key: "invoice_sent",
    title: "Invoice sent",
    description: "Stripe checkout link created — awaiting client payment.",
  },
  {
    key: "paid",
    title: "Paid",
    description: "Payment received — entitlements applied automatically.",
  },
] as const;

export default function AdminUpgradeRequestsPage() {
  const [requests, setRequests] = useState<AdminUpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async (force = false) => {
    if (force) invalidatePortalCache("admin:billing:upgrade-requests");
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchPortalJson<AdminUpgradeRequest[]>({
        key: "admin:billing:upgrade-requests",
        url: "/api/admin/billing/upgrade-requests",
        fallback: [],
        force,
        allowEmpty: true,
      });
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade requests could not be loaded");
    } finally {
      if (force) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };

    document.addEventListener("visibilitychange", refreshIfVisible);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    }, 20_000);

    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.clearInterval(intervalId);
    };
  }, []);

  const grouped = useMemo(() => {
    const buckets: Record<string, AdminUpgradeRequest[]> = {
      requested: [],
      invoice_sent: [],
      paid: [],
    };

    for (const request of requests) {
      const status = request.billingStatus ?? "requested";
      if (status in buckets) {
        buckets[status].push(request);
      } else {
        buckets.requested.push(request);
      }
    }

    return buckets;
  }, [requests]);

  const sendInvoice = async (requestId: string) => {
    setSendingId(requestId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/billing/send-invoice/${encodeURIComponent(requestId)}`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Invoice could not be sent");

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? {
                ...request,
                billingStatus: "invoice_sent",
                amountDuePence: body.data?.amountDuePence ?? request.amountDuePence,
                currency: body.data?.currency ?? request.currency ?? "gbp",
              }
            : request
        )
      );
      setMessage("Invoice sent — client can pay from their upgrade requests page.");
      invalidatePortalCache("admin:billing:upgrade-requests");
      void load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invoice could not be sent");
    } finally {
      setSendingId(null);
    }
  };

  const resendInvoice = async (requestId: string) => {
    setResendingId(requestId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/billing/resend-invoice/${encodeURIComponent(requestId)}`,
        { method: "POST" }
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Payment link could not be resent");

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? {
                ...request,
                billingStatus: "invoice_sent",
                amountDuePence: body.data?.amountDuePence ?? request.amountDuePence,
                currency: body.data?.currency ?? request.currency ?? "gbp",
              }
            : request
        )
      );
      setMessage("Payment link regenerated — client can use Pay now again.");
      invalidatePortalCache("admin:billing:upgrade-requests");
      void load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment link could not be resent");
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-6">
      <AdminPageHeader
        title="Upgrade requests"
        description="Client-submitted seat, assessment, and feature upgrades — tracked separately from support tickets."
        notice={
          error ? (
            <AdminAlert>{error}</AdminAlert>
          ) : message ? (
            <AdminAlert tone="info">{message}</AdminAlert>
          ) : null
        }
        action={
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            disabled={refreshing}
            onClick={() => void load(true)}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStatTile
          label="Requested"
          value={grouped.requested.length}
          detail="Awaiting admin invoice"
          icon={TrendingUp}
        />
        <AdminStatTile
          label="Invoice sent"
          value={grouped.invoice_sent.length}
          detail="Awaiting client payment"
          icon={CreditCard}
        />
        <AdminStatTile
          label="Paid"
          value={grouped.paid.length}
          detail="Fulfilled automatically"
          icon={CheckCircle2}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading upgrade requests…</p>
      ) : requests.length === 0 ? (
        <PortalEmptyState
          icon={TrendingUp}
          title="No upgrade requests yet"
          description="When clients submit upgrade requests from their portal, they will appear here — not in Support tickets."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {STAGES.map((stage) => (
            <section key={stage.key} className="space-y-4">
              <AdminSectionHeader title={stage.title} description={stage.description} />
              <div className="space-y-3">
                {grouped[stage.key].length === 0 ? (
                  <AdminPanel className="py-8 text-center text-sm text-muted-foreground">
                    None in this stage
                  </AdminPanel>
                ) : (
                  grouped[stage.key].map((request) => (
                    <AdminPanel key={request.id} className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn(portalBadgeClass, "rounded-full text-[10px]")}>
                          {UPGRADE_TYPE_LABELS[request.upgradeType] ?? request.upgradeType.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline" className={cn(portalBadgeClass, "rounded-full font-mono text-[10px]")}>
                          {request.requestNumber}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{request.clientName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{request.subject}</p>
                      </div>
                      {request.amountDuePence ? (
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(request.amountDuePence, request.currency ?? "gbp")}
                        </p>
                      ) : null}
                      {stage.key === "requested" ? (
                        <Button
                          size="sm"
                          className="w-full rounded-xl gap-2"
                          disabled={sendingId === request.id}
                          onClick={() => void sendInvoice(request.id)}
                        >
                          {sendingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Send invoice
                        </Button>
                      ) : null}
                      {stage.key === "invoice_sent" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full rounded-xl gap-2"
                          disabled={resendingId === request.id}
                          onClick={() => void resendInvoice(request.id)}
                        >
                          {resendingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCw className="h-4 w-4" />
                          )}
                          Resend link
                        </Button>
                      ) : null}
                    </AdminPanel>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
