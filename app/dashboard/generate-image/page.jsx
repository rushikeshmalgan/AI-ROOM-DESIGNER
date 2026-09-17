"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import { motion } from "framer-motion";
import { Wand2, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GenerationStages from "@/app/components/ui/GenerationStages";

const STYLES = [
  { value: "photographic", label: "Photographic" },
  { value: "digital-art", label: "Digital Art" },
  { value: "illustration", label: "Illustration" },
  { value: "painting", label: "Painting" },
  { value: "cartoon", label: "Cartoon" },
];

const ASPECT_RATIOS = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "4:3", label: "Standard (4:3)" },
];

function GenerateImagePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    prompt: "",
    style: "photographic",
    aspectRatio: "1:1",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [creditSafe, setCreditSafe] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [saveWarning, setSaveWarning] = useState("");

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(""); // Clear any previous errors when form changes
  };

  const handleGenerate = async () => {
    if (isGenerating) return; // belt-and-suspenders against double-submit

    // Validate form data
    if (!formData.prompt) {
      setError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      // Call the API to generate the image
      const response = await axios.post("/api/generate-image", {
        prompt: formData.prompt,
        style: formData.style,
        aspectRatio: formData.aspectRatio,
      });

      if (response.data.success) {
        setGeneratedImage(response.data.imageUrl);
        // If the DB write failed, show a persistent warning so the user
        // knows the image won't appear in their gallery on next visit.
        if (response.data.saved === false) {
          setSaveWarning(response.data.warning || "Image generated but could not be saved to your gallery. Please save it manually.");
        } else {
          setSaveWarning("");
        }
      } else {
        setError("Failed to generate image. Please try again.");
        setCreditSafe(false);
      }
    } catch (error) {
      console.error("Error generating image:", error);
      const status = error.response?.status;
      setError(error.response?.data?.error || "An error occurred. Please try again.");
      // 400/401/402/429 never touch credits; a 500 only reaches here
      // already refunded (the API always refunds before responding).
      setCreditSafe(status !== undefined && status !== 200);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Generate a concept
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Describe an interior from scratch — no source photo needed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        {/* Canvas */}
        <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-secondary/40 lg:min-h-[480px]">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 px-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Rendering your concept…</p>
            </div>
          ) : generatedImage ? (
            <div className="relative h-full min-h-[320px] w-full lg:min-h-[480px]">
              <Image
                src={generatedImage}
                alt="Generated concept"
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-contain"
              />
            </div>
          ) : (
            <div className="px-6 text-center">
              <ImageIcon className="mx-auto h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-muted-foreground">
                Your generated concept will appear here
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6 rounded-xl border border-border/70 bg-card p-5 lg:h-fit">
          <div>
            <label className="mb-2.5 block text-sm font-medium text-foreground">Prompt</label>
            <Textarea
              className="resize-none"
              rows={4}
              value={formData.prompt}
              onChange={(e) => setField("prompt", e.target.value)}
              placeholder="Describe the interior you want to generate…"
            />
          </div>

          <div>
            <label className="mb-2.5 block text-sm font-medium text-foreground">Style</label>
            <Select value={formData.style} onValueChange={(v) => setField("style", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2.5 block text-sm font-medium text-foreground">Aspect ratio</label>
            <Select value={formData.aspectRatio} onValueChange={(v) => setField("aspectRatio", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((ratio) => (
                  <SelectItem key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div>
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {!isGenerating && <Wand2 className="h-4 w-4" />}
              {isGenerating ? "Generating..." : "Generate Image"}
            </Button>
            <p className="mt-2.5 text-center text-xs text-muted-foreground">Uses 1 credit</p>
          </div>

          {isGenerating && <GenerationStages active />}

          {saveWarning && (
            <div className="rounded-lg border border-border/70 bg-secondary/40 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">{saveWarning}</p>
            </div>
          )}

          {error && !isGenerating && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-foreground">
                We couldn&apos;t generate this image.
              </p>
              {creditSafe && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Your credit wasn&apos;t charged.
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              <div className="mt-2.5 flex gap-2">
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  Try Again
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
                  Go Back
                </Button>
              </div>
            </div>
          )}

          {generatedImage && !isGenerating && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(generatedImage, "_blank")}
            >
              Download Image
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default GenerateImagePage;
