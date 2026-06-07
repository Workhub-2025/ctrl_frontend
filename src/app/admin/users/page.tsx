"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Search, SlidersHorizontal, UserPlus } from "lucide-react";

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
    hiringManagers: number;
    candidates: number;
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
  const [payload, setPayload] = useState<AdminUsersPayload>({
    users: [],
    totals: {
      all: 0,
      hiringManagers: 0,
      candidates: 0,
      disabled: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/users", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Users could not be loaded");
        return body.data as AdminUsersPayload;
      })
      .then((data) => {
        if (!cancelled) {
          setPayload({
            users: Array.isArray(data?.users) ? data.users : [],
            totals: data?.totals ?? {
              all: 0,
              hiringManagers: 0,
              candidates: 0,
              disabled: 0,
            },
          });
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Users could not be loaded");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return payload.users;

    return payload.users.filter((user) =>
      [user.name, user.email, user.role, user.client, user.status]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [payload.users, searchTerm]);

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

        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total users</p>
          <p className="mt-2 text-2xl font-semibold">{payload.totals.all}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Hiring managers</p>
          <p className="mt-2 text-2xl font-semibold">{payload.totals.hiringManagers}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Candidates</p>
          <p className="mt-2 text-2xl font-semibold">{payload.totals.candidates}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Disabled</p>
          <p className="mt-2 text-2xl font-semibold">{payload.totals.disabled}</p>
        </div>
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

          <Button variant="outline" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
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
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>User actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>View user</DropdownMenuItem>
                        <DropdownMenuItem>Edit details</DropdownMenuItem>
                        <DropdownMenuItem>Reset password</DropdownMenuItem>
                        <DropdownMenuItem>
                          {user.status === "Disabled" ? "Reactivate account" : "Disable account"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
