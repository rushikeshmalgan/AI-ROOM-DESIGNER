"use client";

import React, { useContext } from 'react';
import Image from 'next/image'
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs'
import { UserDetailContext } from '@/app/_context/UserDetailContext'
import Button from '@/app/components/ui/Button'
import { Home, PlusCircle, Settings, Image as ImageIcon } from 'lucide-react'
import { motion } from 'framer-motion';

function Header() {
  const { userDetail } = useContext(UserDetailContext);

  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-white/70 dark:bg-gray-900/60 backdrop-blur-md shadow-lg border-b border-gray-200 dark:border-gray-700 fixed top-0 left-0 right-0 z-50"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        
        {/* Logo + Title */}
        <Link href="/dashboard">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <Image src={'/logo.svg'} width={40} height={40} alt={"Logo"} />
            <h2 className="font-bold text-xl bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              AI Room Design
            </h2>
          </motion.div>
        </Link>

        {/* Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <NavLink href="/dashboard" icon={<Home size={18} />} text="Home" />
          <NavLink href="/dashboard/create-new" icon={<PlusCircle size={18} />} text="Create New" />
          <NavLink href="/dashboard/generate-image" icon={<ImageIcon size={18} />} text="Generate Image" />
          <NavLink href="/dashboard/settings" icon={<Settings size={18} />} text="Settings" />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Credits */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-gray-800 dark:to-gray-700 px-3 py-1 rounded-full shadow-md"
          >
            <Image src={'/credits.svg'} width={20} height={20} alt="Credits" />
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">
              {userDetail?.credits ?? 0}
            </h2>
          </motion.div>

          {/* Buy Credits Button */}
          <Button 
            variant="outline" 
            className="rounded-full border border-purple-400 text-purple-600 dark:text-purple-300"
          >
            Buy More Credits
          </Button>

          {/* User Avatar */}
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </motion.div>
  )
}

// NavLink component with hover animation
function NavLink({ href, icon, text }) {
  return (
    <Link href={href}>
      <motion.div 
        whileHover={{ scale: 1.05 }}
        className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-colors duration-200 cursor-pointer"
      >
        {icon}
        <span>{text}</span>
      </motion.div>
    </Link>
  );
}

export default Header
