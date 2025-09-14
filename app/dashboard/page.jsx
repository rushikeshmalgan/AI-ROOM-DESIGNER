"use client";

import React, { useState, useEffect } from 'react'
import Listing from './_components/Listing'
import DesignRecommendations from './_components/DesignRecommendations'
import { motion } from 'framer-motion'
import axios from 'axios'

function Dashboard() {
  const [userDesigns, setUserDesigns] = useState([]);
  
  useEffect(() => {
    const fetchUserDesigns = async () => {
      try {
        const response = await axios.get('/api/designs');
        if (response.data && response.data.designs) {
          setUserDesigns(response.data.designs);
        }
      } catch (err) {
        console.error('Error fetching designs for recommendations:', err);
      }
    };
    
    fetchUserDesigns();
  }, []);
  
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
      <Listing />
      
      {/* AI-powered design recommendations */}
      <DesignRecommendations userDesigns={userDesigns} />
    </motion.div>
  )
}

export default Dashboard