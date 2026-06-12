"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ShieldCheck, UserCheck, Users, UserX } from "lucide-react";
import { useAdminResource } from "@/lib/admin-resource-cache";

type UserRole = "CTRL Admin" | "Client Contact" | "Hiring Manager" | "Candidate";
type UserStatus = "Active" | "Invited" | "Disabled";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  client: string;
  status: UserStatus;
  lastLogin: string;
};

type AdminUsersPayload = {
  users: AdminUser[];
  totals: {
    all: number;
    ctrlAdmins: number;
    clientContacts: number;
    hiringManagers: number;
    candidates: number;
    active: number;
    invited: number;
    disabled: number;
  };
};

const statusClassName: Record<UserStatus, string> = {
  Active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  Invited: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
  Disabled: "border-red-500/20 bg-red-500/10 text-red-400",
};

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const fallbackPayload: AdminUsersPayload = {
    users: [],
    totals: {
      all: 0,
      ctrlAdmins: 0,
      clientContacts: 0,
      hiringManagers: 0,
      candidates: 0,
      active: 0,
      invited: 0,
      disabled: 0,
    },
  };
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole | "Disabled">("all");
  const { data: payload, error, loading } = useAdminResource<AdminUsersPayload>(
    "admin:users",
    "/api/admin/users",
    fallbackPayload
  );

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return payload.users.filter((user) => {
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "Disabled" ? user.status === "Disabled" : user.role === roleFilter);
      const matchesQuery =
        !query ||
        [user.name, user.email, user.role, user.client, user.status]
        .join(" ")
        .toLowerCase()
          .includes(query);

      return matchesRole && matchesQuery;
    });
  }, [payload.users, roleFilter, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-500/80">
            User Administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Users
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Search, review, and support CTRL admins, client contacts, hiring managers, and candidates.
          </p>
        </div>

        <Badge variant="outline" className="w-fit border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-cyan-600">
          Live directory
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <UserMetric icon={Users} label="All users" value={payload.totals.all} />
        <UserMetric icon={ShieldCheck} label="CTRL admins" value={payload.totals.ctrlAdmins} />
        <UserMetric icon={UserCheck} label="Clients" value={payload.totals.clientContacts} />
        <UserMetric icon={Users} label="Hiring managers" value={payload.totals.hiringManagers} />
        <UserMetric icon={Users} label="Candidates" value={payload.totals.candidates} />
        <UserMetric icon={UserX} label="Disabled" value={payload.totals.disabled} />
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, client, or role"
              className="pl-9"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "All"],
              ["Client Contact", "Clients"],
              ["Hiring Manager", "Hiring managers"],
              ["Candidate", "Candidates"],
              ["Disabled", "Disabled"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRoleFilter(value as typeof roleFilter)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  roleFilter === value
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-600"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="border-b px-4 py-2 text-xs text-muted-foreground">
          Showing {filteredUsers.length} of {payload.totals.all} users. Active: {payload.totals.active}. Invited: {payload.totals.invited}.
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No users match the current search.
                  </TableCell>
                </TableRow>
              )}
              {!loading && filteredUsers.map((user, index) => (
                <TableRow key={`${user.id || user.email || "user"}-${index}`}>
                  <TableCell>
                    <div className="font-medium text-foreground">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.client}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClassName[user.status] ?? statusClassName.Active}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.lastLogin}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function UserMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-cyan-600" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
