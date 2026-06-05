"use client";

import React, { useState } from "react";
import { 
  Save, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Settings2, 
  CreditCard, 
  Users, 
  Bell, 
  ShieldCheck, 
  UserPlus, 
  Plug, 
  Skull,
  ArrowUpRight,
  Database
} from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const TABS = [
  { id: "platform", label: "Platform Defaults", icon: Settings2 },
  { id: "assessments", label: "Assessment Catalogue", icon: Database },
  { id: "billing", label: "Billing & Payments", icon: CreditCard },
  { id: "upgrades", label: "Upgrade Requests", icon: ArrowUpRight },
  { id: "users", label: "Users & Access", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "audit", label: "Audit & Compliance", icon: ShieldCheck },
  { id: "admins", label: "Admin Team", icon: UserPlus },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "danger", label: "Danger Zone", icon: Skull },
];

const PlatformDefaults = () => (
  <Card className="border-border bg-card">
    <CardHeader>
      <CardTitle className="text-xl">Platform Defaults</CardTitle>
      <CardDescription>Configure the default settings applied to new client accounts.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Default Client Status</Label>
          <Select defaultValue="onboarding">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default Plan</Label>
          <Select defaultValue="standard">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default Included Hiring Manager Seats</Label>
          <Input type="number" defaultValue={2} />
        </div>
        <div className="space-y-2">
          <Label>Default Candidate/Session Allowance</Label>
          <Input type="number" defaultValue={100} />
        </div>
        <div className="space-y-2">
          <Label>Default Support Tier</Label>
          <Select defaultValue="standard">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard Support</SelectItem>
              <SelectItem value="priority">Priority Support</SelectItem>
              <SelectItem value="dedicated">Dedicated Success Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default Contract Length</Label>
          <Select defaultValue="12">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Month</SelectItem>
              <SelectItem value="3">3 Months</SelectItem>
              <SelectItem value="6">6 Months</SelectItem>
              <SelectItem value="12">12 Months (Annual)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default Billing Mode</Label>
          <Select defaultValue="invoice">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="payment_link">Payment Link</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="comped">Comped (Free)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default Activation Mode</Label>
          <Select defaultValue="on_approval">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="after_payment">After Payment</SelectItem>
              <SelectItem value="on_approval">On Approval</SelectItem>
              <SelectItem value="immediate">Immediate Admin Override</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </CardContent>
    <CardFooter className="border-t border-border bg-muted/20 px-6 py-4 flex justify-between">
      <span className="text-sm text-muted-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Unsaved changes</span>
      <Button><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
    </CardFooter>
  </Card>
);

const ASSESSMENTS = [
  { id: "typing", name: "Typing Test", global: true, contract: true, paid: false, default: true, order: 1, desc: "Standard WPM typing test." },
  { id: "sjt", name: "Situational Judgement", global: true, contract: true, paid: true, default: false, order: 2, desc: "Scenario-based judgement." },
  { id: "call", name: "Call Simulation", global: true, contract: true, paid: true, default: false, order: 3, desc: "AI voice call simulator." },
  { id: "priority", name: "Prioritisation", global: true, contract: true, paid: false, default: true, order: 4, desc: "Email/task priority sorting." },
  { id: "custom", name: "Custom Assessment", global: false, contract: false, paid: true, default: false, order: 5, desc: "Client specific bespoke." },
];

const AssessmentCatalogue = () => (
  <Card className="border-border bg-card">
    <CardHeader>
      <CardTitle className="text-xl">Assessment Catalogue</CardTitle>
      <CardDescription>Manage available assessment modules across the platform.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assessment</TableHead>
              <TableHead className="text-center">Global</TableHead>
              <TableHead className="text-center">Contracts</TableHead>
              <TableHead className="text-center">Paid Add-on</TableHead>
              <TableHead className="text-center">Default</TableHead>
              <TableHead>Description & Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ASSESSMENTS.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="text-center"><Switch defaultChecked={a.global} /></TableCell>
                <TableCell className="text-center"><Switch defaultChecked={a.contract} /></TableCell>
                <TableCell className="text-center"><Switch defaultChecked={a.paid} /></TableCell>
                <TableCell className="text-center"><Switch defaultChecked={a.default} /></TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Input defaultValue={a.desc} className="h-8 text-xs" />
                    <Input type="number" defaultValue={a.order} className="h-8 w-16 text-xs" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent>
    <CardFooter className="border-t border-border bg-muted/20 px-6 py-4 flex justify-between">
      <span className="text-sm text-muted-foreground flex items-center gap-2"></span>
      <Button><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
    </CardFooter>
  </Card>
);

const BillingPayments = () => (
  <Card className="border-border bg-card">
    <CardHeader>
      <CardTitle className="text-xl">Billing & Payments</CardTitle>
      <CardDescription>Configure payment providers, currency, and default pricing.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="bg-cyan-950/30 border border-cyan-900 text-cyan-200 p-4 rounded-md flex items-start gap-3">
        <CreditCard className="h-5 w-5 mt-0.5" />
        <div>
          <h4 className="font-medium">Stripe Integration Pending</h4>
          <p className="text-sm opacity-80">Full automated billing via Stripe is currently in development. You can configure UI settings here in advance.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Payment Provider</Label>
          <Select defaultValue="manual">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="manual">Manual only</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default Currency</Label>
          <Select defaultValue="gbp">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gbp">GBP (£)</SelectItem>
              <SelectItem value="usd">USD ($)</SelectItem>
              <SelectItem value="eur">EUR (€)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>VAT Rate (%)</Label>
          <Input type="number" defaultValue={20} />
        </div>
        <div className="space-y-2">
          <Label>Invoice Prefix</Label>
          <Input defaultValue="CTRL-" />
        </div>
        <div className="space-y-2">
          <Label>Seat Add-on Price</Label>
          <Input type="number" defaultValue={49} />
          <p className="text-xs text-muted-foreground">Price per additional hiring manager seat.</p>
        </div>
        <div className="space-y-2">
          <Label>Assessment Module Add-on Price</Label>
          <Input type="number" defaultValue={199} />
        </div>
        <div className="space-y-2">
          <Label>Candidate/Session Add-on Price</Label>
          <Input type="number" defaultValue={5} />
        </div>
        <div className="space-y-2">
          <Label>Payment Link Expiry</Label>
          <Select defaultValue="7d">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="48h">48 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Manual Approval Required</Label>
          <p className="text-sm text-muted-foreground">Require manual admin approval before entitlement activation even if payment succeeds.</p>
        </div>
        <Switch defaultChecked={true} />
      </div>
    </CardContent>
    <CardFooter className="border-t border-border bg-muted/20 px-6 py-4 flex justify-between">
      <span className="text-sm text-muted-foreground flex items-center gap-2"></span>
      <Button><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
    </CardFooter>
  </Card>
);

const UpgradeRequests = () => (
  <Card className="border-border bg-card">
    <CardHeader>
      <CardTitle className="text-xl">Upgrade Request Settings</CardTitle>
      <CardDescription>Manage workflows and approvals for client upgrades.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Require Client Approval</Label>
            <p className="text-sm text-muted-foreground">Client must explicitly approve upgrade terms before activation.</p>
          </div>
          <Switch defaultChecked={true} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Require Payment</Label>
            <p className="text-sm text-muted-foreground">Require successful payment before activation.</p>
          </div>
          <Switch defaultChecked={false} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Allow Admin Override</Label>
            <p className="text-sm text-muted-foreground">Allow CTRL admins to immediately activate upgrades, bypassing standard flow.</p>
          </div>
          <Switch defaultChecked={true} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Notify CTRL Admins on View</Label>
            <p className="text-sm text-muted-foreground">Send alert when a client opens an upgrade request link.</p>
          </div>
          <Switch defaultChecked={true} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Notify CTRL Admins on Payment</Label>
            <p className="text-sm text-muted-foreground">Send alert when payment is completed.</p>
          </div>
          <Switch defaultChecked={true} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="space-y-2">
          <Label>Default Approval Expiry</Label>
          <Select defaultValue="14d">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="14d">14 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default Email Recipient Type</Label>
          <Select defaultValue="primary">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary Contact</SelectItem>
              <SelectItem value="billing">Billing Contact</SelectItem>
              <SelectItem value="custom">Custom Address</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </CardContent>
    <CardFooter className="border-t border-border bg-muted/20 px-6 py-4 flex justify-between">
      <span className="text-sm text-muted-foreground flex items-center gap-2"></span>
      <Button><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
    </CardFooter>
  </Card>
);

const UserAccess = () => (
  <Card className="border-border bg-card">
    <CardHeader>
      <CardTitle className="text-xl">User & Access Settings</CardTitle>
      <CardDescription>Configure authentication, invites, and default permissions.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Allow Admin Invites</Label>
            <p className="text-sm text-muted-foreground">Allow CTRL admins to invite any user directly.</p>
          </div>
          <Switch defaultChecked={true} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Require Email Verification</Label>
            <p className="text-sm text-muted-foreground">All new users must verify their email before first login.</p>
          </div>
          <Switch defaultChecked={true} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="space-y-2">
          <Label>Password Reset Link Expiry</Label>
          <Select defaultValue="1h">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">15 Minutes</SelectItem>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Candidate Auto-Disable Period</Label>
          <Select defaultValue="30d">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days post-assessment</SelectItem>
              <SelectItem value="30d">30 Days post-assessment</SelectItem>
              <SelectItem value="90d">90 Days post-assessment</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Hiring Manager Invitation Expiry</Label>
          <Select defaultValue="7d">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="48h">48 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default User Status (Post-Invite)</Label>
          <Select defaultValue="pending">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active (No verification)</SelectItem>
              <SelectItem value="pending">Pending Verification</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </CardContent>
    <CardFooter className="border-t border-border bg-muted/20 px-6 py-4 flex justify-between">
      <span className="text-sm text-muted-foreground flex items-center gap-2"></span>
      <Button><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
    </CardFooter>
  </Card>
);

const NOTIFICATIONS = [
  { id: 1, name: "Client Welcome Email", enabled: true, subject: "Welcome to CTRL Platform", edited: "2024-05-12" },
  { id: 2, name: "Upgrade Request Approval", enabled: true, subject: "Action Required: Approve your CTRL Upgrade", edited: "2024-06-01" },
  { id: 3, name: "Payment Reminder", enabled: false, subject: "Reminder: Outstanding Invoice for CTRL", edited: "2024-03-15" },
  { id: 4, name: "User Invite", enabled: true, subject: "You've been invited to CTRL", edited: "2024-05-20" },
  { id: 5, name: "Password Reset", enabled: true, subject: "Reset your CTRL password", edited: "2024-01-10" },
  { id: 6, name: "Contract Expiry Warning", enabled: true, subject: "Your CTRL contract is expiring soon", edited: "2024-02-28" },
];

const NotificationTemplates = () => (
  <Card className="border-border bg-card">
    <CardHeader>
      <CardTitle className="text-xl">Notification Templates</CardTitle>
      <CardDescription>Manage automated transactional emails sent by the platform.</CardDescription>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Subject Preview</TableHead>
            <TableHead>Last Edited</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {NOTIFICATIONS.map((n) => (
            <TableRow key={n.id}>
              <TableCell className="font-medium">{n.name}</TableCell>
              <TableCell>
                <Switch defaultChecked={n.enabled} />
              </TableCell>
              <TableCell className="text-muted-foreground truncate max-w-[200px]">{n.subject}</TableCell>
              <TableCell className="text-muted-foreground">{n.edited}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm">Edit</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
    <CardFooter className="border-t border-border bg-muted/20 px-6 py-4 flex justify-between">
      <span className="text-sm text-muted-foreground flex items-center gap-2"></span>
      <Button><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
    </CardFooter>
  </Card>
);

const AuditCompliance = () => (
  <Card className="border-border bg-card">
    <CardHeader>
      <CardTitle className="text-xl">Audit & Compliance</CardTitle>
      <CardDescription>Security policies, data retention, and audit logging.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
        <div className="space-y-2">
          <Label>Audit Log Retention Period</Label>
          <Select defaultValue="365d">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="180d">180 Days</SelectItem>
              <SelectItem value="365d">1 Year</SelectItem>
              <SelectItem value="indefinite">Indefinite</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Data Retention (Candidate Records)</Label>
          <Select defaultValue="2y">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
              <SelectItem value="2y">2 Years</SelectItem>
              <SelectItem value="indefinite">Indefinite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Require Reason: Seat Limit Change</Label>
            <p className="text-sm text-muted-foreground">Admins must provide a written reason when changing client seat limits.</p>
          </div>
          <Switch defaultChecked={true} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Require Reason: Disabling Users</Label>
            <p className="text-sm text-muted-foreground">Admins must provide a written reason when manually disabling a user.</p>
          </div>
          <Switch defaultChecked={false} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Require Reason: Billing Status Change</Label>
            <p className="text-sm text-muted-foreground">Admins must provide a written reason when pausing or comping billing.</p>
          </div>
          <Switch defaultChecked={true} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Data Deletion Request Workflow</Label>
            <p className="text-sm text-muted-foreground">Enable automated workflows for GDPR/CCPA data deletion requests.</p>
          </div>
          <Switch defaultChecked={true} />
        </div>
      </div>
    </CardContent>
    <CardFooter className="border-t border-border bg-muted/20 px-6 py-4 flex justify-between">
      <Button variant="outline">Export Audit Logs</Button>
      <Button><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
    </CardFooter>
  </Card>
);

const ADMINS = [
  { id: 1, name: "Sarah Connor", email: "sarah@ctrl.app", role: "Owner", status: "Active", login: "2 hours ago" },
  { id: 2, name: "John Smith", email: "john@ctrl.app", role: "Operations Admin", status: "Active", login: "1 day ago" },
  { id: 3, name: "Alice Wong", email: "alice@ctrl.app", role: "Billing Admin", status: "Active", login: "3 days ago" },
  { id: 4, name: "Marcus Doe", email: "marcus@ctrl.app", role: "Support Admin", status: "Inactive", login: "2 months ago" },
];

const AdminTeam = () => (
  <Card className="border-border bg-card">
    <CardHeader className="flex flex-row items-start justify-between">
      <div>
        <CardTitle className="text-xl">Internal Admin Team</CardTitle>
        <CardDescription>Manage CTRL staff access and permissions.</CardDescription>
      </div>
      <Button size="sm"><UserPlus className="h-4 w-4 mr-2"/> Invite Admin</Button>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Admin</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ADMINS.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.email}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {a.role}
                </Badge>
              </TableCell>
              <TableCell>
                {a.status === "Active" ? (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-zinc-500/10 text-zinc-500">Inactive</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{a.login}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">Manage</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

const INTEGRATIONS = [
  { id: 1, name: "Strapi Backend", status: "Connected", checked: "10 mins ago" },
  { id: 2, name: "Stripe", status: "Not configured", checked: "N/A" },
  { id: 3, name: "SendGrid (Email)", status: "Connected", checked: "1 hour ago" },
  { id: 4, name: "AWS S3 (Files)", status: "Connected", checked: "10 mins ago" },
  { id: 5, name: "PostHog (Analytics)", status: "Connected", checked: "30 mins ago" },
  { id: 6, name: "Outbound Webhooks", status: "Error", checked: "5 mins ago" },
];

const SystemIntegrations = () => (
  <Card className="border-border bg-card">
    <CardHeader>
      <CardTitle className="text-xl">System Integrations</CardTitle>
      <CardDescription>Status and configuration of external services.</CardDescription>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Checked</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {INTEGRATIONS.map((i) => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.name}</TableCell>
              <TableCell>
                {i.status === "Connected" && <span className="flex items-center text-emerald-500 text-sm"><CheckCircle2 className="h-4 w-4 mr-1.5" /> Connected</span>}
                {i.status === "Not configured" && <span className="flex items-center text-muted-foreground text-sm"><AlertCircle className="h-4 w-4 mr-1.5" /> Not configured</span>}
                {i.status === "Error" && <span className="flex items-center text-destructive text-sm"><XCircle className="h-4 w-4 mr-1.5" /> Error</span>}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{i.checked}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="sm">Test</Button>
                <Button variant="secondary" size="sm">Configure</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

const DangerZone = () => (
  <Card className="border-destructive/30 bg-destructive/5">
    <CardHeader>
      <CardTitle className="text-xl text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Danger Zone</CardTitle>
      <CardDescription className="text-destructive/80">Destructive actions and platform-wide overrides. Proceed with extreme caution.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="flex items-center justify-between border border-destructive/20 p-4 rounded-lg bg-background/50">
        <div>
          <h4 className="font-medium text-foreground">Pause All Client Upgrades</h4>
          <p className="text-sm text-muted-foreground mt-1">Temporarily prevent clients from viewing or accepting upgrades.</p>
        </div>
        <Button variant="destructive">Pause Upgrades</Button>
      </div>
      
      <div className="flex items-center justify-between border border-destructive/20 p-4 rounded-lg bg-background/50">
        <div>
          <h4 className="font-medium text-foreground">Disable Payment Links</h4>
          <p className="text-sm text-muted-foreground mt-1">Invalidate all active Stripe payment links across the platform.</p>
        </div>
        <Button variant="destructive">Disable Links</Button>
      </div>

      <div className="flex items-center justify-between border border-destructive/20 p-4 rounded-lg bg-background/50">
        <div>
          <h4 className="font-medium text-foreground">Maintenance Mode</h4>
          <p className="text-sm text-muted-foreground mt-1">Put the entire platform into maintenance mode. Only CTRL Admins will have access.</p>
        </div>
        <Button variant="destructive">Enable Maintenance Mode</Button>
      </div>

      <div className="flex items-center justify-between border border-border p-4 rounded-lg bg-background/50">
        <div>
          <h4 className="font-medium text-foreground">Export All Settings</h4>
          <p className="text-sm text-muted-foreground mt-1">Download a JSON backup of all current platform settings.</p>
        </div>
        <Button variant="outline">Export Configuration</Button>
      </div>
      
      <div className="flex items-center justify-between border border-destructive/40 p-4 rounded-lg bg-destructive/10">
        <div>
          <h4 className="font-medium text-destructive">Factory Reset</h4>
          <p className="text-sm text-destructive/80 mt-1">Reset all platform settings to their default values. This cannot be undone.</p>
        </div>
        <Button variant="destructive">Reset Platform Defaults</Button>
      </div>
    </CardContent>
  </Card>
);

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("platform");

  const renderContent = () => {
    switch (activeTab) {
      case "platform": return <PlatformDefaults />;
      case "assessments": return <AssessmentCatalogue />;
      case "billing": return <BillingPayments />;
      case "upgrades": return <UpgradeRequests />;
      case "users": return <UserAccess />;
      case "notifications": return <NotificationTemplates />;
      case "audit": return <AuditCompliance />;
      case "admins": return <AdminTeam />;
      case "integrations": return <SystemIntegrations />;
      case "danger": return <DangerZone />;
      default: return <PlatformDefaults />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-7xl mx-auto px-5 py-5">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <nav className="flex flex-col space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? tab.id === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive && tab.id === "danger" ? "text-destructive" : isActive ? "text-primary" : "text-muted-foreground"}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
