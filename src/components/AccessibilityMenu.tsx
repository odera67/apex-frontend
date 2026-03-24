"use client";

import { useState, useEffect } from "react";
import { Accessibility, Type, Contrast, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLargeText, setIsLargeText] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isDyslexicFont, setIsDyslexicFont] = useState(false);

  // Handle Text Resizing
  useEffect(() => {
    if (isLargeText) {
      document.documentElement.style.fontSize = "110%"; 
    } else {
      document.documentElement.style.fontSize = "100%";
    }
  }, [isLargeText]);

  // Handle High Contrast
  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [isHighContrast]);

  // Handle Dyslexia Font
  useEffect(() => {
    if (isDyslexicFont) {
      document.body.classList.add("dyslexic-mode");
    } else {
      document.body.classList.remove("dyslexic-mode");
    }
  }, [isDyslexicFont]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* The Menu Card */}
      {isOpen && (
        <div className="mb-4 w-72 bg-card border border-border shadow-2xl rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-5 border-b border-border pb-3">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-primary" />
              Accessibility
            </h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Large Text Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm font-medium">
                <Type className="w-5 h-5 text-muted-foreground" />
                Large Text
              </div>
              <Button 
                variant={isLargeText ? "default" : "outline"} 
                size="sm"
                onClick={() => setIsLargeText(!isLargeText)}
                className="h-8 w-14 font-bold"
              >
                {isLargeText ? "ON" : "OFF"}
              </Button>
            </div>

            {/* High Contrast Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm font-medium">
                <Contrast className="w-5 h-5 text-muted-foreground" />
                High Contrast
              </div>
              <Button 
                variant={isHighContrast ? "default" : "outline"} 
                size="sm"
                onClick={() => setIsHighContrast(!isHighContrast)}
                className="h-8 w-14 font-bold"
              >
                {isHighContrast ? "ON" : "OFF"}
              </Button>
            </div>

            {/* Dyslexia Font Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm font-medium">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
                Dyslexia Font
              </div>
              <Button 
                variant={isDyslexicFont ? "default" : "outline"} 
                size="sm"
                onClick={() => setIsDyslexicFont(!isDyslexicFont)}
                className="h-8 w-14 font-bold"
              >
                {isDyslexicFont ? "ON" : "OFF"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* The Floating Action Button (Now Bigger!) */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className="h-16 w-16 rounded-full shadow-2xl hover:scale-105 transition-transform bg-primary text-primary-foreground"
        aria-label="Toggle Accessibility Menu"
      >
        <Accessibility className="w-8 h-8" />
      </Button>
    </div>
  );
}