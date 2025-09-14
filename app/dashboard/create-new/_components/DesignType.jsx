"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

function DesignType({ selectedDesignType, defaultValue }) {
  const Designs = [
    { name: "Modern", image: "/modern.jpg" },
    { name: "Traditional", image: "/traditional.jpg" },
    { name: "Industrial", image: "/industrial.jpg" },
    { name: "Minimalist", image: "/minimalist.jpg" },
    { name: "Rustic", image: "/rustic.jpg" },
    { name: "Bohemian", image: "/bohemian.jpg" },
  ];

  const [selectedOption, setSelectedOption] = useState(defaultValue || null);

  // Sync parent default value with local state
  useEffect(() => {
    if (defaultValue) setSelectedOption(defaultValue);
  }, [defaultValue]);

  const handleSelect = (designName) => {
    setSelectedOption(designName);
    selectedDesignType(designName);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div 
      className="w-full"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.label 
        className="block text-base font-medium text-gray-700 dark:text-gray-200 mb-3"
        variants={itemVariants}
      >
        Select Room Interior Design Type
      </motion.label>

      <motion.div 
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
        variants={containerVariants}
      >
        {Designs.map((design) => {
          const isSelected = selectedOption === design.name;

          return (
            <motion.div
              key={design.name}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(design.name)}
              onKeyDown={(e) => e.key === "Enter" && handleSelect(design.name)}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative group rounded-xl overflow-hidden shadow-md cursor-pointer focus:outline-none ${
                isSelected ? "ring-2 ring-purple-500" : "ring-1 ring-transparent"
              }`}
            >
              {/* Image */}
              <div className="relative w-full h-40">
                <Image
                  src={design.image}
                  alt={design.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover rounded-xl"
                />
                {/* Overlay */}
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center bg-black"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isSelected ? 0.6 : 0 }}
                  whileHover={{ opacity: 0.4 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.span
                    className={`text-white text-sm font-semibold px-3 py-2 rounded-md ${isSelected ? "bg-purple-600" : "bg-black bg-opacity-70"}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: isSelected ? 1 : 0,
                      scale: isSelected ? 1 : 0.8 
                    }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {design.name}
                  </motion.span>
                </motion.div>
              </div>
              
              {/* Selection indicator */}
              {isSelected && (
                <motion.div 
                  className="absolute top-2 right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

export default DesignType;
