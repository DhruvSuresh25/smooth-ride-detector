import { useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  FileStack,
  LayoutDashboard,
  Loader2,
  ScanSearch,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";

import { AppShell, type NavItem } from "@/components/layout/AppShell";
import { useIsAdmin } from "@/hooks/useAuth";

const userNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "Analyze Image", icon: ScanSearch },
  { to: "/reports", label: "My Reports", icon: ClipboardList },
  { to: "/profile", label: "Profile & Settings", icon: UserCog },
];

const adminNav: NavItem[] = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/reports", label: "All Reports", icon: FileStack },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function UserShell(props: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
}) {
  return <AppShell navItems={userNav} {...props} />;
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
}) {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAdmin === false) {
      toast.error("Administrator access required");
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isAdmin, isLoading, navigate]);

  if (isLoading || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        Checking administrator access…
      </div>
    );
  }

  return (
    <AppShell navItems={adminNav} badge="Admin portal" title={title} subtitle={subtitle} actions={actions}>
      {children}
    </AppShell>
  );
}
