import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/Shells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteUserAccount, setAccountStatus } from "@/lib/admin-users.functions";
import { formatDate } from "@/lib/constants";
import { useAllUsers } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/admin/users")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Users — DriveSafe Vision Admin" },
      { name: "description", content: "Registered citizens, their reports and account status." },
      { property: "og:title", content: "Users — DriveSafe Vision Admin" },
      {
        property: "og:description",
        content: "Registered citizens, their reports and account status.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { data: users, isLoading } = useAllUsers();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [pending, setPending] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (users ?? []).filter((u) => {
      const matches =
        !term ||
        u.full_name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term);
      const roleOk = roleFilter === "all" || u.role === roleFilter;
      return matches && roleOk;
    });
  }, [users, search, roleFilter]);

  async function toggleStatus(userId: string, current: string) {
    const next = current === "Suspended" ? "Active" : "Suspended";
    setPending(userId);
    try {
      await setAccountStatus({ data: { userId, status: next } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(`Account ${next.toLowerCase()}`);
    } catch (error) {
      toast.error("Could not update account", { description: (error as Error).message });
    } finally {
      setPending(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setPending(toDelete.id);
    try {
      await deleteUserAccount({ data: { userId: toDelete.id } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("User account deleted");
    } catch (error) {
      toast.error("Could not delete user", { description: (error as Error).message });
    } finally {
      setPending(null);
      setToDelete(null);
    }
  }

  return (
    <AdminShell superOnly title="Users" subtitle={`${users?.length ?? 0} registered account(s)`}>
      <section className="surface-card mb-5 grid gap-3 p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="user-search">Search</Label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="user-search"
              className="pl-9"
              placeholder="Name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-filter">Role</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger id="role-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="user">Citizens</SelectItem>
              <SelectItem value="admin">Super admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {isLoading ? (
        <div className="surface-card grid place-items-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          Loading users…
        </div>
      ) : filtered.length ? (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-center">Reports</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(u.created_at)}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{u.report_count}</TableCell>
                    <TableCell>
                      {u.role === "admin" ? (
                        <Badge className="gap-1 bg-primary-soft text-primary hover:bg-primary-soft">
                          <ShieldCheck className="size-3" aria-hidden="true" /> Super admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <UserRound className="size-3" aria-hidden="true" /> Citizen
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          u.account_status === "Suspended"
                            ? "border-sev-critical/30 bg-sev-critical-bg text-sev-critical"
                            : "border-sev-low/30 bg-sev-low-bg text-sev-low"
                        }
                      >
                        {u.account_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending === u.id}
                          onClick={() => void toggleStatus(u.id, u.account_status)}
                        >
                          {u.account_status === "Suspended" ? "Activate" : "Suspend"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={pending === u.id}
                          onClick={() => setToDelete({ id: u.id, name: u.full_name || u.email })}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          <span className="sr-only">Delete {u.full_name || u.email}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="grid gap-3 lg:hidden">
            {filtered.map((u) => (
              <li key={u.id} className="surface-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{u.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role === "admin" ? "Super admin" : "Citizen"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {u.report_count} report(s) · joined {formatDate(u.created_at)} · {u.account_status}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={pending === u.id}
                    onClick={() => void toggleStatus(u.id, u.account_status)}
                  >
                    {u.account_status === "Suspended" ? "Activate" : "Suspend"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    disabled={pending === u.id}
                    onClick={() => setToDelete({ id: u.id, name: u.full_name || u.email })}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="surface-card p-12 text-center text-sm text-muted-foreground">
          No users match this search.
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the account and every report it submitted. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
