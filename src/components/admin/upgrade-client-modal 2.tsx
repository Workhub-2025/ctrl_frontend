"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UpgradeType = "seats" | "assessments" | "allowance" | "other";

type UpgradeClientModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName?: string;
  currentSeats?: number;
};

export function UpgradeClientModal({
  open,
  onOpenChange,
  clientName = "Client",
  currentSeats = 2,
}: UpgradeClientModalProps) {
  const [upgradeType, setUpgradeType] = useState<UpgradeType>("seats");
  const [additionalSeats, setAdditionalSeats] = useState("3");
  const [billingMode, setBillingMode] = useState("payment-link");

  const seatIncrease = Number.parseInt(additionalSeats || "0", 10) || 0;
  const newSeatTotal = currentSeats + seatIncrease;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Upgrade Client</DialogTitle>
          <DialogDescription>
            Prepare an upgrade request for {clientName}. Entitlements should activate after approval or payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Upgrade type</Label>
            <Select value={upgradeType} onValueChange={(value) => setUpgradeType(value as UpgradeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seats">Hiring manager seats</SelectItem>
                <SelectItem value="assessments">Assessment access</SelectItem>
                <SelectItem value="allowance">Candidate/session allowance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {upgradeType === "seats" && (
            <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Current seats</p>
                <p className="mt-1 text-xl font-semibold">{currentSeats}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="additionalSeats">Additional seats</Label>
                <Input
                  id="additionalSeats"
                  type="number"
                  min="1"
                  value={additionalSeats}
                  onChange={(event) => setAdditionalSeats(event.target.value)}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New total</p>
                <p className="mt-1 text-xl font-semibold">{newSeatTotal}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Activation</Label>
              <Select defaultValue="after-payment">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="after-payment">After payment</SelectItem>
                  <SelectItem value="on-approval">On client approval</SelectItem>
                  <SelectItem value="immediate">Immediately, admin override</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Billing</Label>
              <Select value={billingMode} onValueChange={setBillingMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment-link">Payment link</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="manual">Manual/offline</SelectItem>
                  <SelectItem value="comped">Comped/free</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Save draft
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Send for client approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
