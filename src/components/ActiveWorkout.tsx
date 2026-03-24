"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Timer, ChevronLeft, Trophy, CheckCircle2, FastForward } from "lucide-react";
import confetti from "canvas-confetti";

interface Routine {
  name: string;
  sets: number;
  reps: string;
  description?: string;
}

interface ActiveWorkoutProps {
  dayName: string;
  exercises: Routine[];
  onFinishWorkout: () => void;
}

export default function ActiveWorkout({ dayName, exercises, onFinishWorkout }: ActiveWorkoutProps) {
  // 1. Flatten the workout into a step-by-step sequence of INDIVIDUAL SETS
  const workoutSequence = useMemo(() => {
    const steps: any[] = [];
    exercises.forEach((exercise) => {
      for (let s = 0; s < exercise.sets; s++) {
        steps.push({
          exerciseName: exercise.name,
          reps: exercise.reps,
          description: exercise.description,
          currentSetNumber: s + 1,
          totalSetsForExercise: exercise.sets,
        });
      }
    });
    return steps;
  }, [exercises]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Timer State
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);

  // Rest Timer Countdown Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restTimeLeft > 0) {
      interval = setInterval(() => {
        setRestTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (restTimeLeft === 0 && isResting) {
      // Timer finished! Automatically go back to the workout screen
      setIsResting(false);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimeLeft]);

  if (!exercises || exercises.length === 0) return null;

  const currentStep = workoutSequence[currentStepIndex];
  const isAbsoluteLastSet = currentStepIndex === workoutSequence.length - 1;
  const progressPercentage = ((currentStepIndex) / workoutSequence.length) * 100;

  // Format timer (e.g. 60 -> "01:00")
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // --- HANDLERS ---
  const handleCompleteSet = () => {
    if (isAbsoluteLastSet) {
      // Workout is totally done!
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => {
        onFinishWorkout();
      }, 1500);
    } else {
      // Move to the next set AND show the dedicated Rest Screen
      setCurrentStepIndex((prev) => prev + 1);
      setRestTimeLeft(60);
      setIsResting(true);
    }
  };

  const handleGoBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setIsResting(false); // Cancel rest if they go back
    }
  };

  return (
    <div className="max-w-md mx-auto w-full flex flex-col min-h-[70vh]">
      
      {/* HEADER & OVERALL PROGRESS */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-2xl font-black uppercase font-mono text-primary">
            {dayName}
          </h2>
          <span className="text-sm font-bold text-muted-foreground">
            Set {currentStepIndex + 1} of {workoutSequence.length}
          </span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-in-out" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {isResting ? (
        <div className="bg-card border border-border rounded-3xl shadow-lg flex-grow flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-300">
          <Timer className="w-16 h-16 text-primary mb-4 animate-pulse" />
          <h3 className="text-xl font-bold text-muted-foreground uppercase tracking-widest mb-2">
            Rest & Recover
          </h3>
          
          <div className="text-[80px] font-mono font-black leading-none mb-8 text-primary">
            {formatTime(restTimeLeft)}
          </div>
          
          {/* UP NEXT PREVIEW */}
          <div className="bg-secondary/50 rounded-2xl p-4 w-full border border-border mb-8 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-bold">Up Next</p>
            <p className="font-black text-xl">{currentStep.exerciseName}</p>
            <p className="text-sm text-muted-foreground">
              Set {currentStep.currentSetNumber} of {currentStep.totalSetsForExercise} • Target: {currentStep.reps}
            </p>
          </div>

          <Button 
            size="lg" 
            variant="outline" 
            className="rounded-2xl w-full h-14 font-bold text-lg gap-2" 
            onClick={() => setIsResting(false)}
          >
            <FastForward className="w-5 h-5" /> Skip Rest
          </Button>
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-3xl shadow-lg flex-grow flex flex-col items-center justify-center p-8 text-center relative overflow-hidden animate-in fade-in duration-300">
            <div className="relative z-10 w-full flex flex-col items-center">
              <h3 className="text-sm font-bold tracking-widest text-primary uppercase mb-2">
                Set {currentStep.currentSetNumber} of {currentStep.totalSetsForExercise}
              </h3>
              
              <h2 className="text-4xl font-black mb-4 leading-tight">
                {currentStep.exerciseName}
              </h2>
              
              <p className="text-muted-foreground text-sm mb-10 max-w-[250px]">
                {currentStep.description || "Focus on form and controlled movements."}
              </p>

              <div className="bg-secondary/50 rounded-2xl p-6 w-full max-w-[200px] border border-border shadow-inner">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Target</span>
                <span className="text-4xl font-black">{currentStep.reps}</span>
              </div>
            </div>
          </div>

          {/* NAVIGATION CONTROLS */}
          <div className="flex items-center mt-6 gap-4">
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleGoBack} 
              disabled={currentStepIndex === 0}
              className="rounded-2xl px-4 h-16 shadow-sm"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <Button 
              size="lg" 
              onClick={handleCompleteSet}
              className={`rounded-2xl flex-grow font-black text-xl h-16 gap-2 transition-all shadow-lg ${
                isAbsoluteLastSet ? "bg-green-500 hover:bg-green-600 text-white shadow-green-500/20" : ""
              }`}
            >
              {isAbsoluteLastSet ? (
                <>
                  <Trophy className="w-6 h-6" /> Finish Workout
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" /> Complete Set
                </>
              )}
            </Button>
          </div>
        </>
      )}

    </div>
  );
}