import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "@/components/brand/Logo";
import { APP_NAME } from "@/lib/constants";

export const Route = createFileRoute("/terms")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Terms of Use — DriveSafe Vision" },
      { name: "description", content: "The terms for using DriveSafe Vision to report and track pothole repairs." },
      { property: "og:title", content: "Terms of Use — DriveSafe Vision" },
      { property: "og:description", content: "The terms for using DriveSafe Vision to report and track pothole repairs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

const sections = [
  {
    title: "The service",
    body: `${APP_NAME} lets citizens report road potholes with a photo and location, and lets road-maintenance administrators track and resolve those reports.`,
  },
  {
    title: "AI analysis is an estimate",
    body: "Pothole counts, sizes and severity ratings are produced by an AI model from the photo you upload. They are estimates meant to help prioritise repairs — an inspector confirms the actual condition on site.",
  },
  {
    title: "Your responsibilities",
    body: "Only upload photos of real road damage, taken safely and legally. Do not submit false reports, other people's personal data, or content you have no right to share.",
  },
  {
    title: "Accounts",
    body: "Keep your password private. Accounts that misuse the service can be suspended or removed by an administrator.",
  },
  {
    title: "No guarantee of repair times",
    body: "Status updates and deadlines describe the maintenance workflow, but actual repair times depend on the responsible authorities.",
  },
];

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-8">
        <Logo to="/" />
        <Link to="/login" className="text-sm font-semibold text-primary">Sign in</Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Terms of Use</h1>
        <p className="mt-2 text-sm text-muted-foreground">The ground rules for using {APP_NAME}.</p>
        <div className="mt-8 space-y-6">
          {sections.map((s) => (
            <section key={s.title} className="surface-card p-5">
              <h2 className="font-bold">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
