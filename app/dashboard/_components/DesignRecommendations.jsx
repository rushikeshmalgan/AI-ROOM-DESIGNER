"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Lightbulb } from 'lucide-react';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import Link from 'next/link';

const designStyles = [
  {
    name: 'Minimalist',
    description: 'Clean lines, simple color schemes, and functional furniture with minimal ornamentation.',
    image: '/minimalist.jpg',
    tags: ['clean', 'simple', 'functional', 'neutral colors']
  },
  {
    name: 'Modern',
    description: 'Sleek, contemporary designs with bold colors, innovative materials, and cutting-edge furniture.',
    image: '/modern.jpg',
    tags: ['sleek', 'bold', 'innovative', 'contemporary']
  },
  {
    name: 'Industrial',
    description: 'Raw, unfinished aesthetic with exposed brick, metal fixtures, and vintage-inspired pieces.',
    image: '/industrial.jpg',
    tags: ['raw', 'exposed', 'metal', 'vintage']
  },
  {
    name: 'Bohemian',
    description: 'Eclectic mix of colors, patterns, and textures with a carefree, artistic vibe.',
    image: '/bohemian.jpg',
    tags: ['eclectic', 'colorful', 'artistic', 'textured']
  },
  {
    name: 'Traditional',
    description: 'Classic designs with rich colors, ornate details, and elegant furniture pieces.',
    image: '/traditional.jpg',
    tags: ['classic', 'elegant', 'ornate', 'rich colors']
  },
  {
    name: 'Rustic',
    description: 'Natural, weathered elements with warm colors and handcrafted furniture pieces.',
    image: '/rustic.jpg',
    tags: ['natural', 'warm', 'handcrafted', 'weathered']
  }
];

function DesignRecommendations({ userDesigns = [] }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personalized');
  
  // Fetch recommendations from API
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      
      try {
        // Call our new API endpoint
        const response = await fetch('/api/recommendations');
        const data = await response.json();
        
        if (data.success && data.recommendations) {
          // Use personalized recommendations from the API
          setRecommendations(data.recommendations.personalized.map(rec => ({
            name: rec.name,
            description: rec.description,
            image: rec.imageUrl || '/modern.jpg',
            tags: rec.name.split(' ') // Create tags from the name as a fallback
          })));
        } else {
          // Fallback to random recommendations
          setRecommendations(getRandomRecommendations(3));
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setRecommendations(getRandomRecommendations(3));
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [userDesigns]);
  
  // Get complementary styles for a given style
  const getComplementaryStyles = (style) => {
    // Define complementary style pairings
    const complementaryMap = {
      'minimalist': ['Modern', 'Industrial'],
      'modern': ['Minimalist', 'Industrial'],
      'industrial': ['Modern', 'Rustic'],
      'bohemian': ['Rustic', 'Traditional'],
      'traditional': ['Rustic', 'Bohemian'],
      'rustic': ['Traditional', 'Industrial']
    };
    
    return complementaryMap[style.toLowerCase()] || ['Modern', 'Minimalist'];
  };
  
  // Get random recommendations
  const getRandomRecommendations = (count) => {
    const shuffled = [...designStyles].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };
  
  // Switch between personalized and trending tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLoading(true);
    
    const fetchTabData = async () => {
      try {
        // Call our API endpoint
        const response = await fetch('/api/recommendations');
        const data = await response.json();
        
        if (data.success && data.recommendations) {
          if (tab === 'trending') {
            // Show trending styles from API
            setRecommendations(data.recommendations.trending.map(style => ({
              name: style.name,
              description: style.description,
              image: style.imageUrl || '/placeholder-design.jpg',
              tags: style.name.split(' ')
            })));
          } else {
            // Show personalized recommendations from API
            setRecommendations(data.recommendations.personalized.map(rec => ({
              name: rec.name,
              description: rec.description,
              image: rec.imageUrl || '/modern.jpg',
              tags: rec.name.split(' ')
            })));
          }
        } else {
          // Fallback to random recommendations
          setRecommendations(getRandomRecommendations(3));
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setRecommendations(getRandomRecommendations(3));
      } finally {
        setLoading(false);
      }
    };
    
    fetchTabData();
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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
    <Card className="p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <motion.div 
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Design Recommendations</h2>
        </motion.div>
        
        <motion.div 
          className="flex gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Button 
            variant={activeTab === 'personalized' ? 'primary' : 'outline'}
            size="small"
            onClick={() => handleTabChange('personalized')}
            className="text-xs"
          >
            Personalized
          </Button>
          <Button 
            variant={activeTab === 'trending' ? 'primary' : 'outline'}
            size="small"
            onClick={() => handleTabChange('trending')}
            className="text-xs"
          >
            Trending
          </Button>
        </motion.div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <LoadingSpinner size="medium" text="Generating recommendations..." />
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {recommendations.map((style, index) => (
            <motion.div 
              key={style.name} 
              variants={itemVariants}
              className="relative overflow-hidden rounded-lg group"
            >
              <div 
                className="h-40 bg-cover bg-center" 
                style={{ backgroundImage: `url(${style.image})` }}
              >
                <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-30 transition-all duration-300"></div>
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg">{style.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {style.tags.slice(0, 2).map(tag => (
                        <span 
                          key={tag} 
                          className="text-xs bg-white bg-opacity-20 text-white px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <Link 
                    href={`/dashboard/create-new?style=${style.name.toLowerCase()}`}
                    className="flex items-center gap-1 text-white text-sm font-medium group-hover:underline"
                  >
                    Try this style
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
      
      <motion.div 
        className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <p>
          {activeTab === 'personalized' 
            ? 'Recommendations based on your previous designs and preferences.'
            : 'Currently trending design styles among our users.'}
        </p>
      </motion.div>
    </Card>
  );
}

export default DesignRecommendations;