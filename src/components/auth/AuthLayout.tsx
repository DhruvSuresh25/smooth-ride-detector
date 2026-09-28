import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { APP_TAGLINE } from "@/lib/constants";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_420px]">
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Logo to="/" className="text-primary-foreground" />
        <div className="max-w-md space-y-4">
          <h2 className="text-3xl font-bold leading-tight">
            Every report makes the next journey safer.
          </h2>
          <p className="text-sm text-primary-foreground/80">
            {APP_TAGLINE}. Upload a road photo, get a severity-classified pothole assessment with
            location evidence, and follow the repair through to resolution.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/70">
          Reports are reviewed by road-maintenance administrators.
        </p>
      </div>

      <div className="flex flex-col justify-center gap-6 bg-background px-5 py-10 sm:px-10">
        <div className="lg:hidden">
          <Logo to="/" />
        </div>
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to home
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
        {footer && <div className="text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
