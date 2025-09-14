"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-32">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 space-y-6"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white">
              Transform Your Space with <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-transparent bg-clip-text">AI Magic</span>
            </h1>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl">
              Redesign your rooms instantly with our AI-powered interior design tool. Upload a photo and watch your space transform before your eyes.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/dashboard">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg">
                    Get Started
                  </Button>
                </motion.div>
              </Link>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" className="border-purple-300 text-purple-700 dark:text-purple-300 px-8 py-6 text-lg rounded-xl">
                  View Examples
                </Button>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Right Image */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 relative"
          >
            <div className="relative w-full h-[400px] lg:h-[500px]">
              <Image 
                src="/hero-image.svg" 
                alt="AI Room Design Example"
                fill
                className="object-cover rounded-2xl shadow-2xl"
              />
              
              {/* Before/After Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent rounded-2xl flex items-center justify-start p-6">
                <div className="bg-white/90 dark:bg-gray-900/90 p-4 rounded-xl shadow-lg">
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-400">Before & After</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">See the transformation</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="bg-white dark:bg-gray-900 py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Redesign Your Space in <span className="text-purple-600">Minutes</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Our AI-powered platform makes interior design accessible to everyone.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 h-full" hover>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Multiple Room Types</h3>
                  <p className="text-gray-600 dark:text-gray-300">Transform any space from living rooms to kitchens and bedrooms.</p>
                </div>
              </Card>
            </motion.div>
            
            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 h-full" hover>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Various Design Styles</h3>
                  <p className="text-gray-600 dark:text-gray-300">Choose from modern, minimalist, traditional, industrial and more.</p>
                </div>
              </Card>
            </motion.div>
            
            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 h-full" hover>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Instant Results</h3>
                  <p className="text-gray-600 dark:text-gray-300">Get your redesigned room in seconds with our advanced AI technology.</p>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Feature card component
function FeatureCard({ icon, title, description, index }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
    >
      <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </motion.div>
  );
}

// Features data
const features = [
  {
    icon: <span className="text-2xl">🏠</span>,
    title: "Multiple Room Types",
    description: "Transform any room in your home - living rooms, bedrooms, kitchens, bathrooms, and more."
  },
  {
    icon: <span className="text-2xl">🎨</span>,
    title: "Various Design Styles",
    description: "Choose from modern, traditional, minimalist, industrial, bohemian, and other popular styles."
  },
  {
    icon: <span className="text-2xl">⚡</span>,
    title: "Instant Results",
    description: "Get your redesigned room in seconds, not days or weeks like traditional interior design."
  },
];
