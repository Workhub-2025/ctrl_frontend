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

  it("accepts legacy ticketDocumentId alias", () => {
    const result = parseBillingCheckoutMetadata({
      metadata: {
        requestKind: "contract_renewal",
        clientDocumentId: "client-1",
        ticketDocumentId: "billing-legacy",
      },
    } as any);

    expect(result?.billingRequestDocumentId).toBe("billing-legacy");
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
