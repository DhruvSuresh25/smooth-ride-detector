import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Clock,
  FileImage,
  Gauge,
  MapPin,
  ScanSearch,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";

import heroImage from "@/assets/hero-road-detection.jpg";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE, ANALYSIS_DISCLAIMER } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DriveSafe Vision — Detect potholes, improve roads" },
      {
        name: "description",
        content:
          "Upload a road image, get an AI-assisted pothole assessment with severity and location, submit a report, and track repair progress.",
      },
      { property: "og:title", content: "DriveSafe Vision — Detect potholes, improve roads" },
      {
        property: "og:description",
        content:
          "Real-time pothole detection and civic reporting: severity classification, location capture, annotated evidence, status tracking.",
      },
    ],
  }),
  component: Landing,
});

const steps = [
  { icon: Upload, title: "Upload an image", text: "Add a photo of the damaged road surface." },
  {
    icon: ScanSearch,
    title: "Analysis runs",
    text: "The detector locates potholes and estimates their size.",
  },
  {
    icon: ClipboardList,
    title: "Submit the report",
    text: "Attach your location and send it to road maintenance.",
  },
  {
    icon: BadgeCheck,
    title: "Track resolution",
    text: "Follow the status from review through to repair.",
  },
];

const features = [
  { icon: ScanSearch, title: "AI-assisted detection", text: "Potholes are located and outlined on the image." },
  { icon: Gauge, title: "Severity classification", text: "Low, Medium, High or Critical, based on size and count." },
  { icon: MapPin, title: "Automatic location capture", text: "Browser geolocation, with manual address entry as a fallback." },
  { icon: FileImage, title: "Annotated evidence", text: "Original and annotated images are stored with every report." },
  { icon: Clock, title: "Status tracking", text: "A clear timeline from submission to resolution." },
  { icon: Users, title: "Admin review workflow", text: "Administrators triage, note and resolve every report." },
];

const stats = [
  { label: "Reports submitted", value: "12,480" },
  { label: "Potholes detected", value: "31,207" },
  { label: "Reports resolved", value: "9,860" },
  { label: "Average response time", value: "4.2 days" },
];

function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how-it-works" className="hover:text-foreground">How it works</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#impact" className="hover:text-foreground">Impact</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hero-grid border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-2 lg:py-20">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {APP_TAGLINE}
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl">
              Detect potholes. Improve roads.{" "}
              <span className="text-gradient-brand">Make travel safer.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              Upload a photo of a damaged road and {APP_NAME} generates a pothole report complete
              with severity classification, GPS location, estimated dimensions and annotated image
              evidence — then tracks it until the road is repaired.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link to={user ? "/dashboard" : "/register"}>
                  Get Started Free <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how-it-works">Learn More</a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{ANALYSIS_DISCLAIMER}</p>
          </div>

          <div className="relative">
            <img
              src={heroImage}
              alt="City road with a pothole outlined by a detection bounding box labelled 98% confidence"
              width={1408}
              height={1024}
              className="w-full rounded-2xl border border-border shadow-float"
            />
            <div className="surface-card absolute -bottom-5 left-4 flex items-center gap-3 p-3 sm:left-6">
              <span className="rounded-full border border-sev-high/25 bg-sev-high-bg px-2.5 py-0.5 text-xs font-semibold text-sev-high">
                High severity
              </span>
              <span className="text-xs text-muted-foreground">1 pothole · 98% confidence</span>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-3xl font-bold">How it works</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Four steps from spotting a hazard to seeing it fixed.
        </p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="surface-card p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-sm text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-3xl font-bold">Key features</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Built for citizens reporting hazards and the teams that fix them.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-border bg-background p-5">
                <feature.icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="impact" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-3xl font-bold">What coordinated reporting achieves</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Illustrative programme figures shown as sample data.
        </p>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="surface-card p-5">
              <dt className="text-sm text-muted-foreground">{stat.label}</dt>
              <dd className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-border bg-primary">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-14 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Help make your roads safer.</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">
              Create a free account and submit your first report in minutes.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link to={user ? "/dashboard" : "/register"}>Create Your Account</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo />
            <p className="mt-2 max-w-sm text-xs text-muted-foreground">
              {APP_TAGLINE}. {ANALYSIS_DISCLAIMER}
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">About</a>
            <a href="#how-it-works" className="hover:text-foreground">Privacy</a>
            <a href="#how-it-works" className="hover:text-foreground">Terms</a>
            <a href="#impact" className="hover:text-foreground">Contact</a>
            <Link to="/admin/login" className="hover:text-foreground">Admin</Link>
          </nav>
        </div>
        <p className="border-t border-border px-5 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
