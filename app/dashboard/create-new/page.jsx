"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ImageSelection from "./_components/ImageSelection";
import RoomType from "./_components/RoomType";
import DesignType from "./_components/DesignType";
import AdditionalReq from "./_components/AdditionalReq";
import { Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import GenerationStages from "@/app/components/ui/GenerationStages";
import { track } from "@/lib/analyticsClient";

function CreateNew() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    image: null,
    roomType: "",
    designType: "",
    additionalRequirements: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    track("create_design_started");
  }, []);
  // Whether the failed request definitely never touched a credit
  // (validation/auth/rate-limit failures, or a provider failure the
  // server already refunded) — surfaced so the user never has to
  // wonder if they lost a credit for nothing.
  const [creditSafe, setCreditSafe] = useState(false);

  const onHandInputChange = (value, fieldName) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    setError(""); // Clear any previous errors when form changes
  };

  const handleGenerate = async () => {
    if (isGenerating) return; // belt-and-suspenders against double-submit

    // Validate form data
    if (!formData.image) {
      setError("Please select an image");
      return;
    }
    if (!formData.roomType) {
      setError("Please select a room type");
      return;
    }
    if (!formData.designType) {
      setError("Please select a design type");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      // Call the API to generate the design
      const response = await axios.post("/api/generate-design", {
        imageUrl: formData.image,
        roomType: formData.roomType,
        designType: formData.designType,
        additionalRequirements: formData.additionalRequirements,
      });

      // Redirect to the dashboard or results page
      if (response.data.success) {
        router.push("/dashboard");
      } else {
        setError("Failed to generate design. Please try again.");
        setCreditSafe(false);
      }
    } catch (error) {
      console.error("Error generating design:", error);
      const status = error.response?.status;
      const message = error.response?.data?.error || "An error occurred. Please try again.";
      setError(message);
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
          Redesign your room
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Upload your room, pick a style, and generate a first design. Not quite right?
          Describe what to change and keep refining it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        {/* Canvas */}
        <ImageSelection selectedImage={(value) => onHandInputChange(value, "image")} />

        {/* Controls */}
        <div className="flex flex-col gap-6 rounded-xl border border-border/70 bg-card p-5 lg:h-fit">
          <RoomType selectedRoomType={(value) => onHandInputChange(value, "roomType")} />

          <DesignType selectedDesignType={(value) => onHandInputChange(value, "designType")} />

          <AdditionalReq
            additionalRequirementInput={(value) =>
              onHandInputChange(value, "additionalRequirements")
            }
          />

          <Separator />

          <div>
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {!isGenerating && <Wand2 className="h-4 w-4" />}
              {isGenerating ? "Generating..." : "Generate Design"}
            </Button>
            <p className="mt-2.5 text-center text-xs text-muted-foreground">
              Uses 1 credit
            </p>
          </div>

          {isGenerating && <GenerationStages active />}

          {error && !isGenerating && (
            <motion.div
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-sm font-medium text-foreground">
                We couldn&apos;t generate this design.
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
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default CreateNew;
