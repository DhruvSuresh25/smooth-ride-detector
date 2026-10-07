import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { APP_NAME } from "@/lib/constants";

export const Route = createFileRoute("/contact")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Contact — DriveSafe Vision" },
      { name: "description", content: "How to reach the DriveSafe Vision team." },
      { property: "og:title", content: "Contact — DriveSafe Vision" },
      { property: "og:description", content: "How to reach the DriveSafe Vision team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-8">
        <Logo to="/" />
        <Link to="/login" className="text-sm font-semibold text-primary">Sign in</Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Contact</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questions, feedback or account help for {APP_NAME}.
        </p>
        <section className="surface-card mt-8 flex items-start gap-4 p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Mail className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold">Email the team</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              For account help, report questions or feedback, email us and we will get back to you.
            </p>
            <a
              href="mailto:dhruvva.suresh@gmail.com"
              className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
            >
              dhruvva.suresh@gmail.com
            </a>
          </div>
        </section>
        <p className="mt-6 text-sm text-muted-foreground">
          Found a pothole? The fastest way to get it fixed is to{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            create an account and report it
          </Link>{" "}
          — it goes straight to the area administrator.
        </p>
      </main>
    </div>
  );
}
