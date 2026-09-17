"use client";
import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import Card from "@/app/components/ui/Card";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";

function ImageSelection({ selectedImage }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post("/api/upload-image", formData);
      selectedImage(response.data.imageUrl);
    } catch (err) {
      console.error("Error uploading image:", err);
      setError(err.response?.data?.error || "Failed to upload image. Please try again.");
      setPreview(null);
      selectedImage(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      className="flex items-center justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="flex flex-col items-center w-full p-6" hover>
        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-4 text-center text-md">
          1. Select an Image of Your Room
        </label>
        <label htmlFor="upload-image" className="w-full cursor-pointer">
          <div className="relative flex items-center justify-center w-full h-64 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg bg-purple-50 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-gray-600 overflow-hidden transition-colors">
            {uploading ? (
              <LoadingSpinner size="medium" text="Uploading..." />
            ) : preview ? (
              <img src={preview} alt="Room preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <img src="/uploadimage.svg" alt="Upload Icon" className="w-16 h-16 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-300">Click to upload</p>
              </div>
            )}
          </div>
        </label>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          id="upload-image"
          className="hidden"
          onChange={onFileSelected}
        />
      </Card>
    </motion.div>
  );
}

export default ImageSelection;
