"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Dumbbell, Utensils, Activity, ArrowRight, Flame, Target, 
  Trophy, Play, Sparkles, CheckCircle, Loader2, Calendar,
  ChevronLeft, ChevronRight, User
} from "lucide-react";
import QuickAdaptButton from "@/components/QuickAdaptButton";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import WaterTracker from "@/components/WaterTracker"; 
import HealthSyncCard from "@/components/HealthSyncCard"; 
import ApexMotivationCard from "@/components/ApexMotivationCard"; 
import { toast } from "sonner";

// ==========================================
// 🔴 MUSCLE HEATMAP COMPONENT
// ==========================================
const TargetHeatmap = ({ routines }: { routines: any[] }) => {
  // Analyze routines to determine muscle heat (0 to 100)
  const heatLevels = useMemo(() => {
    let chest = 0, back = 0, arms = 0, core = 0, legs = 0;
    
    if (!routines || routines.length === 0) return { chest, back, arms, core, legs };

    routines.forEach(r => {
      const name = r.name.toLowerCase();
      if (name.includes("bench") || name.includes("push") || name.includes("fly") || name.includes("press")) {
        chest += 35; arms += 15;
      }
      if (name.includes("row") || name.includes("pull") || name.includes("lat") || name.includes("deadlift")) {
        back += 35; arms += 15;
      }
      if (name.includes("curl") || name.includes("extension") || name.includes("tricep") || name.includes("bicep")) {
        arms += 40;
      }
      if (name.includes("crunch") || name.includes("plank") || name.includes("raise") || name.includes("core")) {
        core += 40;
      }
      if (name.includes("squat") || name.includes("leg") || name.includes("lunge") || name.includes("calf")) {
        legs += 40;
      }
    });

    return {
      chest: Math.min(chest, 100),
      back: Math.min(back, 100),
      arms: Math.min(arms, 100),
      core: Math.min(core, 100),
      legs: Math.min(legs, 100),
    };
  }, [routines]);

  // Helper to get glow color based on intensity
  const getHeatStyle = (intensity: number) => {
    if (intensity === 0) return "bg-transparent opacity-0";
    if (intensity < 40) return "bg-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.5)] opacity-80";
    if (intensity < 70) return "bg-orange-500/80 shadow-[0_0_25px_rgba(249,115,22,0.8)] opacity-90";
    return "bg-red-500 shadow-[0_0_35px_rgba(239,68,68,1)] opacity-100"; // Max Heat
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-[2rem] p-6 shadow-sm relative overflow-hidden flex flex-col items-center justify-center">
      <div className="w-full flex items-center justify-between mb-6 z-10">
        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" /> Target Heatmap
        </span>
      </div>

      {/* Abstract Body Silhouette with Heat Points */}
      <div className="relative w-32 h-64 flex items-center justify-center z-10">
        {/* Silhouette SVG outline */}
        <svg viewBox="0 0 100 200" className="absolute inset-0 w-full h-full text-foreground/10 drop-shadow-md">
          <path fill="currentColor" d="M50 15c-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12-5.4-12-12-12zm0 30c-15 0-25 8-28 20l-5 40c-.5 5 5 8 8 3l6-25c2 15 5 45 5 45h28s3-30 5-45l6 25c3 5 8.5 2 8-3l-5-40c-3-12-13-20-28-20zm-9 65l-5 70c-.5 5 6 6 8 0l6-45 6 45c2 6 8.5 5 8 0l-5-70H41z"/>
        </svg>

        {/* Heat Nodes */}
        {/* Chest/Shoulders */}
        <div className={`absolute top-[35%] left-1/2 -translate-x-1/2 w-12 h-8 rounded-[100%] blur-[6px] transition-all duration-700 ${getHeatStyle(heatLevels.chest)}`} />
        {/* Core */}
        <div className={`absolute top-[50%] left-1/2 -translate-x-1/2 w-8 h-10 rounded-[100%] blur-[5px] transition-all duration-700 ${getHeatStyle(heatLevels.core)}`} />
        {/* Arms (Left & Right) */}
        <div className={`absolute top-[42%] left-[10%] w-6 h-12 rounded-[100%] blur-[5px] transition-all duration-700 ${getHeatStyle(heatLevels.arms)}`} />
        <div className={`absolute top-[42%] right-[10%] w-6 h-12 rounded-[100%] blur-[5px] transition-all duration-700 ${getHeatStyle(heatLevels.arms)}`} />
        {/* Legs */}
        <div className={`absolute bottom-[15%] left-1/2 -translate-x-1/2 w-14 h-24 rounded-[100%] blur-[8px] transition-all duration-700 ${getHeatStyle(heatLevels.legs)}`} />
      </div>

      <div className="w-full flex justify-between text-[10px] uppercase font-black tracking-widest text-muted-foreground mt-4 z-10">
        <span>Low</span>
        <div className="flex gap-1 items-center">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <div className="w-2 h-2 rounded-full bg-red-500" />
        </div>
        <span>Max</span>
      </div>
    </div>
  );
};

// ==========================================
// MAIN DASHBOARD PAGE
// ==========================================
export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  
  // 🎯 Active Exercise State (For One-by-One Focus)
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  
  // 🚀 AI Insight States
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [displayedInsight, setDisplayedInsight] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Daily Completion State
  const [isCompleting, setIsCompleting] = useState(false);
  
  const plan = useQuery(api.plans.getUserPlan, user ? { userId: user.id } : "skip");

  // Reset exercise focus back to index 0 whenever the user switches training days
  useEffect(() => {
    setActiveExerciseIndex(0);
  }, [activeDayIndex]);

  // Typing effect for the AI message
  useEffect(() => {
    if (aiInsight) {
      setIsTyping(true);
      setDisplayedInsight("");
      let i = 0;
      const interval = setInterval(() => {
        setDisplayedInsight(aiInsight.slice(0, i));
        i++;
        if (i > aiInsight.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [aiInsight]);

  if (!isLoaded || plan === undefined) {
    return <DashboardSkeleton />;
  }

  if (plan === null) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 space-y-6 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Dumbbell className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold font-mono tracking-tight">No Active Protocol</h2>
        <p className="text-muted-foreground max-w-md">Your command center is empty. Let the AI analyze your goals and build your custom physique roadmap.</p>
        <Button asChild size="lg" className="gap-2 rounded-full mt-4 shadow-lg shadow-primary/25">
          <Link href="/generate-program">
            Initialize Protocol <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    );
  }

  // ==========================================
  // 🧠 SMART REMINDER LOGIC (For Daily Tasks)
  // ==========================================
  const handleCompleteDay = async () => {
    setIsCompleting(true);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const currentHour = new Date().getHours();

        if (currentHour < 14) {
          await LocalNotifications.cancel({ notifications: [{ id: 2 }, { id: 3 }] });
        } else if (currentHour < 17) {
          await LocalNotifications.cancel({ notifications: [{ id: 3 }] });
        }
      }
      toast.success("Protocol Complete. Notifications paused until tomorrow.", { 
        duration: 4000,
        icon: '🏆'
      });
    } catch (notifyError) {
      console.error("Failed to cancel daily smart notifications:", notifyError);
      toast.error("Failed to update daily status.");
    } finally {
      setIsCompleting(false);
    }
  };

  // ==========================================
  // 🚀 HEALTH SYNC AI LOGIC
  // ==========================================
  const handleHealthSync = (data: { steps: number; calories?: number; heartRate?: number }) => {
    const goal = plan.userStats.goal.toLowerCase();
    const name = user?.firstName || "there";
    const steps = data.steps || 0;
    const calories = data.calories || 0;
    let comment = "";

    setTimeout(() => {
      if (goal.includes("loss") || goal.includes("lose")) {
        if (steps > 10000) {
          comment = `Incredible work today, ${name}. You smashed over 10,000 steps! ${calories > 0 ? `Burning those ${calories} active calories is e` : 'E'}xactly the kind of daily energy expenditure that forces your body to burn stored fat.`;
        } else {
          comment = `I see you're at ${steps.toLocaleString()} steps today. To really accelerate your weight loss, we need to get your daily movement up. Let's find excuses to move more tomorrow!`;
        }
      } else if (goal.includes("muscle") || goal.includes("gain")) {
        comment = `Your activity levels look solid for muscle growth, ${name}. Conserve that energy to lift heavier and recover faster. Focus on the weights today and hitting your protein targets.`;
      } else {
        comment = `Great check-in, ${name}. Hitting ${steps.toLocaleString()} steps is a fantastic baseline. Let's hit the protocol hard today.`;
      }
      setAiInsight(comment);
    }, 1200);
  };

  const currentWorkoutDay = plan.workoutPlan.exercises[activeDayIndex];
  const currentDietDay = plan.dietPlan.dailyPlans[activeDayIndex];
  
  const totalExercises = currentWorkoutDay?.routines?.length || 0;
  const currentExercise = currentWorkoutDay?.routines?.[activeExerciseIndex];
  const progressPercentage = totalExercises > 0 ? ((activeExerciseIndex + 1) / totalExercises) * 100 : 0;

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 container mx-auto max-w-6xl">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary font-bold text-sm tracking-widest uppercase mb-1 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Command Center
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {plan.name || "Your Protocol"}
            </h1>
          </div>
          <div className="hidden sm:block w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
          <Button asChild className="gap-2 rounded-2xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 col-span-2 sm:col-span-1 h-12 sm:h-10">
            <Link href="/workout">
              <Play className="w-4 h-4" fill="currentColor" />
              Start Workout
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="gap-2 rounded-2xl border-border/50 bg-background/50 backdrop-blur-sm h-12 sm:h-10">
            <Link href="/check-in">
              <Calendar className="w-4 h-4" />
              Check-In
            </Link>
          </Button>

          <Button 
            onClick={handleCompleteDay} 
            disabled={isCompleting} 
            className="gap-2 rounded-2xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all h-12 sm:h-10"
          >
            {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            <span>Mark Day Complete</span>
          </Button>
        </div>
      </div>

      {/* AI INSIGHT BUBBLE */}
      {aiInsight && (
        <div className="mb-10 bg-background/60 backdrop-blur-xl border border-primary/20 rounded-[2rem] p-5 sm:p-6 flex gap-4 items-start shadow-xl shadow-primary/5 relative overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary to-primary/30" />
          <div className="w-14 h-14 rounded-full border-2 border-primary/30 flex items-center justify-center bg-background shadow-inner shrink-0 overflow-hidden relative">
            <div className={`absolute inset-0 bg-primary/10 ${isTyping ? 'animate-pulse' : ''}`} />
            <img src="ai-avatar.png" alt="Apex AI" className="w-full h-full object-cover p-1 relative z-10 rounded-full" />
          </div>
          <div className="flex-1 pt-1.5">
            <div className="flex items-center gap-2 mb-1.5">
              <h4 className="font-bold text-sm text-foreground tracking-wide uppercase">Apex AI Analysis</h4>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
              {displayedInsight}
              {isTyping && <span className="inline-block w-2 h-4 ml-1 bg-primary rounded-sm animate-pulse" />}
            </p>
          </div>
        </div>
      )}

      {/* DAY SELECTOR TABS */}
      <div className="mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {plan.workoutPlan.exercises.map((dayData, idx) => (
            <button
              key={idx}
              onClick={() => setActiveDayIndex(idx)}
              className={`px-6 py-3.5 rounded-[1.5rem] text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeDayIndex === idx
                  ? "bg-foreground text-background shadow-lg scale-100"
                  : "bg-card border border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground scale-95"
              }`}
            >
              {dayData.day}
              {activeDayIndex === idx && <div className="w-1.5 h-1.5 rounded-full bg-background/50" />}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
        
        {/* LEFT COLUMN: ONE BY ONE EXERCISE WORKOUT PLAYER */}
        <section className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Active Exercise</h2>
          </div>

          {currentExercise ? (
            <div className="bg-card border border-border/60 rounded-[2.5rem] p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[400px]">
              
              {/* Progress Bar Header */}
              <div className="w-full space-y-2 mb-6">
                <div className="flex justify-between items-center text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  <span>Progress Tracker</span>
                  <span className="text-primary font-mono">{activeExerciseIndex + 1} of {totalExercises}</span>
                </div>
                <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out" 
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Main Singular Focus Exercise Panel */}
              <div className="flex-1 flex flex-col justify-center py-4 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
                    {currentExercise.name}
                  </h3>
                  <div className="shrink-0 self-start">
                    <QuickAdaptButton 
                      planId={plan._id} 
                      day={currentWorkoutDay.day} 
                      exerciseName={currentExercise.name} 
                    />
                  </div>
                </div>

                {/* Big Targets Row */}
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <div className="bg-background rounded-2xl p-4 border border-border/40 text-center shadow-sm">
                    <span className="block text-xs font-black tracking-widest text-muted-foreground uppercase mb-1">Target Sets</span>
                    <span className="text-3xl font-black text-primary font-mono">{currentExercise.sets}</span>
                  </div>
                  <div className="bg-background rounded-2xl p-4 border border-border/40 text-center shadow-sm">
                    <span className="block text-xs font-black tracking-widest text-muted-foreground uppercase mb-1">Target Reps</span>
                    <span className="text-3xl font-black text-foreground font-mono">{currentExercise.reps}</span>
                  </div>
                </div>

                {currentExercise.description && (
                  <div className="bg-background/40 backdrop-blur-sm rounded-2xl p-4 border border-border/30">
                    <span className="block text-xs font-extrabold text-primary uppercase tracking-wider mb-1">Coaching Note</span>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
                      {currentExercise.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Unique Player Controller Footer */}
              <div className="border-t border-border/50 pt-6 mt-6 flex justify-between items-center gap-4">
                <Button
                  variant="outline"
                  disabled={activeExerciseIndex === 0}
                  onClick={() => setActiveExerciseIndex((prev) => prev - 1)}
                  className="rounded-xl px-4 h-12 font-bold gap-1 border-border/50 bg-background/50 backdrop-blur-sm disabled:opacity-40"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </Button>

                {activeExerciseIndex < totalExercises - 1 ? (
                  <Button
                    onClick={() => setActiveExerciseIndex((prev) => prev + 1)}
                    className="rounded-xl px-5 h-12 bg-foreground text-background hover:bg-foreground/90 font-bold gap-1 ml-auto"
                  >
                    Next Exercise
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleCompleteDay}
                    disabled={isCompleting}
                    className="rounded-xl px-5 h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-2 ml-auto shadow-lg shadow-emerald-500/20"
                  >
                    {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Finish Session
                  </Button>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-card border border-border/50 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="font-bold text-xl text-foreground">Active Recovery Day</p>
              <p className="text-sm max-w-xs mt-1">Muscle growth happens during rest. Give your body the time it needs to rebuild.</p>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: HEATMAP, HEALTH & NUTRITION */}
        <section className="lg:col-span-2 space-y-6">
          
          {/* 🔴 NEW: MUSCLE TARGET HEATMAP */}
          <TargetHeatmap routines={currentWorkoutDay?.routines || []} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <HealthSyncCard onSync={handleHealthSync} />
            <ApexMotivationCard />
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-[2rem] p-1 shadow-sm">
             <WaterTracker />
          </div>

          <div className="flex items-center gap-3 mt-4 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Utensils className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Nutrition Guide</h2>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-[2rem] p-4 sm:p-6 shadow-sm">
            {currentDietDay && currentDietDay.meals.length > 0 ? (
              <div className="space-y-3">
                {currentDietDay.meals.map((meal, mIdx) => (
                  <div key={mIdx} className="p-4 bg-background rounded-2xl border border-border/50 flex flex-col gap-3 group hover:border-primary/30 transition-colors shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs tracking-widest uppercase text-primary bg-primary/10 px-3 py-1 rounded-full">
                        {meal.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium leading-relaxed text-foreground/80">
                      {meal.foods.join(" • ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm font-medium">No meal data available for this day.</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}