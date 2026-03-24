"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Mic, Loader2 } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";

interface QuickAdaptProps {
  planId: Id<"plans">;
  day: string;
  exerciseName: string;
}

export default function QuickAdaptButton({ planId, day, exerciseName }: QuickAdaptProps) {
  const [isAdapting, setIsAdapting] = useState(false);
  
  // Fetch the user and their active plan so we have access to their injuries/allergies!
  const { user } = useUser();
  const activePlan = useQuery(api.plans.getLatestUserPlan, user ? { userId: user.id } : "skip");
  const mutateExercise = useMutation(api.plans.swapExercise);

  const handleVoiceSwap = async () => {
    // Prevent swapping if the plan hasn't loaded yet
    if (!activePlan) {
        alert("Please wait for your plan data to load before swapping.");
        return;
    }

    // 1. Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition. Try Chrome or Edge!");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.start();

    // Add a visual cue that it is listening before the result comes back
    setIsAdapting(true); 

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      
      try {
        // 🚀 Packaged the full payload with userStats so the Python backend respects injuries!
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

        // 🚀 CHANGED: Now hitting the dedicated `/api/swap` endpoint!
        const res = await fetch("http://127.0.0.1:8000/api/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Failed to get adaptation from Python backend.");
        
        const data = await res.json();

        // 3. BULLETPROOF DATA EXTRACTION
        const extractedData = data.newExercise ? data.newExercise : data;

        // Safety check: Make sure the AI actually gave us an exercise name
        if (!extractedData || !extractedData.name) {
          throw new Error("AI did not return a valid exercise name.");
        }

        // Format exactly how Convex expects it to prevent schema errors
        const formattedNewExercise = {
          name: String(extractedData.name),
          sets: Number(extractedData.sets || 3), // Fallback to 3 sets
          reps: String(extractedData.reps || "10"), // Fallback to 10 reps
          description: extractedData.description ? String(extractedData.description) : undefined,
        };

        // 4. Update Convex database instantly
        await mutateExercise({
          planId,
          dayName: day,
          oldExerciseName: exerciseName,
          newExercise: formattedNewExercise, 
        });
        
      } catch (e) {
        console.error("Adaptation failed", e);
        alert("Oops, something went wrong with the AI trainer. Make sure your Python server is running!");
      } finally {
        setIsAdapting(false);
      }
    };

    recognition.onerror = () => {
      setIsAdapting(false);
    };
    recognition.onend = () => {
       // Handled in finally block
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