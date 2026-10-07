import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "@/components/brand/Logo";
import { APP_NAME } from "@/lib/constants";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Privacy Policy — DriveSafe Vision" },
      { name: "description", content: "How DriveSafe Vision collects, stores and uses your photos, location and account details." },
      { property: "og:title", content: "Privacy Policy — DriveSafe Vision" },
      { property: "og:description", content: "How DriveSafe Vision collects, stores and uses your photos, location and account details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    title: "What we collect",
    body: "Your name and email when you sign up; the road photos you upload; the GPS location or address you attach to a report; and your ratings and feedback after a repair.",
  },
  {
    title: "How we use it",
    body: "Photos are analysed by an AI vision model to detect potholes and estimate severity. Your location routes the report to the right area administrator. Your contact details are used for sign-in and status updates about your own reports.",
  },
  {
    title: "Who can see it",
    body: "Only you and the administrators handling your report can see your photos and contact details. Other citizens can never see your personal information. Public area statistics show totals only, with no personal details.",
  },
  {
    title: "Storage and security",
    body: "Photos are stored privately and are only accessible through short-lived signed links. Access to every record is controlled by row-level security rules in the database.",
  },
  {
    title: "Your choices",
    body: "You can turn off email notifications in Profile & Settings. To delete your account and every report you submitted, contact the super administrator through the Contact page.",
  },
];

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-8">
        <Logo to="/" />
        <Link to="/login" className="text-sm font-semibold text-primary">Sign in</Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          How {APP_NAME} handles your photos, location and account details.
        </p>
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
