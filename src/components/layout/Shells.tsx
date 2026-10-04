import { useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  FileStack,
  LayoutDashboard,
  Loader2,
  Map as MapIcon,
  ScrollText,
  MapPinned,
  ScanSearch,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";

import { AppShell, type NavItem } from "@/components/layout/AppShell";
import { useStaffRole } from "@/lib/staff";

const userNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "Analyze Image", icon: ScanSearch },
  { to: "/reports", label: "My Reports", icon: ClipboardList },
  { to: "/profile", label: "Profile & Settings", icon: UserCog },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/area-stats", label: "Area Stats", icon: BarChart3 },
];

const superNav: NavItem[] = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/reports", label: "All Complaints", icon: FileStack },
  { to: "/admin/area-admins", label: "Area Admins", icon: MapPinned },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/map", label: "Map", icon: MapIcon },
  { to: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const areaNav: NavItem[] = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/reports", label: "My Area Complaints", icon: FileStack },
  { to: "/admin/map", label: "Map", icon: MapIcon },
];

export function UserShell({
  allowStaff = false,
  ...props
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  allowStaff?: boolean;
}) {
  const { data: role, isLoading } = useStaffRole();
  const navigate = useNavigate();
  const isStaff = !!role && (role.isSuper || role.isAreaAdmin);
  const blocked = !allowStaff && isStaff;

  useEffect(() => {
    if (blocked) {
      toast.info("Admins use the admin portal", { description: "Citizen pages aren't available to admin accounts." });
      navigate({ to: "/admin/dashboard", replace: true });
    }
  }, [blocked, navigate]);

  if (isLoading || blocked) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }
  if (isStaff) return <AppShell navItems={role.isSuper ? superNav : areaNav} {...props} />;
  return <AppShell navItems={userNav} {...props} />;
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
  superOnly = false,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  superOnly?: boolean;
}) {
  const { data: role, isLoading } = useStaffRole();
  const navigate = useNavigate();
  const allowed = !!role && (role.isSuper || (!superOnly && role.isAreaAdmin));

  useEffect(() => {
    if (isLoading || !role || allowed) return;
    if (role.isAreaAdmin) {
      toast.error("Super admin access required");
      navigate({ to: "/admin/dashboard", replace: true });
    } else {
      toast.error("Administrator access required");
      navigate({ to: "/dashboard", replace: true });
    }
  }, [role, isLoading, allowed, navigate]);

  if (isLoading || !allowed) {
    return (
      <div className="grid min-h-screen place-items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        Checking administrator access…
      </div>
    );
  }

  return (
    <AppShell
      navItems={role.isSuper ? superNav : areaNav}
      badge={role.isSuper ? "Super admin" : "Area admin"}
      title={title}
      subtitle={subtitle}
      actions={actions}
    >
      {children}
    </AppShell>
  );
}
