"use client";

import React from 'react'
import Header from './_components/Header'
import { motion } from 'framer-motion'

function DashboardLayout({children}) {
  return (
    <div>
      <Header />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className='pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto'
      >
        {children}
      </motion.div>
    </div>
  )
}

export default DashboardLayout