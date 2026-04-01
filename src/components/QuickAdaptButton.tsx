"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Mic, Loader2 } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner"; // Added for better UI feedback instead of native alerts

interface QuickAdaptProps {
  planId: Id<"plans">;
  day: string;
  exerciseName: string;
}

export default function QuickAdaptButton({ planId, day, exerciseName }: QuickAdaptProps) {
  const [isAdapting, setIsAdapting] = useState(false);
  
  const { user } = useUser();
  // 🚀 FIXED: Changed getLatestUserPlan to getUserPlan to match your actual Convex schema
  const activePlan = useQuery(api.plans.getUserPlan, user ? { userId: user.id } : "skip");
  const mutateExercise = useMutation(api.plans.swapExercise);

  const handleVoiceSwap = async () => {
    if (!activePlan) {
        toast.error("Please wait for your plan data to load before swapping.");
        return;
    }

    // 1. Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Your browser does not support voice recognition. Try Chrome, Edge, or the native app.");
      return;
    }

    const recognition = new SpeechRecognition();
    
    // Set properties for better accuracy
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsAdapting(true); 

    try {
      recognition.start();
    } catch (err) {
      console.error("Microphone permission denied or already running", err);
      toast.error("Please allow microphone access to use voice commands.");
      setIsAdapting(false);
      return;
    }

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      toast.success(`Heard: "${transcript}". Adapting plan...`);
      
      try {
        const payload = {
            request: transcript,
            exerciseContext: exerciseName,
            weight: activePlan.userStats?.weight || "70",
            feedback: "swap",
            days: activePlan.workoutPlan?.schedule?.length?.toString() || "3",
            userStats: {
                age: activePlan.userStats?.age || "25",
                height: activePlan.userStats?.height || "170",
                weight: activePlan.userStats?.weight || "70 kg",
                level: activePlan.userStats?.level || "beginner",
                goal: activePlan.userStats?.goal || "lose weight",
                equipment: activePlan.userStats?.equipment || "full gym",
                allergies: activePlan.userStats?.allergies || "none",
                injuries: activePlan.userStats?.injuries || "none"
            }
        };

        const res = await fetch("https://apex-ai-backend-yfn8.onrender.com/api/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Failed to get adaptation from Python backend.");
        
        const data = await res.json();

        // BULLETPROOF DATA EXTRACTION
        const extractedData = data.newExercise ? data.newExercise : data;

        if (!extractedData || !extractedData.name) {
          throw new Error("AI did not return a valid exercise name.");
        }

        const formattedNewExercise = {
          name: String(extractedData.name),
          sets: Number(extractedData.sets || 3),
          reps: String(extractedData.reps || "10"),
          description: extractedData.description ? String(extractedData.description) : undefined,
        };

        // Update Convex database instantly
        await mutateExercise({
          planId,
          dayName: day,
          oldExerciseName: exerciseName,
          newExercise: formattedNewExercise, 
        });
        
        toast.success(`Swapped to ${formattedNewExercise.name}!`);

      } catch (e) {
        console.error("Adaptation failed", e);
        toast.error("Failed to swap exercise. Ensure your AI server is online.");
      } finally {
        setIsAdapting(false);
      }
    };

    // Failsafe: if the user stays silent or speech recognition throws an error
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error !== 'no-speech') {
          toast.error("Microphone error. Please try again.");
      }
      setIsAdapting(false);
    };

    // Failsafe: turn off loading state when the microphone naturally stops listening
    recognition.onend = () => {
      // If we are still adapting, it means onresult fired and is awaiting the fetch.
      // If not, it means the user stopped talking without triggering a result.
    };
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleVoiceSwap}
      disabled={isAdapting}
      className="gap-2 text-primary border-primary/50 hover:bg-primary/10 transition-all"
    >
      {isAdapting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
      <span className="hidden sm:inline">{isAdapting ? "Listening/Adapting..." : "Swap"}</span>
    </Button>
  );
}