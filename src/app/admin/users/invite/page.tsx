"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AdminAlert,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/admin-portal-ui";
import { portalInputClass, portalLabelClass } from "@/components/dashboard/portal/portal-design-tokens";
import {
  ADMIN_ASSIGNABLE_GROUP_LABELS,
  type AdminAssignableGroup,
} from "@/lib/auth/admin-portal-permissions";

type AssignableRole = {
  type: AdminAssignableGroup;
  label: string;
};

export default function InviteAdminPage() {
  const [roles, setRoles] = useState<AssignableRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    isSuperAdmin: false,
    roleTypes: [] as AdminAssignableGroup[],
  });

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/admin/team/roles", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error ?? "Roles could not be loaded");
        }
        setRoles(Array.isArray(payload.data) ? payload.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Roles could not be loaded");
      } finally {
        setLoadingRoles(false);
      }
    })();
  }, []);

  const roleOptions = useMemo(
    () =>
      roles.length > 0
        ? roles
        : (Object.keys(ADMIN_ASSIGNABLE_GROUP_LABELS) as AdminAssignableGroup[]).map((type) => ({
            type,
            label: ADMIN_ASSIGNABLE_GROUP_LABELS[type],
          })),
    [roles],
  );

  const toggleRole = (roleType: AdminAssignableGroup, checked: boolean) => {
    setForm((current) => ({
      ...current,
      isSuperAdmin: false,
      roleTypes: checked
        ? [...new Set([...current.roleTypes, roleType])]
        : current.roleTypes.filter((value) => value !== roleType),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!form.isSuperAdmin && form.roleTypes.length === 0) {
      setError("Select at least one role or enable full super admin access.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          isSuperAdmin: form.isSuperAdmin,
          roleTypes: form.roleTypes,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Admin user could not be created");
      }

      setSuccess(
        `Invite sent to ${payload.data?.email ?? form.email}. They'll receive an email to set their password.`,
      );
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        isSuperAdmin: false,
        roleTypes: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin user could not be created");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Invite admin"
        description="Send a set-password email and assign one or more scoped admin roles."
        action={
          <Button variant="outline" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to users
            </Link>
          </Button>
        }
      />

      {error ? <AdminAlert>{error}</AdminAlert> : null}
      {success ? (
        <AdminAlert className="border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300">
          {success}
        </AdminAlert>
      ) : null}

      <AdminPanel>
        <AdminSectionHeader
          title="New admin account"
          description="Super admins can combine Support, Operations, and Billing. The invitee sets their own password via email."
        />

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label className={portalLabelClass}>First name</Label>
            <Input
              className={portalInputClass}
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className={portalLabelClass}>Last name</Label>
            <Input
              className={portalInputClass}
              value={form.lastName}
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className={portalLabelClass}>Email</Label>
            <Input
              type="email"
              className={portalInputClass}
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-3 md:col-span-2">
            <Label className={portalLabelClass}>Portal access</Label>
            <div className="space-y-2 rounded-xl border border-border/60 p-4">
              {roleOptions.map((role) => (
                <label
                  key={role.type}
                  className="flex cursor-pointer items-start gap-3 text-sm"
                >
                  <Checkbox
                    checked={form.roleTypes.includes(role.type)}
                    disabled={form.isSuperAdmin || loadingRoles}
                    onCheckedChange={(checked) => toggleRole(role.type, checked === true)}
                  />
                  <span>
                    <span className="font-medium text-foreground">{role.label}</span>
                  </span>
                </label>
              ))}
              <label className="flex cursor-pointer items-start gap-3 border-t border-border/60 pt-3 text-sm">
                <Checkbox
                  checked={form.isSuperAdmin}
                  disabled={loadingRoles}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      isSuperAdmin: checked === true,
                      roleTypes: checked === true ? [] : current.roleTypes,
                    }))
                  }
                />
                <span>
                  <span className="font-medium text-foreground">Full super admin</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Full portal access including invite admins, audit log, and security settings.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting || loadingRoles} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Send invite email
            </Button>
          </div>
        </form>
      </AdminPanel>
    </div>
  );
}
