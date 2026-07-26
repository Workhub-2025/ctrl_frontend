"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatMoney } from "@/lib/money";

export type PendingPayment = {
  id: string;
  subject: string;
  amountDuePence?: number | null;
  currency?: string | null;
  lineItems?: ReadonlyArray<{
    label: string;
    quantity: number;
    unitAmountPence: number;
  }>;
};

/**
 * Every payment action passes through here first — a saved card must never be
 * charged without the payer seeing the amount and confirming it.
 */
export function ClientPaymentConfirmDialog({
  payment,
  busy,
  onCancel,
  onConfirm,
}: {
  payment: PendingPayment | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const currency = payment?.currency ?? "gbp";
  const lineItems = payment?.lineItems ?? [];

  return (
    <AlertDialog
      open={payment !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm this payment</AlertDialogTitle>
          <AlertDialogDescription>
            {payment?.subject ?? "Review the charge before continuing."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
          {lineItems.length > 0 ? (
            <ul className="space-y-1.5">
              {lineItems.map((item, index) => (
                <li
                  key={`${item.label}-${index}`}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <span className="text-muted-foreground">
                    {item.label}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatMoney(item.unitAmountPence * item.quantity, currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-baseline justify-between gap-4 border-t border-border/60 pt-3">
            <span className="text-sm font-semibold text-foreground">
              Amount due
            </span>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {payment?.amountDuePence
                ? formatMoney(payment.amountDuePence, currency)
                : "—"}
            </span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          You will confirm the payment on Stripe&apos;s secure page, including
          when a card or Direct Debit is already saved. Nothing is charged until
          you complete it there.
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Continue to payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
