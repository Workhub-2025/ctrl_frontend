import "server-only";

import type { FirebaseOrganization } from "@/lib/firebase-admin-tenancy-bff";
import type {
  FirebaseAdminBillingRequestRow,
  FirebasePriceRow,
} from "@/lib/firebase-billing-api";
import { platformPricingFromFirebasePrices } from "@/lib/firebase-billing-api";
import type { AdminRevenueAnalytics } from "@/services/admin-platform.service";

type FirebaseContractRow = Readonly<{
  documentId: string;
  id: string;
  organizationId: string;
  clientDocumentId: string;
  tier: string;
  status: string;
  seatCount: number;
  startDate: string | null;
  endDate: string | null;
  paymentStatus: string;
  lockedAnnualPlatformPence: number | null;
  pricingLockedUntil: string | null;
}>;

const TIER_LABELS: Record<string, string> = {
  essential: "Essential",
  professional: "Professional",
  founder: "Founder",
  unknown: "Unspecified",
};

function amountPence(row: FirebaseAdminBillingRequestRow): number {
  return Math.max(0, Number(row.amountDuePence ?? 0));
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function buildEmptyMonths(now = new Date()): AdminRevenueAnalytics["monthlyRevenue"] {
  const months: AdminRevenueAnalytics["monthlyRevenue"] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    months.push({
      month: monthKey(date),
      label: monthLabel(date),
      paidPence: 0,
      invoiceSentPence: 0,
      requestedPence: 0,
    });
  }
  return months;
}

function buildPipeline(
  requests: readonly FirebaseAdminBillingRequestRow[],
): AdminRevenueAnalytics["pipeline"] {
  const stages = [
    { status: "requested", label: "Requested" },
    { status: "invoice_sent", label: "Invoice sent" },
    { status: "paid", label: "Paid" },
    { status: "failed", label: "Failed / cancelled" },
  ] as const;

  return stages.map((stage) => {
    const matching = requests.filter((row) => {
      if (stage.status === "failed") {
        return ["failed", "cancelled", "void", "expired"].includes(row.billingStatus);
      }
      return row.billingStatus === stage.status;
    });
    return {
      status: stage.status,
      label: stage.label,
      amountPence: matching.reduce((total, row) => total + amountPence(row), 0),
      count: matching.length,
    };
  });
}

function buildMonthlyRevenue(
  requests: readonly FirebaseAdminBillingRequestRow[],
): AdminRevenueAnalytics["monthlyRevenue"] {
  const months = buildEmptyMonths();
  const byMonth = new Map(months.map((row) => [row.month, row]));

  for (const request of requests) {
    const stamp = parseTime(request.createdAt);
    if (stamp === null) continue;
    const key = monthKey(new Date(stamp));
    const bucket = byMonth.get(key);
    if (!bucket) continue;
    const pence = amountPence(request);
    if (request.billingStatus === "paid") bucket.paidPence += pence;
    else if (request.billingStatus === "invoice_sent") bucket.invoiceSentPence += pence;
    else if (request.billingStatus === "requested") bucket.requestedPence += pence;
  }

  return months;
}

function resolveAnnualPence(
  contract: FirebaseContractRow,
  prices: readonly FirebasePriceRow[],
): number {
  if (
    typeof contract.lockedAnnualPlatformPence === "number" &&
    Number.isFinite(contract.lockedAnnualPlatformPence)
  ) {
    return Math.max(0, contract.lockedAnnualPlatformPence);
  }
  const pricing = platformPricingFromFirebasePrices(prices);
  const tierPrice = (
    pricing.contractTypePrices as Record<
      string,
      { basePlatformYearlyPence?: number } | undefined
    >
  )[contract.tier];
  return Math.max(0, Number(tierPrice?.basePlatformYearlyPence ?? pricing.basePlatformYearlyPence ?? 0));
}

function tierLabel(tier: string): string {
  return TIER_LABELS[tier] ?? tier.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Builds the admin Analytics page model from Firebase tenancy + billing reads.
 * Empty collections produce zeros / empty lists — never a shape the UI cannot render.
 */
export function buildFirebaseAdminRevenueAnalytics(input: {
  organizations: readonly FirebaseOrganization[];
  contracts: readonly FirebaseContractRow[];
  billingRequests: readonly FirebaseAdminBillingRequestRow[];
  prices?: readonly FirebasePriceRow[];
}): AdminRevenueAnalytics {
  const { organizations, contracts, billingRequests, prices = [] } = input;
  const orgNameById = new Map(
    organizations.map((organization) => [organization.id, organization.legalName]),
  );

  const activeContracts = contracts.filter((contract) =>
    ["active", "pending_activation"].includes(contract.status),
  );

  const annualRecurringPence = activeContracts.reduce(
    (total, contract) => total + resolveAnnualPence(contract, prices),
    0,
  );
  const activeSeats = activeContracts.reduce(
    (total, contract) => total + Math.max(0, Number(contract.seatCount ?? 0)),
    0,
  );
  const activeClientIds = new Set(
    activeContracts.map((contract) => contract.organizationId || contract.clientDocumentId),
  );

  const tierBuckets = new Map<
    string,
    AdminRevenueAnalytics["byTier"][number]
  >();
  for (const contract of activeContracts) {
    const tier = contract.tier || "unknown";
    const bucket =
      tierBuckets.get(tier) ??
      {
        tier,
        label: tierLabel(tier),
        clients: 0,
        seats: 0,
        annualRecurringPence: 0,
        sharePercent: 0,
      };
    bucket.clients += 1;
    bucket.seats += Math.max(0, Number(contract.seatCount ?? 0));
    bucket.annualRecurringPence += resolveAnnualPence(contract, prices);
    tierBuckets.set(tier, bucket);
  }
  const byTier = Array.from(tierBuckets.values())
    .map((bucket) => ({
      ...bucket,
      sharePercent: annualRecurringPence
        ? Math.round((bucket.annualRecurringPence / annualRecurringPence) * 100)
        : 0,
    }))
    .sort((a, b) => b.annualRecurringPence - a.annualRecurringPence);

  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const yearStart = Date.UTC(now.getUTCFullYear(), 0, 1);
  const paidRequests = billingRequests.filter((row) => row.billingStatus === "paid");

  const collectedThisMonthPence = paidRequests.reduce((total, row) => {
    const stamp = parseTime(row.createdAt);
    return stamp !== null && stamp >= monthStart ? total + amountPence(row) : total;
  }, 0);
  const collectedYearToDatePence = paidRequests.reduce((total, row) => {
    const stamp = parseTime(row.createdAt);
    return stamp !== null && stamp >= yearStart ? total + amountPence(row) : total;
  }, 0);

  const outstandingInvoicePence = billingRequests.reduce(
    (total, row) =>
      row.billingStatus === "invoice_sent" ? total + amountPence(row) : total,
    0,
  );
  const requestedPipelinePence = billingRequests.reduce(
    (total, row) =>
      row.billingStatus === "requested" ? total + amountPence(row) : total,
    0,
  );
  const renewalPipelinePence = billingRequests.reduce(
    (total, row) =>
      row.requestKind === "contract_renewal" &&
      (row.billingStatus === "requested" || row.billingStatus === "invoice_sent")
        ? total + amountPence(row)
        : total,
    0,
  );

  const currency =
    billingRequests.find((row) => row.currency)?.currency ||
    prices.find((price) => price.currency)?.currency ||
    "gbp";

  const activeOrgCount = organizations.filter(
    (organization) => organization.status === "active",
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    currency,
    summary: {
      annualRecurringPence,
      monthlyRecurringPence: Math.round(annualRecurringPence / 12),
      collectedThisMonthPence,
      collectedYearToDatePence,
      outstandingInvoicePence,
      requestedPipelinePence,
      renewalPipelinePence,
      activeContracts: activeContracts.length,
      activeClients: activeClientIds.size || activeOrgCount,
      activeSeats,
      averageRevenuePerClientPence: activeClientIds.size
        ? Math.round(annualRecurringPence / activeClientIds.size)
        : 0,
    },
    byTier,
    pipeline: buildPipeline(billingRequests),
    monthlyRevenue: buildMonthlyRevenue(billingRequests),
    topClients: activeContracts
      .map((contract) => ({
        clientId: contract.organizationId || contract.clientDocumentId,
        clientName:
          orgNameById.get(contract.organizationId) ??
          orgNameById.get(contract.clientDocumentId) ??
          "Unnamed client",
        tier: tierLabel(contract.tier || "unknown"),
        seats: Math.max(0, Number(contract.seatCount ?? 0)),
        annualRecurringPence: resolveAnnualPence(contract, prices),
        contractEndDate: contract.endDate,
      }))
      .sort((a, b) => b.annualRecurringPence - a.annualRecurringPence)
      .slice(0, 8),
    recentPayments: paidRequests
      .slice()
      .sort((a, b) => (parseTime(b.createdAt) ?? 0) - (parseTime(a.createdAt) ?? 0))
      .slice(0, 8)
      .map((row) => ({
        id: row.documentId || row.id,
        requestNumber: row.requestNumber,
        clientName: row.clientName || "Unknown client",
        subject: row.subject,
        amountPence: amountPence(row),
        paidAt: row.createdAt || null,
        requestKind: row.requestKind,
      })),
  };
}

export function emptyFirebaseAdminRevenueAnalytics(
  organizations: readonly FirebaseOrganization[] = [],
): AdminRevenueAnalytics {
  return buildFirebaseAdminRevenueAnalytics({
    organizations,
    contracts: [],
    billingRequests: [],
    prices: [],
  });
}
