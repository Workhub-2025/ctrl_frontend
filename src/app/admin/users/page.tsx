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
import { cn } from "@/lib/utils";
import { useAdminResource } from "@/lib/admin-resource-cache";
import {
  AdminAlert,
  AdminFilterChip,
  AdminPageHeader,
  AdminStatTile,
  AdminTableShell,
} from "@/components/admin/admin-portal-ui";
import { portalBadgeClass, portalInputClass, portalStatusBadge } from "@/components/dashboard/portal/portal-design-tokens";

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

const statusBadgeClass = portalStatusBadge;

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
      <AdminPageHeader
        title="Users"
        description="Directory of CTRL admins, client contacts, hiring managers, and candidates."
        action={
          <Badge variant="outline" className="pointer-events-none font-medium">
            Live directory
          </Badge>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <AdminStatTile icon={Users} label="All users" value={payload.totals.all} />
        <AdminStatTile icon={ShieldCheck} label="CTRL admins" value={payload.totals.ctrlAdmins} />
        <AdminStatTile icon={UserCheck} label="Clients" value={payload.totals.clientContacts} />
        <AdminStatTile icon={Users} label="Hiring managers" value={payload.totals.hiringManagers} />
        <AdminStatTile icon={Users} label="Candidates" value={payload.totals.candidates} />
        <AdminStatTile icon={UserX} label="Disabled" value={payload.totals.disabled} />
      </div>

      {error ? <AdminAlert>{error}</AdminAlert> : null}

      <AdminTableShell
        toolbar={
          <>
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, client, or role"
                className={cn("pl-9", portalInputClass)}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["Client Contact", "Clients"],
                  ["Hiring Manager", "Hiring managers"],
                  ["Candidate", "Candidates"],
                  ["Disabled", "Disabled"],
                ] as const
              ).map(([value, label]) => (
                <AdminFilterChip
                  key={value}
                  active={roleFilter === value}
                  onClick={() => setRoleFilter(value)}
                >
                  {label}
                </AdminFilterChip>
              ))}
            </div>
          </>
        }
        footer={
          <>
            Showing {filteredUsers.length} of {payload.totals.all} users. Active:{" "}
            {payload.totals.active}. Invited: {payload.totals.invited}.
          </>
        }
      >
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow key={`${user.id || user.email || "user"}-${index}`}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{user.name}</div>
                    <div className="text-xs text-muted-foreground/80 mt-0.5">{user.email}</div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{user.role}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.client}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeClass(user.status)}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{user.lastLogin}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </AdminTableShell>
    </div>
  );
}
