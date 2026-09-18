"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const designStyles = [
  {
    name: 'Minimalist',
    description: 'Clean lines, simple color schemes, and functional furniture with minimal ornamentation.',
    image: '/minimalist.jpg',
    tags: ['clean', 'simple', 'functional', 'neutral colors']
  },
  {
    name: 'Modern',
    description: 'Sleek, contemporary designs with bold colors, innovative materials, and cutting-edge furniture.',
    image: '/modern.jpg',
    tags: ['sleek', 'bold', 'innovative', 'contemporary']
  },
  {
    name: 'Industrial',
    description: 'Raw, unfinished aesthetic with exposed brick, metal fixtures, and vintage-inspired pieces.',
    image: '/industrial.jpg',
    tags: ['raw', 'exposed', 'metal', 'vintage']
  },
  {
    name: 'Bohemian',
    description: 'Eclectic mix of colors, patterns, and textures with a carefree, artistic vibe.',
    image: '/bohemian.jpg',
    tags: ['eclectic', 'colorful', 'artistic', 'textured']
  },
  {
    name: 'Traditional',
    description: 'Classic designs with rich colors, ornate details, and elegant furniture pieces.',
    image: '/traditional.jpg',
    tags: ['classic', 'elegant', 'ornate', 'rich colors']
  },
  {
    name: 'Rustic',
    description: 'Natural, weathered elements with warm colors and handcrafted furniture pieces.',
    image: '/rustic.jpg',
    tags: ['natural', 'warm', 'handcrafted', 'weathered']
  }
];

// Get random recommendations
function getRandomRecommendations(count) {
  const shuffled = [...designStyles].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

const FALLBACK = { personalized: getRandomRecommendations(3), trending: getRandomRecommendations(3) };

function DesignRecommendations({ userDesigns = [] }) {
  // /api/recommendations already returns both personalized and trending
  // in one response (see app/api/recommendations/route.ts) — the tab
  // toggle is a pure display switch over data already in memory, not a
  // new query. This used to re-fetch the same endpoint on every tab
  // click (and discarded the half of the first response it didn't
  // immediately use), which was a real duplicate network round-trip on
  // a purely client-side interaction, not something DB/AI-latency-bound.
  const [data, setData] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personalized');

  useEffect(() => {
    let cancelled = false;
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/recommendations');
        const json = await response.json();
        if (cancelled) return;

        if (json.success && json.recommendations) {
          setData({
            personalized: json.recommendations.personalized.map((rec) => ({
              name: rec.name,
              description: rec.description,
              image: rec.imageUrl || '/modern.jpg',
              tags: rec.name.split(' '),
            })),
            trending: json.recommendations.trending.map((style) => ({
              name: style.name,
              description: style.description,
              image: style.imageUrl || '/placeholder-design.jpg',
              tags: style.name.split(' '),
            })),
          });
        } else {
          setData(FALLBACK);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        if (!cancelled) setData(FALLBACK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRecommendations();
    return () => { cancelled = true; };
  }, [userDesigns]);

  const recommendations = data[activeTab];
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Recommended for you
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab === 'personalized'
              ? 'Based on the rooms and styles you have designed so far.'
              : 'Popular design styles across the app.'}
          </p>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button
            variant={activeTab === 'personalized' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('personalized')}
          >
            For you
          </Button>
          <Button
            variant={activeTab === 'trending' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('trending')}
          >
            Trending
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {recommendations.map((style) => (
            <motion.div key={style.name} variants={itemVariants}>
              <Link
                href={`/dashboard/create-new?style=${style.name.toLowerCase()}`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-xl border border-border/70"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  style={{ backgroundImage: `url(${style.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                  <h3 className="text-sm font-medium text-white">{style.name}</h3>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-white/80 transition-colors duration-200 group-hover:text-white">
                    Try this style
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}

export default DesignRecommendations;