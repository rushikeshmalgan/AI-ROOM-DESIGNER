"use client";

import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

// --- Mock UI Components (replace with your actual components) ---
const Card = ({ children, className, hover }) => <div className={`${className} bg-white dark:bg-gray-800 shadow-lg rounded-xl transition-shadow ${hover ? 'hover:shadow-2xl' : ''}`}>{children}</div>;
const LoadingSpinner = ({ size, text }) => <div className="text-center p-4"><div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto`}></div><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{text}</p></div>;
// --- End Mock UI Components ---


// Your existing ImageSelection component (I've included it here for context)
function ImageSelection({ onImageUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onFileSelected = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Upload to Cloudinary via your API route
      const response = await axios.post('/api/upload-image', formData);

      // Pass the image URL to the parent component
      onImageUploaded(response.data.imageUrl);
      setUploading(false);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
      setUploading(false);
    }
  };

  return (
    <motion.div
      className="flex items-center justify-center p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="flex flex-col items-center w-full max-w-sm p-6" hover>
        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-4 text-center text-md">
          1. Select an Image of Your Room
        </label>
        <label
          htmlFor="upload-image"
          className="w-full cursor-pointer"
        >
          <div className="relative flex items-center justify-center w-full h-64 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg bg-purple-50 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-gray-600 overflow-hidden transition-colors">
            {!file ? (
              <div className="text-center">
                <img src="/uploadimage.svg" alt="Upload Icon" className="w-16 h-16 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-300">Click to upload</p>
              </div>
            ) : uploading ? (
              <LoadingSpinner size="medium" text="Uploading to Cloudinary..." />
            ) : (
              <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
            )}
          </div>
        </label>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <input type="file" accept="image/*" id="upload-image" className="hidden" onChange={onFileSelected} />
      </Card>
    </motion.div>
  );
}


// New Parent Component to manage the entire design process
function RoomDesigner() {
  const [originalImage, setOriginalImage] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleGeneration = async () => {
    if (!prompt) {
      setError("Please enter a design style prompt.");
      return;
    }
    setIsGenerating(true);
    setGeneratedImage(null);
    setError(null);

    try {
      const response = await axios.post('/api/generate-design', {
        imageUrl: originalImage,
        prompt: prompt,
      });
      setGeneratedImage(response.data.generatedImageUrl);
    } catch (err) {
      console.error("Error generating design:", err);
      setError("Failed to generate new design. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const startOver = () => {
    setOriginalImage(null);
    setGeneratedImage(null);
    setPrompt("");
    setError(null);
  }

  return (
    <div className="container mx-auto p-4">
      <AnimatePresence mode="wait">
        {!originalImage ? (
          <ImageSelection key="step1" onImageUploaded={setOriginalImage} />
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-8"
          >
            {/* --- Prompt and Original Image Section --- */}
            <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6 items-center">
              <div className="w-full md:w-1/2">
                <img src={originalImage} alt="Your Room" className="rounded-lg shadow-lg w-full" />
              </div>
              <div className="w-full md:w-1/2">
                <Card className="p-6">
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-md">
                    2. Describe the New Style
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A modern minimalist living room with a fireplace, photorealistic..."
                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    rows="3"
                  />
                  <button
                    onClick={handleGeneration}
                    disabled={isGenerating}
                    className="w-full mt-4 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGenerating ? "Designing..." : "Generate New Design"}
                  </button>
                  <button onClick={startOver} className="w-full mt-2 text-sm text-gray-500 hover:underline">
                    Start Over
                  </button>
                </Card>
              </div>
            </div>

            {/* --- Results Section --- */}
            {error && <p className="text-red-500">{error}</p>}
            
            <AnimatePresence>
                {isGenerating && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <LoadingSpinner size="large" text="AI is redesigning your room... This can take a moment." />
                    </motion.div>
                )}
            </AnimatePresence>

            {generatedImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-4xl text-center"
              >
                <h2 className="text-2xl font-bold mb-4 dark:text-white">Your New Room!</h2>
                <img src={generatedImage} alt="Generated Room Design" className="rounded-lg shadow-xl w-full" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RoomDesigner