'use client';

import { motion } from 'framer-motion';

export default function LoadingSpinner({ size = 'medium', text = 'Loading...' }) {
  // Size variants
  const sizeVariants = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <motion.div
        className={`${sizeVariants[size]} rounded-full border-2 border-t-transparent border-purple-500`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}