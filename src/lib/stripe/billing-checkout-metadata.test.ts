import { describe, expect, it } from "vitest";
import { parseBillingCheckoutMetadata } from "@/lib/stripe/billing-checkout-metadata";

describe("parseBillingCheckoutMetadata", () => {
  it("parses valid upgrade metadata", () => {
    const result = parseBillingCheckoutMetadata({
      metadata: {
        requestKind: "client_upgrade",
        clientDocumentId: "client-1",
        billingRequestDocumentId: "billing-1",
      },
    } as any);

    expect(result).toEqual({
      requestKind: "client_upgrade",
      clientDocumentId: "client-1",
      billingRequestDocumentId: "billing-1",
    });
  });

  it("returns null when billingRequestDocumentId is missing", () => {
    expect(
      parseBillingCheckoutMetadata({
        metadata: {
          requestKind: "contract_renewal",
          clientDocumentId: "client-1",
        },
      } as any)
    ).toBeNull();
  });

  it("returns null for invalid payloads", () => {
    expect(parseBillingCheckoutMetadata({ metadata: {} } as any)).toBeNull();
    expect(
      parseBillingCheckoutMetadata({
        metadata: {
          requestKind: "client_upgrade",
          clientDocumentId: "client-1",
        },
      } as any)
    ).toBeNull();
  });
});
