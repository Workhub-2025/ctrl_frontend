import type Stripe from "stripe";

export type BillingCheckoutMetadata = {
  requestKind: "client_upgrade" | "contract_renewal" | "contract_activation";
  clientDocumentId: string;
  billingRequestDocumentId: string;
};

export function parseBillingCheckoutMetadata(
  session: Stripe.Checkout.Session
): BillingCheckoutMetadata | null {
  const requestKind = session.metadata?.requestKind;
  if (
    requestKind !== "client_upgrade" &&
    requestKind !== "contract_renewal" &&
    requestKind !== "contract_activation"
  ) {
    return null;
  }

  const clientDocumentId = session.metadata?.clientDocumentId;
  const billingRequestDocumentId = session.metadata?.billingRequestDocumentId;

  if (!clientDocumentId || !billingRequestDocumentId) {
    return null;
  }

  return {
    requestKind,
    clientDocumentId,
    billingRequestDocumentId,
  };
}
