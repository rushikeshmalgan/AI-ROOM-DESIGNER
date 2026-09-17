"use client"

import { useUser } from '@clerk/nextjs'
import React from 'react'
import EmptyState from './EmptyState';
import DesignChain from './DesignChain';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import { buildDesignChains } from '@/lib/designChains';

// Designs are fetched once by the parent Dashboard page and passed down
// here (and to DesignRecommendations) — this used to fetch /api/designs
// a second time on every dashboard load.
function Listing({ designs, loading, error, onRefined }) {
  const { user } = useUser();
  const chains = buildDesignChains(designs);

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
    <Card className="p-4 sm:p-6 md:p-8" shadow="lg">
      {/* Greeting */}
      <motion.h2 
        className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Hello,{" "}
        <span className="text-purple-600 dark:text-purple-400">
          {user?.fullName || "Guest"}
        </span>
      </motion.h2>

      {/* Action Row */}
      <motion.div 
        className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg">
          Ready to start a new design?
        </p>
        <Button 
          href="/dashboard/create-new"
          variant="primary"
          size="medium"
          icon={<Plus className="h-4 w-4" />}
        >
          Redesign Room
        </Button>
      </motion.div>

      {/* Listing or Empty State */}
      <motion.div 
        className="mt-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <LoadingSpinner size="large" text="Loading your designs..." />
          </div>
        ) : error ? (
          <motion.div 
            className="text-center p-8"
            variants={itemVariants}
          >
            <p className="text-red-500 mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </motion.div>
        ) : designs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {chains.map((chain, index) => (
              <motion.div
                key={chain[0].id}
                variants={itemVariants}
                custom={index}
              >
                <DesignChain chain={chain} onRefined={onRefined} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </Card>
  )
}

export default Listing;
