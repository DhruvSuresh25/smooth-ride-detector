import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CloudRain, Droplets, Snowflake, Truck } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

const URL = "https://drivesafevision.com/resources/how-potholes-form";
const TITLE = "How Does a Pothole Form? Causes Explained — DriveSafe Vision";
const DESC =
  "Learn how potholes form: water seeping into cracks, heavy traffic, monsoon rain and freeze-thaw cycles. See the warning signs and how to report one fast.";

export const Route = createFileRoute("/resources/how-potholes-form")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How does a pothole form?",
          description: DESC,
          author: { "@type": "Person", name: "Dhruvva Suresh" },
          mainEntityOfPage: URL,
        }),
      },
    ],
  }),
  component: HowPotholesForm,
});

const stages = [
  {
    icon: Droplets,
    title: "1. Water gets into the road",
    text: "Small cracks appear in the asphalt surface from age, sunlight and traffic. Rainwater seeps through them into the layers underneath.",
  },
  {
    icon: CloudRain,
    title: "2. The base underneath weakens",
    text: "Trapped water softens the soil and gravel base that supports the road and can wash fine material away, leaving gaps under the surface.",
  },
  {
    icon: Snowflake,
    title: "3. Freezing makes it worse (in cold climates)",
    text: "Where temperatures drop below zero, water in the cracks freezes and expands, pushing the cracks wider. When it thaws, more water gets in.",
  },
  {
    icon: Truck,
    title: "4. Traffic breaks the surface",
    text: "Vehicles keep pressing on the weakened spot. The unsupported asphalt bends, cracks into pieces and is thrown out, leaving a hole that grows quickly.",
  },
];

function HowPotholesForm() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Logo />
          <Button asChild size="sm">
            <Link to="/register">Report a pothole</Link>
          </Button>
        </div>
      </header>

      <article className="mx-auto max-w-3xl space-y-8 px-5 py-12">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-primary">Road safety guide</p>
          <h1 className="text-4xl font-extrabold leading-tight">How does a pothole form?</h1>
          <p className="text-muted-foreground">
            A pothole forms when water weakens the layers under a road and traffic then breaks
            the weakened surface apart. It usually starts as a small crack and can become a
            dangerous hole within weeks, especially during heavy rain.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">The four stages</h2>
          <ol className="grid gap-4 sm:grid-cols-2">
            {stages.map((s) => (
              <li key={s.title} className="surface-card p-5">
                <s.icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Why potholes appear so fast in the monsoon</h2>
          <p className="text-muted-foreground">
            In much of India, freezing is rare — the main cause is water. Long spells of heavy
            rain keep the road base soaked, standing water hides small cracks, and poor drainage
            lets water sit on the surface. Combined with heavy vehicles, this is why many
            potholes appear during and right after the monsoon.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Early warning signs</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
            <li>Spider-web or “alligator” cracking on the surface</li>
            <li>Dips or sinking patches where water collects after rain</li>
            <li>Loose gravel or broken edges around a crack</li>
          </ul>
          <p className="text-muted-foreground">
            Fixing a crack early is far cheaper than repairing a full pothole — which is why
            reporting damage quickly matters.
          </p>
        </section>

        <section className="surface-card space-y-3 p-6">
          <h2 className="text-xl font-bold">Spotted one? Report it in under a minute</h2>
          <p className="text-sm text-muted-foreground">
            Upload a photo to DriveSafe Vision. It detects the potholes, rates the severity,
            records the location and sends the complaint to the admin responsible for that area
            — and you can track it until it is fixed.
          </p>
          <Button asChild className="gap-2">
            <Link to="/register">
              Report a pothole <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </article>
    </div>
  );
}
