"use client";

import { use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Building2, CheckCircle, Clock, FileText, Send, User, XCircle } from "lucide-react";
import Link from "next/link";

type UpgradeRequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function UpgradeRequestDetailPage({ params }: UpgradeRequestDetailPageProps) {
  const { id } = use(params);

  // Mock data for display purposes
  const request = {
    id,
    client: "Met Police",
    type: "HM Seats",
    status: "Payment Pending",
    amount: "£450.00",
    createdBy: "Sarah Jenkins",
    createdDate: "2026-06-01",
    details: {
      currentSeats: 2,
      requestedAdditional: 3,
      newTotal: 5,
      pricePerSeat: "£150.00",
      effectiveDate: "After Payment",
      contactName: "John Smith",
      internalNote: "Client needs more capacity for upcoming summer recruitment drive."
    },
    timeline: [
      { id: 1, action: "Request Created", actor: "Sarah Jenkins", date: "2026-06-01 10:30 AM", status: "completed" },
      { id: 2, action: "Sent for Approval", actor: "Sarah Jenkins", date: "2026-06-01 10:35 AM", status: "completed" },
      { id: 3, action: "Client Approved", actor: "John Smith (Client)", date: "2026-06-02 09:15 AM", status: "completed" },
      { id: 4, action: "Payment Received", actor: "System", date: "Pending", status: "pending" },
      { id: 5, action: "Entitlement Activated", actor: "System", date: "Pending", status: "pending" },
    ]
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/admin/upgrade-requests" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Requests
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Upgrade Request {request.id}</h2>
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
              {request.status}
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Building2 className="h-4 w-4" /> {request.client}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">Cancel Request</Button>
          <Button variant="outline">Mark Paid</Button>
          <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">Activate Entitlement (Override)</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>Requested capacity and billing configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{request.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">{request.amount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Effective Date</p>
                  <p className="font-medium">{request.details.effectiveDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Client Contact</p>
                  <p className="font-medium">{request.details.contactName}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Capacity Changes</p>
                <div className="bg-secondary/30 rounded p-3 flex justify-between items-center text-sm">
                  <span>Current Seats: {request.details.currentSeats}</span>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-cyan-600" />
                  <span className="font-bold text-cyan-600">New Total: {request.details.newTotal}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">({request.details.requestedAdditional} additional seats @ {request.details.pricePerSeat} each)</p>
              </div>

              {request.details.internalNote && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-1">Internal Note</p>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">{request.details.internalNote}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {request.timeline.map((step, idx) => (
                  <div key={step.id} className="relative flex gap-4">
                    {idx !== request.timeline.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-border" />
                    )}
                    <div className="relative z-10 mt-1">
                      {step.status === "completed" ? (
                        <CheckCircle className="h-6 w-6 text-green-500 bg-card rounded-full" />
                      ) : (
                        <div className="h-6 w-6 rounded-full border-2 border-muted bg-card flex items-center justify-center">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`text-sm font-medium ${step.status !== "completed" && "text-muted-foreground"}`}>{step.action}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" /> {step.actor}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
