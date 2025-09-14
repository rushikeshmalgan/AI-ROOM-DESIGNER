'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Button({
  children,
  variant = 'primary',
  size = 'medium',
  href,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  icon,
  fullWidth = false,
}) {
  // Variants
  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300',
    outline: 'bg-transparent hover:bg-gray-100 text-purple-600 border border-purple-600',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  // Sizes
  const sizes = {
    small: 'py-1 px-3 text-sm',
    medium: 'py-2 px-4',
    large: 'py-3 px-6 text-lg',
  };

  const baseClasses = `
    rounded-md font-medium transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50
    flex items-center justify-center gap-2
    ${variants[variant]}
    ${sizes[size]}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `;

  const buttonContent = (
    <>
      {icon && <span className="inline-block">{icon}</span>}
      {children}
    </>
  );

  // Animation properties
  const motionProps = {
    whileHover: { scale: disabled ? 1 : 1.02 },
    whileTap: { scale: disabled ? 1 : 0.98 },
    transition: { duration: 0.2 },
  };

  if (href && !disabled) {
    return (
      <motion.div {...motionProps}>
        <Link href={href} className={baseClasses}>
          {buttonContent}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      type={type}
      className={baseClasses}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...motionProps}
    >
      {buttonContent}
    </motion.button>
  );
}