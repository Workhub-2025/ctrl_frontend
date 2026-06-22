import "server-only";

import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/server";

const PORTAL_METADATA_KEY = "ctrlManaged";
const PORTAL_METADATA_VALUE = "contract-gated-v1";

let cachedConfigurationId: string | null = null;

function buildPortalFeatures(): Stripe.BillingPortal.ConfigurationCreateParams.Features {
  return {
    customer_update: {
      enabled: true,
      allowed_updates: ["email", "address", "phone", "tax_id"],
    },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    // Annual contracts are governed in-app — no mid-term cancel or self-serve plan changes.
    subscription_cancel: { enabled: false },
    subscription_update: { enabled: false },
  };
}

async function findManagedPortalConfiguration(
  stripe: Stripe
): Promise<Stripe.BillingPortal.Configuration | null> {
  const configurations = await stripe.billingPortal.configurations.list({ limit: 100 });
  return (
    configurations.data.find(
      (configuration) =>
        configuration.active &&
        configuration.metadata?.[PORTAL_METADATA_KEY] === PORTAL_METADATA_VALUE
    ) ?? null
  );
}

/**
 * Stripe Customer Portal limited to payment methods and invoice history.
 * Upgrades, downgrades, and cancellation stay in the CTRL contract workflow.
 */
export async function resolveBillingPortalConfigurationId(): Promise<string> {
  const fromEnv = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (cachedConfigurationId) {
    return cachedConfigurationId;
  }

  const stripe = getStripeClient();
  const existing = await findManagedPortalConfiguration(stripe);
  if (existing) {
    cachedConfigurationId = existing.id;
    return existing.id;
  }

  const created = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "CTRL Assess billing",
    },
    features: buildPortalFeatures(),
    metadata: {
      [PORTAL_METADATA_KEY]: PORTAL_METADATA_VALUE,
    },
  });

  cachedConfigurationId = created.id;
  return created.id;
}
