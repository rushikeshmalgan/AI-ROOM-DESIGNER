"use client"

import React from 'react'
import EmptyState from './EmptyState';
import DesignChain from './DesignChain';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { buildDesignChains } from '@/lib/designChains';

// Designs are fetched once by the parent Dashboard page and passed down
// here (and to DesignRecommendations) — this used to fetch /api/designs
// a second time on every dashboard load.
function Listing({ designs, loading, error, onRefined }) {
  const chains = buildDesignChains(designs);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } },
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border/60 py-16 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (designs.length === 0) {
    return <EmptyState />;
  }

  return (
    <motion.div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {chains.map((chain) => (
        <motion.div key={chain[0].id} variants={itemVariants}>
          <DesignChain chain={chain} onRefined={onRefined} />
        </motion.div>
      ))}
    </motion.div>
  )
}

export default Listing;
