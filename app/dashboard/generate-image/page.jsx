"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { motion } from "framer-motion";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";

function GenerateImagePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    prompt: "",
    style: "photographic",
    aspectRatio: "1:1",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);

  const styles = [
    { value: "photographic", label: "Photographic" },
    { value: "digital-art", label: "Digital Art" },
    { value: "illustration", label: "Illustration" },
    { value: "painting", label: "Painting" },
    { value: "cartoon", label: "Cartoon" },
  ];

  const aspectRatios = [
    { value: "1:1", label: "Square (1:1)" },
    { value: "16:9", label: "Landscape (16:9)" },
    { value: "9:16", label: "Portrait (9:16)" },
    { value: "4:3", label: "Standard (4:3)" },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(""); // Clear any previous errors when form changes
  };

  const handleGenerate = async () => {
    // Validate form data
    if (!formData.prompt) {
      setError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);

    try {
      // Call the API to generate the image
      const response = await axios.post("/api/generate-image", {
        prompt: formData.prompt,
        style: formData.style,
        aspectRatio: formData.aspectRatio,
      });

      if (response.data.success) {
        setGeneratedImage(response.data.imageUrl);
      } else {
        setError("Failed to generate image. Please try again.");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      setError(error.response?.data?.error || "An error occurred. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto py-8"
    >
      <motion.h1
        variants={itemVariants}
        className="text-3xl font-bold mb-8 text-gray-800 dark:text-white"
      >
        Generate AI Images
      </motion.h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Image Settings</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prompt
                </label>
                <textarea
                  name="prompt"
                  value={formData.prompt}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:text-white"
                  rows="4"
                  placeholder="Describe the image you want to generate..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Style
                </label>
                <select
                  name="style"
                  value={formData.style}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:text-white"
                >
                  {styles.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Aspect Ratio
                </label>
                <select
                  name="aspectRatio"
                  value={formData.aspectRatio}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:text-white"
                >
                  {aspectRatios.map((ratio) => (
                    <option key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full mt-4"
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner size="small" />
                    Generating...
                  </>
                ) : (
                  "Generate Image"
                )}
              </Button>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Generated Image</h2>

            <div className="flex-grow flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <LoadingSpinner size="large" />
                  <p className="mt-4 text-gray-600 dark:text-gray-400">
                    Generating your image...
                  </p>
                </div>
              ) : generatedImage ? (
                <div className="relative w-full h-full min-h-[300px]">
                  <Image
                    src={generatedImage}
                    alt="Generated AI Image"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Image
                    src="/file.svg"
                    width={80}
                    height={80}
                    alt="No image"
                    className="opacity-50 mb-4"
                  />
                  <p className="text-gray-500 dark:text-gray-400">
                    Your generated image will appear here
                  </p>
                </div>
              )}
            </div>

            {generatedImage && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => window.open(generatedImage, "_blank")}
                >
                  Download Image
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default GenerateImagePage;