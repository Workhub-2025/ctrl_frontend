"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  History,
  Eye,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function AdminOverview() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
            Overview
          </h3>
          <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
            High-level metrics and operations for the CTRL platform.
          </p>
        </div>
      </div>

      {/* Top Row: Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">124</div>
            <p className="text-xs text-muted-foreground">+3 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Upgrades</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">8</div>
            <p className="text-xs text-muted-foreground">Requiring approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments Pending</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£12,450</div>
            <p className="text-xs text-muted-foreground">Across 4 clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Contracts in next 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Middle Row: Seat Usage */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Seat Usage (Top Clients)</CardTitle>
            <CardDescription>
              Hiring manager seats utilized versus allocated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mock Data for Bar Chart alternative */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Met Police</span>
                <span className="text-muted-foreground">4/5 Seats</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-cyan-600 w-4/5" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">NHS Digital</span>
                <span className="text-muted-foreground">12/15 Seats</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-cyan-600 w-[80%]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">London Fire Brigade</span>
                <span className="text-muted-foreground">2/2 Seats (Maxed)</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Middle Row: Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Admin Activity</CardTitle>
            <CardDescription>System actions across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <History className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Seat upgraded for Met Police</p>
                <p className="text-xs text-muted-foreground">By Sarah Jenkins • 2h ago</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-4">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">New client onboarded: City Council</p>
                <p className="text-xs text-muted-foreground">By Mike Ross • 5h ago</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-4">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Payment marked paid (Inv-102)</p>
                <p className="text-xs text-muted-foreground">By System • 1d ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Support / Account Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Attention Required</CardTitle>
          <CardDescription>Accounts flagged for review or support issues.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium">BUPA Trust - Payment Overdue</p>
                  <p className="text-xs text-muted-foreground">Invoice #402 is 15 days past due.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/clients/bupa">
                  Resolve <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
