"use client";
import React, { useState } from "react";
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
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";

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

  const onHandInputChange = (value, fieldName) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    setError(""); // Clear any previous errors when form changes
  };
  
  const handleGenerate = async () => {
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
      }
    } catch (error) {
      console.error("Error generating design:", error);
      setError(error.response?.data?.error || "An error occurred. Please try again.");
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
        Experience the Future of Interior Design
      </motion.h2>
      <motion.p 
        className="text-base text-gray-600 dark:text-gray-300 text-center max-w-xl mb-8 sm:mb-10"
        variants={itemVariants}
      >
        Transform your living spaces effortlessly with our intuitive tools.
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
              {isGenerating ? (
                <>
                  <LoadingSpinner size="small" text="" />
                  <span className="ml-2">Generating...</span>
                </>
              ) : (
                "Generate Design"
              )}
            </Button>
          </motion.div>
          {error && (
            <motion.p 
              className="text-red-500 text-sm mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {error}
            </motion.p>
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
