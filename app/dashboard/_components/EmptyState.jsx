"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";

const images = [
  "/interior/1.jpg",
  "/interior/2.jpg",
  "/interior/3.jpg",
  "/interior/4.jpg",
  "/interior/5.jpg",
];

function EmptyState() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 2500); // smoother & slower (2.5s)

    return () => clearInterval(interval);
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div 
      className="w-full flex flex-col items-center justify-center py-10"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Image Slider */}
      <motion.div 
        className="relative w-full max-w-4xl h-[400px] overflow-hidden rounded-2xl shadow-xl"
        variants={itemVariants}
      >
        {images.map((src, index) => (
          <motion.img
            key={index}
            src={src}
            alt={`Slide ${index + 1}`}
            className={`absolute w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
            initial={{ scale: index === currentIndex ? 1.05 : 1 }}
            animate={{ 
              scale: index === currentIndex ? 1 : 1.05,
              transition: { duration: 2.5 } 
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      </motion.div>

      {/* CTA Section */}
      <motion.div 
        className="mt-10 text-center"
        variants={itemVariants}
      >
        <motion.h2 
          className="text-3xl font-extrabold text-gray-800 mb-4"
          variants={itemVariants}
        >
          Transform Your Space
        </motion.h2>
        <motion.p 
          className="text-gray-600 max-w-lg mx-auto mb-6"
          variants={itemVariants}
        >
          Explore beautiful interior designs and bring your dream room to life
          with our AI-powered redesign feature.
        </motion.p>
        <motion.div variants={itemVariants}>
          <Button
            href="/dashboard/create-new"
            variant="primary"
            size="large"
          >
            Redesign Room
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default EmptyState;
