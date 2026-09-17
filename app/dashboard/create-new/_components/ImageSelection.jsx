"use client";
import React, { useRef, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import Card from "@/app/components/ui/Card";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";
import { resizeImageIfNeeded } from "@/lib/clientImage";
import { track } from "@/lib/analyticsClient";

function ImageSelection({ selectedImage }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  // Guards against a stale upload response winning a race: if a user
  // re-selects a file before the previous upload resolves, only the
  // response matching the most recent selection is applied.
  const requestIdRef = useRef(0);

  const onFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const requestId = ++requestIdRef.current;

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError(null);

    try {
      // Downscale oversized photos before they go over the wire — a
      // full-resolution phone photo is no more useful to the model and
      // just costs upload time and Cloudinary bandwidth.
      const uploadFile = await resizeImageIfNeeded(file);

      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await axios.post("/api/upload-image", formData);
      if (requestId !== requestIdRef.current) return; // superseded by a newer selection

      track("image_uploaded");
      selectedImage(response.data.imageUrl);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("Error uploading image:", err);
      setError(err.response?.data?.error || "Failed to upload image. Please try again.");
      setPreview(null);
      selectedImage(null);
    } finally {
      if (requestId === requestIdRef.current) setUploading(false);
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
        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1 text-center text-md">
          1. Select an Image of Your Room
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center max-w-sm">
          For the best results, use a well-lit photo taken from a corner that shows most of the room.
        </p>
        <label
          htmlFor="upload-image"
          className={`w-full ${uploading ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
        >
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
          disabled={uploading}
          onChange={onFileSelected}
        />
      </Card>
    </motion.div>
  );
}

export default ImageSelection;
