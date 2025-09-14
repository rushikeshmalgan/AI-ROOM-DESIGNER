'use client';

import { motion } from 'framer-motion';

export default function Card({
  children,
  className = '',
  padding = 'normal',
  shadow = 'md',
  hover = false,
  onClick,
}) {
  // Padding variants
  const paddingVariants = {
    none: 'p-0',
    small: 'p-2',
    normal: 'p-4',
    large: 'p-6',
  };

  // Shadow variants
  const shadowVariants = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  const baseClasses = `
    bg-white rounded-lg border border-gray-200
    ${paddingVariants[padding]}
    ${shadowVariants[shadow]}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `;

  const motionProps = hover
    ? {
        whileHover: { y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' },
        transition: { duration: 0.2 },
      }
    : {};

  return (
    <motion.div className={baseClasses} onClick={onClick} {...motionProps}>
      {children}
    </motion.div>
  );
}