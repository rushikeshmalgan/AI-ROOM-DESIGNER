"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const images = [
  "/interior/1.jpg",
  "/interior/2.jpg",
  "/interior/3.jpg",
  "/interior/4.jpg",
  "/interior/5.jpg",
];

function EmptyState() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70">
      <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
        {images.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority={index === 0}
            className={`object-cover transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      </div>

      <motion.div
        className="px-6 py-8 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          No designs yet
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Upload your room, choose a style, then keep refining it — one change
          at a time — until it feels right.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/dashboard/create-new">Redesign a room</Link>
        </Button>
      </motion.div>
    </div>
  );
}

export default EmptyState;
