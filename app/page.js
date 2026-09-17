"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analyticsClient";

const STEPS = [
  {
    number: "01",
    title: "Generate",
    description: "Upload a photo of your room and turn it into a design concept in a style you choose.",
  },
  {
    number: "02",
    title: "Refine",
    description: "Describe what to change — the sofa, the lighting, the wall color — and get a new version without losing what already works.",
  },
  {
    number: "03",
    title: "Share",
    description: "Present the final result as a polished before/after, ready to send or publish.",
  },
];

export default function Home() {
  useEffect(() => {
    track("landing_view");
  }, []);

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              AI Interior Design Studio
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Redesign your space.
              <br />
              See what&apos;s possible.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Transform an existing room into a refined interior concept using AI —
              then iterate until it feels right.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/dashboard">
                  Start designing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="#how-it-works">Explore examples</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border/80 sm:aspect-[5/4]">
              <Image
                src="/interior/1.jpg"
                alt="A room redesigned with AI Room Designer"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-4 left-4 rounded-lg border border-border/60 bg-background/90 px-3 py-2 backdrop-blur-sm">
              <p className="text-xs font-medium text-foreground">Living room · Scandinavian</p>
              <p className="text-[11px] text-muted-foreground">Generated with AI Room Designer</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Editorial feature section */}
      <section id="how-it-works" className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="border-t border-border/80 pt-6 md:border-t-0 md:pt-0"
              >
                <span className="font-mono text-sm text-muted-foreground">{step.number}</span>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
