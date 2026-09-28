import { Link } from "@tanstack/react-router";
import { ScanEye } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({
  to = "/",
  className,
  showName = true,
}: {
  to?: string;
  className?: string;
  showName?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn("inline-flex items-center gap-2.5 font-semibold", className)}
      aria-label={`${APP_NAME} home`}
    >
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-card">
        <ScanEye className="size-5" aria-hidden="true" />
      </span>
      {showName && (
        <span className="text-base leading-tight tracking-tight">
          DriveSafe <span className="text-primary">Vision</span>
        </span>
      )}
    </Link>
  );
}
