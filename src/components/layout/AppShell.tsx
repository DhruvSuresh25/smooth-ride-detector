import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, LogOut, Menu, Settings, UserRound } from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProfile, useSignOut } from "@/hooks/useAuth";
import { useSignedUrl } from "@/components/StorageImage";
import { initialsOf } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1" aria-label="Main navigation">
      {items.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4.5 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  navItems,
  title,
  subtitle,
  actions,
  badge,
  children,
}: {
  navItems: NavItem[];
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  badge?: string | undefined;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: profile } = useProfile();
  const signOut = useSignOut();
  const { data: avatarUrl } = useSignedUrl(profile?.avatar_url);

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <Logo to="/" />
      </div>
      {badge && (
        <span className="w-fit rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
          {badge}
        </span>
      )}
      <NavLinks items={navItems} onNavigate={() => setMobileOpen(false)} />
      <div className="mt-auto space-y-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4.5" aria-hidden="true" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-sidebar lg:block">
          {sidebar}
        </aside>

        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur sm:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                {sidebar}
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>
              {subtitle && (
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block">{actions}</div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Notifications">
                    <Bell className="size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>No new notifications</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Account menu"
                  >
                    <Avatar className="size-9">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                      <AvatarFallback className="bg-primary-soft text-sm font-semibold text-primary">
                        {initialsOf(profile?.full_name, profile?.email)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    {profile?.full_name || "Account"}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {profile?.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="gap-2">
                      <UserRound className="size-4" /> My dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="gap-2">
                      <Settings className="size-4" /> Profile &amp; settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void signOut()} className="gap-2">
                    <LogOut className="size-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {actions && <div className="px-4 pt-4 sm:hidden">{actions}</div>}

          <main className="px-4 py-6 pb-24 sm:px-6 lg:pb-10">{children}</main>
        </div>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card lg:hidden"
          aria-label="Quick navigation"
        >
          {navItems.slice(0, 4).map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground [&.active]:text-primary"
              activeProps={{ className: "active" }}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="truncate px-1">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </TooltipProvider>
  );
}
