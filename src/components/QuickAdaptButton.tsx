"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Mic, Loader2 } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

interface QuickAdaptProps {
  planId: Id<"plans">;
  day: string;
  exerciseName: string;
}

export default function QuickAdaptButton({ planId, day, exerciseName }: QuickAdaptProps) {
  const [isAdapting, setIsAdapting] = useState(false);
  const [statusText, setStatusText] = useState("Swap");
  
  const { user } = useUser();
  const activePlan = useQuery(api.plans.getUserPlan, user ? { userId: user.id } : "skip");
  const mutateExercise = useMutation(api.plans.swapExercise);

  const handleVoiceSwap = async () => {
    if (!activePlan) {
      toast.error("Please wait for your plan data to load before swapping.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Your browser does not support voice recognition. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsAdapting(true);
    setStatusText("Listening...");
    let speechDetected = false;

    try {
      recognition.start();
    } catch (err) {
      console.error("Mic start error:", err);
      toast.error("Could not start microphone. Check browser permissions.");
      setIsAdapting(false);
      setStatusText("Swap");
      return;
    }

    // 1. WHAT HAPPENS WHEN YOU SPEAK
    recognition.onresult = async (event: any) => {
      speechDetected = true;
      const transcript = event.results[0][0].transcript;
      
      console.log("🎙️ Heard:", transcript);
      toast.success(`Heard: "${transcript}"`);
      setStatusText("Thinking...");

      try {
        const payload = {
            request: transcript,
            exerciseContext: exerciseName,
            weight: activePlan.userStats?.weight || "70",
            feedback: "swap",
            days: activePlan.workoutPlan?.schedule?.length?.toString() || "3",
            userStats: {
                goal: activePlan.userStats?.goal || "lose weight",
                level: activePlan.userStats?.level || "beginner",
                equipment: activePlan.userStats?.equipment || "full gym",
                allergies: activePlan.userStats?.allergies || "none",
                injuries: activePlan.userStats?.injuries || "none"
            }
        };

        console.log("🚀 Sending Payload to Python:", payload);

        // Fetching exactly /api/swap
        const res = await fetch("https://apex-ai-backend-yfn8.onrender.com/api/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
           const errorText = await res.text();
           console.error("❌ Python Error:", errorText);
           throw new Error(`Backend Error ${res.status}`);
        }
        
        const data = await res.json();
        console.log("✅ Received from Python:", data);

        const extractedData = data.newExercise;

        if (!extractedData || !extractedData.name) {
          throw new Error("AI did not return a valid exercise name.");
        }

        const formattedNewExercise = {
          name: String(extractedData.name),
          sets: Number(extractedData.sets || 3),
          reps: String(extractedData.reps || "10"),
          description: extractedData.description ? String(extractedData.description) : undefined,
        };

        console.log("💾 Updating Convex Database with:", formattedNewExercise);
        setStatusText("Updating Plan...");

        // Update Convex database instantly
        await mutateExercise({
          planId,
          dayName: day,
          oldExerciseName: exerciseName,
          newExercise: formattedNewExercise, 
        });
        
        toast.success(`Swapped to ${formattedNewExercise.name}!`);

      } catch (e: any) {
        console.error("❌ Entire Adaptation failed:", e);
        toast.error(`Swap failed: ${e.message || "Server Error"}`);
      } finally {
        setIsAdapting(false);
        setStatusText("Swap");
      }
    };

    // 2. WHAT HAPPENS ON ERRORS
    recognition.onerror = (event: any) => {
      console.error("🎙️ Speech recognition error:", event.error);
      if (event.error === 'not-allowed') toast.error("Microphone access denied!");
      else if (event.error !== 'no-speech') toast.error(`Microphone error: ${event.error}`);
      
      setIsAdapting(false);
      setStatusText("Swap");
    };

    // 3. WHAT HAPPENS IF IT STOPS LISTENING BUT NO SPEECH WAS HEARD
    recognition.onend = () => {
      if (!speechDetected) {
        console.log("🎙️ Microphone stopped without hearing anything.");
        toast.info("Microphone stopped. Please try again and speak clearly.");
        setIsAdapting(false);
        setStatusText("Swap");
      }
    };
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleVoiceSwap}
      disabled={isAdapting}
      className="gap-2 text-primary border-primary/50 hover:bg-primary/10 transition-all min-w-[100px]"
    >
      {isAdapting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
      <span className="hidden sm:inline">{statusText}</span>
    </Button>
  );
}