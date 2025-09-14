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
        className='pt-20 px-10 md:px-20 lg:px-40 xl:px-60'
      >
        {children}
      </motion.div>
    </div>
  )
}

export default DashboardLayout