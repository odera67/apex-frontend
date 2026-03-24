"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Droplet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti"; // 🎉 IMPORT CONFETTI

export default function WaterTracker() {
  const { user, isLoaded } = useUser();
  const today = new Date().toISOString().split("T")[0]; 

  // Fetch data
  const waterData = useQuery(
    api.water.getTodayWater,
    isLoaded && user ? { userId: user.id, date: today } : "skip"
  );

  // Setup mutation
  const addWater = useMutation(api.water.logWater);

  if (!isLoaded || !user) return null;

  const currentWater = waterData?.amount || 0;
  const dailyGoal = 2500; // 2.5 Liters goal
  const progressPercentage = Math.min((currentWater / dailyGoal) * 100, 100);

  // 🎉 THE CONFETTI ANIMATION FUNCTION
  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      // Fire from left edge
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff'] // Water themed colors!
      });
      // Fire from right edge
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleDrink = (amount: number) => {
    const newTotal = currentWater + amount;

    // Trigger confetti ONLY if this exact drink pushes them over the goal
    if (currentWater < dailyGoal && newTotal >= dailyGoal) {
      triggerConfetti();
    }

    addWater({
      userId: user.id,
      date: today,
      amount: amount,
    });
  };

  return (
    <div className="bg-card text-card-foreground p-6 rounded-2xl shadow-sm border mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Droplet className="text-blue-500 fill-blue-500" />
          Water Intake
        </h2>
        <span className="text-sm font-medium text-muted-foreground">
          {currentWater} / {dailyGoal} ml
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary h-4 rounded-full overflow-hidden mb-6">
        <div 
          className="bg-blue-500 h-full transition-all duration-500 ease-in-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Quick Add Buttons */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1 flex gap-2 items-center hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
          onClick={() => handleDrink(250)}
        >
          <Plus className="size-4" /> 250ml Glass
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 flex gap-2 items-center hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
          onClick={() => handleDrink(500)}
        >
          <Plus className="size-4" /> 500ml Bottle
        </Button>
      </div>

      {progressPercentage >= 100 && (
        <p className="text-green-500 text-sm font-semibold mt-4 text-center animate-in fade-in zoom-in duration-300">
           Daily hydration goal reached! Great job!
        </p>
      )}
    </div>
  );
}