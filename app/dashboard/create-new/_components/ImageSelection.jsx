"use client";
import React, { useRef, useState } from "react";
import axios from "axios";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <div className="flex h-full flex-col">
      <label
        htmlFor="upload-image"
        className={cn(
          "group relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-secondary/40 transition-colors duration-200 lg:min-h-[480px]",
          uploading ? "cursor-not-allowed" : "cursor-pointer hover:border-border"
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading your room…</p>
          </div>
        ) : preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={preview} alt="Room preview" className="h-full w-full object-contain" />
        ) : (
          <div className="px-6 text-center">
            <ImagePlus className="mx-auto h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium text-foreground">Upload a photo of your room</p>
            <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
              For the best results, use a well-lit photo taken from a corner that shows most of the room.
            </p>
          </div>
        )}
      </label>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        id="upload-image"
        className="hidden"
        disabled={uploading}
        onChange={onFileSelected}
      />
    </div>
  );
}

export default ImageSelection;
