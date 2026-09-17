"use client";

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import Listing from './_components/Listing'
import DesignRecommendations from './_components/DesignRecommendations'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import axios from 'axios'
import { track } from '@/lib/analyticsClient'

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Dashboard() {
  const { user } = useUser();
  const [userDesigns, setUserDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    track('dashboard_view');
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchUserDesigns = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/designs');
        if (response.data && response.data.designs) {
          setUserDesigns(response.data.designs);
        }
      } catch (err) {
        console.error('Error fetching designs:', err);
        setError('Failed to load your designs');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDesigns();
  }, [user]);

  const handleRefined = (newDesign) => {
    setUserDesigns((prev) => [newDesign, ...prev]);
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {greeting()}{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Your design workspace</p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link href="/dashboard/create-new">
            <Plus className="h-4 w-4" />
            Redesign Room
          </Link>
        </Button>
      </motion.div>

      <div className="mt-10">
        <Listing
          designs={userDesigns}
          loading={loading}
          error={error}
          onRefined={handleRefined}
        />
      </div>

      {/* Design recommendations (deterministic, not AI-driven) */}
      <div className="mt-14">
        <DesignRecommendations userDesigns={userDesigns} />
      </div>
    </div>
  )
}

export default Dashboard
