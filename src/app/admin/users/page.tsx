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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ShieldCheck, UserCheck, Users, UserX } from "lucide-react";
import { useAdminResource } from "@/lib/admin-resource-cache";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";

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
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="User Administration"
        title="Users"
        description="Search, review, and support CTRL admins, client contacts, hiring managers, and candidates."
        icon={Users}
        badge={
          <Badge variant="outline" className="border-cyan-500/25 bg-cyan-500/10 text-cyan-400 font-semibold rounded-lg px-2.5 py-0.5 pointer-events-none">
            Live directory
          </Badge>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <UserMetric icon={Users} label="All users" value={payload.totals.all} color="primary" />
        <UserMetric icon={ShieldCheck} label="CTRL admins" value={payload.totals.ctrlAdmins} color="red" />
        <UserMetric icon={UserCheck} label="Clients" value={payload.totals.clientContacts} color="cyan" />
        <UserMetric icon={Users} label="Hiring managers" value={payload.totals.hiringManagers} color="indigo" />
        <UserMetric icon={Users} label="Candidates" value={payload.totals.candidates} color="emerald" />
        <UserMetric icon={UserX} label="Disabled" value={payload.totals.disabled} color="amber" />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b1329]/40 backdrop-blur-md shadow-lg overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/40 dark:border-white/5 p-4 md:flex-row md:items-center md:justify-between bg-slate-100/10 dark:bg-black/5">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, client, or role"
              className="pl-9 rounded-xl border-border/70 dark:border-white/10 focus-visible:ring-primary"
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
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  roleFilter === value
                    ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                    : "border-border/60 dark:border-white/5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="border-b border-border/40 dark:border-white/5 px-4 py-2.5 text-xs text-muted-foreground bg-slate-100/5 dark:bg-black/2">
          Showing {filteredUsers.length} of {payload.totals.all} users. Active: {payload.totals.active}. Invited: {payload.totals.invited}.
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100/30 dark:bg-black/10">
              <TableRow className="border-b border-border/40 dark:border-white/5">
                <TableHead className="font-semibold text-foreground">User</TableHead>
                <TableHead className="font-semibold text-foreground">Role</TableHead>
                <TableHead className="font-semibold text-foreground">Client</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="font-semibold text-foreground">Last login</TableHead>
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
                <TableRow key={`${user.id || user.email || "user"}-${index}`} className="border-b border-border/40 dark:border-white/5 hover:bg-slate-100/10 dark:hover:bg-white/[0.02] transition-colors">
                  <TableCell>
                    <div className="font-semibold text-foreground">{user.name}</div>
                    <div className="text-xs text-muted-foreground/80 mt-0.5">{user.email}</div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{user.role}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.client}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-lg font-semibold border px-2 py-0.5 ${statusClassName[user.status] ?? statusClassName.Active}`}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{user.lastLogin}</TableCell>
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
  color = "primary",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color?: "primary" | "cyan" | "indigo" | "emerald" | "amber" | "red";
}) {
  const colorGradients = {
    primary: "from-primary to-indigo-500 hover:border-primary/30",
    cyan: "from-cyan-500 to-blue-400 hover:border-cyan-500/30",
    indigo: "from-indigo-500 to-purple-400 hover:border-indigo-500/30",
    emerald: "from-emerald-500 to-teal-400 hover:border-emerald-500/30",
    amber: "from-amber-500 to-yellow-400 hover:border-amber-500/30",
    red: "from-red-500 to-pink-500 hover:border-red-500/30",
  };

  const iconColors = {
    primary: "text-primary",
    cyan: "text-cyan-400",
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };

  return (
    <Card className="relative overflow-hidden rounded-xl border border-border bg-card dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.01]">
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${colorGradients[color]}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
        <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</CardTitle>
        <Icon className={`h-[18px] w-[18px] ${iconColors[color]}`} aria-hidden="true" />
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        <p className="text-3xl font-black text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
