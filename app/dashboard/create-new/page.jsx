"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ImageSelection from "./_components/ImageSelection";
import RoomType from "./_components/RoomType";
import DesignType from "./_components/DesignType";
import AdditionalReq from "./_components/AdditionalReq";
import { Loader2, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
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
    <motion.div 
      className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.h2
        className="text-3xl font-extrabold text-purple-700 dark:text-purple-400 tracking-tight mb-3 sm:mb-4 text-center"
        variants={itemVariants}
      >
        Redesign your room, then keep refining it
      </motion.h2>
      <motion.p
        className="text-base text-gray-600 dark:text-gray-300 text-center max-w-xl mb-8 sm:mb-10"
        variants={itemVariants}
      >
        Upload your room, pick a style, and generate a first design. Not quite right?
        Just describe what to change — the sofa, the wall color, the lighting — and get
        a new version without losing what you already have.
      </motion.p>

      <Card className="w-full max-w-5xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8" shadow="lg">
        {/* Left Column - Image Selection */}
        <motion.div 
          className="flex flex-col space-y-6"
          variants={itemVariants}
        >
          <ImageSelection
            selectedImage={(value) => onHandInputChange(value, "image")}
          />
          <AdditionalReq
            additionalRequirementInput={(value) =>
              onHandInputChange(value, "additionalRequirements")
            }
          />
        </motion.div>

        {/* Right Column - Form Inputs */}
        <motion.div 
          className="flex flex-col space-y-6"
          variants={itemVariants}
        >
          <RoomType
            selectedRoomType={(value) => onHandInputChange(value, "roomType")}
          />
          <DesignType
            selectedDesignType={(value) =>
              onHandInputChange(value, "designType")
            }
          />
          <motion.div
            whileHover={{ scale: isGenerating ? 1 : 1.02 }}
            whileTap={{ scale: isGenerating ? 1 : 0.98 }}
          >
            <Button
              className="w-full mt-4"
              onClick={handleGenerate}
              disabled={isGenerating}
              variant="primary"
              size="large"
              icon={isGenerating ? null : <Wand2 className="h-4 w-4" />}
            >
              {isGenerating ? "Generating..." : "Generate Design"}
            </Button>
          </motion.div>

          {isGenerating && <GenerationStages active className="mt-4" />}

          {error && !isGenerating && (
            <motion.div
              className="mt-3 p-3 rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-red-600 dark:text-red-400 text-sm">
                We couldn&apos;t generate this design.
              </p>
              {creditSafe && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">
                  Your credit wasn&apos;t charged.
                </p>
              )}
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{error}</p>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="small" onClick={handleGenerate}>
                  Try Again
                </Button>
                <Button variant="ghost" size="small" onClick={() => router.push("/dashboard")}>
                  Go Back
                </Button>
              </div>
            </motion.div>
          )}

          <motion.p
            className="text-gray-500 text-sm text-center mt-2"
            variants={itemVariants}
          >
            NOTE: One credit will be used to redesign your room
          </motion.p>
        </motion.div>
      </Card>
    </motion.div>
  );
}

export default CreateNew;
