"use client";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const STYLES = ["Modern", "Traditional", "Industrial", "Minimalist", "Rustic", "Bohemian"];

function DesignType({ selectedDesignType, defaultValue }) {
  const [selectedOption, setSelectedOption] = useState(defaultValue || null);

  // Sync parent default value with local state
  useEffect(() => {
    if (defaultValue) setSelectedOption(defaultValue);
  }, [defaultValue]);

  const handleSelect = (designName) => {
    setSelectedOption(designName);
    selectedDesignType(designName);
  };

  return (
    <div className="w-full">
      <label className="mb-2.5 block text-sm font-medium text-foreground">Style</label>
      <div className="flex flex-wrap gap-2">
        {STYLES.map((name) => {
          const isSelected = selectedOption === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => handleSelect(name)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-200",
                isSelected
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border/100 hover:text-foreground"
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DesignType;
