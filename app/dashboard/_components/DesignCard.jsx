"use client";

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Download, Share2 } from 'lucide-react';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';

function DesignCard({ design }) {
  const {
    id,
    originalImageUrl,
    generatedImageUrl,
    roomType,
    designType,
    additionalRequirements,
    createdAt
  } = design;

  // Format date
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <Card
      className="overflow-hidden transition-all duration-300 hover:scale-[1.02]"
      hover
      shadow="lg"
      padding="none"
    >
      <div className="relative h-48 sm:h-56 md:h-64 w-full">
        {/* Before/After Comparison */}
        <div className="absolute inset-0 flex flex-col sm:flex-row">
          <div className="w-full sm:w-1/2 h-1/2 sm:h-full relative">
            <Image
              src={originalImageUrl}
              alt="Original Room"
              fill
              className="object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
              Before
            </div>
          </div>
          <div className="w-full sm:w-1/2 h-1/2 sm:h-full relative">
            <Image
              src={generatedImageUrl}
              alt="Generated Design"
              fill
              className="object-cover"
            />
            <div className="absolute bottom-2 right-2 bg-purple-600 bg-opacity-80 text-white text-xs px-2 py-1 rounded">
              After
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-1 sm:gap-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">
            {roomType} - {designType} Style
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formattedDate}
          </span>
        </div>

        {additionalRequirements && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
            {additionalRequirements}
          </p>
        )}

        <div className="flex flex-wrap justify-between gap-2 mt-4">
          <Button
            variant="outline"
            size="small"
            onClick={() => window.open(generatedImageUrl, '_blank')}
            icon={<Download className="h-4 w-4" />}
          >
            Save
          </Button>
          <Button
            variant="outline"
            size="small"
            icon={<Share2 className="h-4 w-4" />}
          >
            Share
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default DesignCard;