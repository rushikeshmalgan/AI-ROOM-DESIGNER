"use client";

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Listing from './_components/Listing'
import DesignRecommendations from './_components/DesignRecommendations'
import { motion } from 'framer-motion'
import axios from 'axios'

function Dashboard() {
  const { user } = useUser();
  const [userDesigns, setUserDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        className="text-3xl font-bold mb-8 text-gray-800 dark:text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Your Designs
      </motion.h1>
      <Listing
        designs={userDesigns}
        loading={loading}
        error={error}
        onRefined={handleRefined}
      />

      {/* Design recommendations (deterministic, not AI-driven) */}
      <DesignRecommendations userDesigns={userDesigns} />
    </motion.div>
  )
}

export default Dashboard