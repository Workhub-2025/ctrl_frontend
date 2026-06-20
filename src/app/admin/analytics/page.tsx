"use client";

import { useMemo } from "react";
import {
  Banknote,
  BarChart3,
  CalendarClock,
  CreditCard,
  Loader2,
  PieChart,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminAlert,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
  AdminStatTile,
  AdminTableShell,
} from "@/components/admin/admin-portal-ui";
import { useAdminResource } from "@/lib/admin-resource-cache";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type RevenueAnalytics = {
  generatedAt: string;
  currency: string;
  summary: {
    annualRecurringPence: number;
    monthlyRecurringPence: number;
    collectedThisMonthPence: number;
    collectedYearToDatePence: number;
    outstandingInvoicePence: number;
    requestedPipelinePence: number;
    renewalPipelinePence: number;
    activeContracts: number;
    activeClients: number;
    activeSeats: number;
    averageRevenuePerClientPence: number;
  };
  byTier: Array<{
    tier: string;
    label: string;
    clients: number;
    seats: number;
    annualRecurringPence: number;
    sharePercent: number;
  }>;
  pipeline: Array<{
    status: string;
    label: string;
    amountPence: number;
    count: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    label: string;
    paidPence: number;
    invoiceSentPence: number;
    requestedPence: number;
  }>;
  topClients: Array<{
    clientId: string;
    clientName: string;
    tier: string;
    seats: number;
    annualRecurringPence: number;
    contractEndDate: string | null;
  }>;
  recentPayments: Array<{
    id: string;
    requestNumber: string;
    clientName: string;
    subject: string;
    amountPence: number;
    paidAt: string | null;
    requestKind: string;
  }>;
};

const EMPTY_ANALYTICS: RevenueAnalytics = {
  generatedAt: "",
  currency: "gbp",
  summary: {
    annualRecurringPence: 0,
    monthlyRecurringPence: 0,
    collectedThisMonthPence: 0,
    collectedYearToDatePence: 0,
    outstandingInvoicePence: 0,
    requestedPipelinePence: 0,
    renewalPipelinePence: 0,
    activeContracts: 0,
    activeClients: 0,
    activeSeats: 0,
    averageRevenuePerClientPence: 0,
  },
  byTier: [],
  pipeline: [],
  monthlyRevenue: [],
  topClients: [],
  recentPayments: [],
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function requestKindLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AdminAnalyticsPage() {
  const {
    data,
    error,
    loading,
    refetch,
  } = useAdminResource<RevenueAnalytics>(
    "admin:analytics",
    "/api/admin/analytics",
    EMPTY_ANALYTICS
  );

  const money = (pence: number) => formatMoney(pence, data.currency);
  const maxMonthlyValue = useMemo(
    () =>
      Math.max(
        1,
        ...data.monthlyRevenue.map(
          (row) => row.paidPence + row.invoiceSentPence + row.requestedPence
        )
      ),
    [data.monthlyRevenue]
  );
  const totalPipeline = data.summary.outstandingInvoicePence + data.summary.requestedPipelinePence;

  return (
    <div className="space-y-8 pb-6">
      <AdminPageHeader
        title="Analytics"
        description="Revenue, contract value, billing pipeline, and client concentration from live platform records."
        action={
          <Button
            type="button"
            variant="outline"
            className="rounded-lg"
            onClick={() => void refetch()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        }
      />

      {error ? <AdminAlert>{error}</AdminAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatTile
          icon={Banknote}
          label="Contract ARR"
          value={money(data.summary.annualRecurringPence)}
          detail={`${money(data.summary.monthlyRecurringPence)} monthly run rate`}
        />
        <AdminStatTile
          icon={ReceiptText}
          label="Collected this month"
          value={money(data.summary.collectedThisMonthPence)}
          detail={`${money(data.summary.collectedYearToDatePence)} paid year to date`}
        />
        <AdminStatTile
          icon={CreditCard}
          label="Open invoices"
          value={money(data.summary.outstandingInvoicePence)}
          detail={`${money(data.summary.requestedPipelinePence)} requested pipeline`}
        />
        <AdminStatTile
          icon={Users}
          label="Active clients"
          value={data.summary.activeClients}
          detail={`${data.summary.activeSeats} seats · ${money(data.summary.averageRevenuePerClientPence)} ARPA`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <AdminPanel className="space-y-5">
          <AdminSectionHeader
            eyebrow="12 months"
            title="Money movement"
            description="Paid billing requests, open invoices, and requested work by month."
          />

          <div className="flex h-64 items-end gap-2 overflow-x-auto pb-2">
            {data.monthlyRevenue.map((month) => {
              const paidHeight = Math.max(2, (month.paidPence / maxMonthlyValue) * 100);
              const invoiceHeight = Math.max(0, (month.invoiceSentPence / maxMonthlyValue) * 100);
              const requestedHeight = Math.max(0, (month.requestedPence / maxMonthlyValue) * 100);
              const hasValue = month.paidPence + month.invoiceSentPence + month.requestedPence > 0;

              return (
                <div key={month.month} className="flex min-w-12 flex-1 flex-col items-center gap-2">
                  <div className="flex h-48 w-full max-w-12 items-end overflow-hidden rounded-lg border border-border/60 bg-muted/25 dark:border-white/8 dark:bg-white/[0.03]">
                    {hasValue ? (
                      <div className="flex w-full flex-col justify-end">
                        <div
                          className="w-full bg-emerald-500/80"
                          style={{ height: `${paidHeight}%` }}
                          title={`Paid ${money(month.paidPence)}`}
                        />
                        <div
                          className="w-full bg-sky-500/70"
                          style={{ height: `${invoiceHeight}%` }}
                          title={`Invoice sent ${money(month.invoiceSentPence)}`}
                        />
                        <div
                          className="w-full bg-amber-400/80"
                          style={{ height: `${requestedHeight}%` }}
                          title={`Requested ${money(month.requestedPence)}`}
                        />
                      </div>
                    ) : null}
                  </div>
                  <span className="whitespace-nowrap text-[11px] font-medium text-muted-foreground">
                    {month.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/80" />
              Paid
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-sky-500/70" />
              Invoice sent
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-400/80" />
              Requested
            </span>
          </div>
        </AdminPanel>

        <AdminPanel className="space-y-5">
          <AdminSectionHeader
            eyebrow="Pipeline"
            title="Billing stages"
            description={`${money(totalPipeline)} currently awaiting admin or client action.`}
          />

          <div className="space-y-4">
            {data.pipeline.map((stage) => {
              const percent = totalPipeline
                ? Math.min(100, Math.round((stage.amountPence / totalPipeline) * 100))
                : stage.status === "paid"
                  ? 100
                  : 0;

              return (
                <div key={stage.status} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-foreground">{stage.label}</span>
                    <span className="text-muted-foreground">
                      {stage.count} · {money(stage.amountPence)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted dark:bg-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        stage.status === "paid"
                          ? "bg-emerald-500"
                          : stage.status === "invoice_sent"
                            ? "bg-sky-500"
                            : stage.status === "requested"
                              ? "bg-amber-400"
                              : "bg-rose-500"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel className="space-y-5">
          <AdminSectionHeader
            eyebrow="Contracts"
            title="Tier mix"
            description={`${data.summary.activeContracts} active contracts contributing to ARR.`}
          />
          <div className="space-y-4">
            {data.byTier.length ? data.byTier.map((tier) => (
              <div key={tier.tier} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                    <PieChart className="h-4 w-4 text-primary" />
                    {tier.label}
                  </span>
                  <span className="text-muted-foreground">
                    {tier.clients} clients · {money(tier.annualRecurringPence)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted dark:bg-white/10">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${tier.sharePercent}%` }} />
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No active contract revenue yet.</p>
            )}
          </div>
        </AdminPanel>

        <AdminPanel className="space-y-5">
          <AdminSectionHeader
            eyebrow="Payments"
            title="Recent paid work"
            description="Latest paid billing requests recorded by the platform."
          />
          <div className="space-y-3">
            {data.recentPayments.length ? data.recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 dark:border-white/8 dark:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{payment.clientName}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {payment.requestNumber} · {requestKindLabel(payment.requestKind)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-foreground">{money(payment.amountPence)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(payment.paidAt)}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No paid billing requests yet.</p>
            )}
          </div>
        </AdminPanel>
      </div>

      <AdminTableShell
        toolbar={
          <AdminSectionHeader
            eyebrow="Concentration"
            title="Top clients by contract value"
            description="Active contracts ranked by annual recurring value."
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Seats</TableHead>
              <TableHead className="text-right">ARR</TableHead>
              <TableHead className="text-right">Contract end</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.topClients.length ? data.topClients.map((client) => (
              <TableRow key={client.clientId}>
                <TableCell className="font-medium text-foreground">{client.clientName}</TableCell>
                <TableCell>{client.tier}</TableCell>
                <TableCell className="text-right">{client.seats}</TableCell>
                <TableCell className="text-right font-semibold">
                  {money(client.annualRecurringPence)}
                </TableCell>
                <TableCell className="text-right">{formatDate(client.contractEndDate)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Active contract values will appear here once clients are live.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminTableShell>

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStatTile
          icon={BarChart3}
          label="Renewal pipeline"
          value={money(data.summary.renewalPipelinePence)}
          detail="Requested or invoiced contract renewals"
        />
        <AdminStatTile
          icon={TrendingUp}
          label="Requested upgrades"
          value={money(data.summary.requestedPipelinePence)}
          detail="Work waiting for invoice or review"
        />
        <AdminStatTile
          icon={CalendarClock}
          label="Last refreshed"
          value={data.generatedAt ? formatDate(data.generatedAt) : "Not loaded"}
          detail="Live from Strapi admin records"
        />
      </div>
    </div>
  );
}
