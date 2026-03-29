"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dumbbell, Utensils, Activity, ArrowRight, Flame, Target, Trophy, Play, Sparkles } from "lucide-react";
import QuickAdaptButton from "@/components/QuickAdaptButton";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import WaterTracker from "@/components/WaterTracker"; 
import HealthSyncCard from "@/components/HealthSyncCard"; 
import ApexMotivationCard from "@/components/ApexMotivationCard"; // 🔔 IMPORTED MOTIVATION CARD

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  
  // 🚀 AI Insight States
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [displayedInsight, setDisplayedInsight] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const plan = useQuery(api.plans.getUserPlan, user ? { userId: user.id } : "skip");

  // 🚀 Typing effect for the AI message
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
      }, 30); // Typing speed
      return () => clearInterval(interval);
    }
  }, [aiInsight]);

  if (!isLoaded || plan === undefined) {
    return <DashboardSkeleton />;
  }

  if (plan === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 space-y-6">
        <h2 className="text-3xl font-bold font-mono">No Active Plan Found</h2>
        <p className="text-muted-foreground">You need to generate your first AI fitness plan!</p>
        <Button asChild className="gap-2">
          <Link href="/generate-program">
            Build My Program <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    );
  }

  // 🚀 Logic to generate the AI comment when health data syncs
  const handleHealthSync = (data: { steps: number; calories: number; heartRate: number }) => {
    const goal = plan.userStats.goal.toLowerCase();
    const name = user?.firstName || "there";
    let comment = "";

    // Simulate AI thinking delay
    setTimeout(() => {
      if (goal.includes("loss") || goal.includes("lose")) {
        if (data.steps > 10000) {
          comment = `Incredible work today, ${name}. You smashed over 10k steps and burned ${data.calories} active calories. This is exactly the kind of daily energy expenditure that forces your body to burn stored fat. Keep this momentum going into tomorrow.`;
        } else if (data.steps > 7000) {
          comment = `Good baseline activity today, ${name}. ${data.steps.toLocaleString()} steps is a solid start. Since our main goal is fat loss, try taking a quick 15-minute walk after your last meal tonight to push that calorie burn even higher.`;
        } else {
          comment = `I see you're at ${data.steps.toLocaleString()} steps today. To really accelerate your weight loss, we need to get your NEAT (daily movement) up. Let's try to find excuses to move more tomorrow—take the stairs, pace on phone calls. You've got this.`;
        }
      } else if (goal.includes("muscle") || goal.includes("gain") || goal.includes("build")) {
        if (data.calories > 600) {
          comment = `You burned ${data.calories} active calories today, ${name}. Remember, since we are trying to build muscle, you need to eat back those calories! Make sure you're hitting your protein target tonight so your body has the fuel to grow.`;
        } else {
          comment = `Your activity levels look perfect for muscle growth, ${name}. By keeping your cardio and step count moderate (${data.steps.toLocaleString()} steps), you're conserving energy to lift heavier and recover faster. Focus on the weights today.`;
        }
      } else {
        comment = `Great check-in, ${name}. ${data.steps.toLocaleString()} steps and a resting HR of ${data.heartRate} BPM shows a solid baseline of cardiovascular health. Let's hit the protocol hard today and keep improving that conditioning.`;
      }
      
      setAiInsight(comment);
    }, 1200);
  };

  const currentWorkoutDay = plan.workoutPlan.exercises[activeDayIndex];
  const currentDietDay = plan.dietPlan.dailyPlans[activeDayIndex];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 container mx-auto max-w-6xl">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-primary uppercase font-mono">
            {plan.name || "Your Protocol"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome back to your personalized command center.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button asChild variant="secondary" className="gap-2 border border-border rounded-xl flex-1 md:flex-none">
            <Link href="/check-in">
              <Activity className="w-4 h-4 text-primary" />
              Weekly Check-In
            </Link>
          </Button>
          
          <Button asChild className="gap-2 rounded-xl shadow-lg shadow-primary/20 flex-1 md:flex-none">
            <Link href="/workout">
              <Play className="w-4 h-4" fill="currentColor" />
              Start Workout
            </Link>
          </Button>
        </div>
      </div>

      {/* 🚀 AI INSIGHT BUBBLE (Only shows when data is synced) */}
      {aiInsight && (
        <div className="mb-10 bg-primary/5 border border-primary/20 rounded-3xl p-6 flex gap-4 items-start shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
          <div className="w-12 h-12 rounded-full border-2 border-primary/50 flex items-center justify-center bg-background shadow-md shrink-0 overflow-hidden relative">
            <div className={`absolute inset-0 bg-primary/20 ${isTyping ? 'animate-pulse' : ''}`} />
            <img src="ai-avatar.png" alt="Apex AI" className="w-full h-full object-cover p-1 relative z-10" />
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-sm text-foreground">Apex AI Insight</h4>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {displayedInsight}
              {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse" />}
            </p>
          </div>
        </div>
      )}

      {/* BENTO BOX SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Primary Goal</p>
            <p className="text-lg font-bold capitalize">{plan.userStats.goal}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Flame className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Daily Target</p>
            <p className="text-lg font-bold">{plan.dietPlan.dailyCalories} kcal</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Experience</p>
            <p className="text-lg font-bold capitalize">{plan.userStats.level}</p>
          </div>
        </div>
      </div>

      {/* DAY SELECTOR TABS */}
      <div className="mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-2">
          {plan.workoutPlan.exercises.map((dayData, idx) => (
            <button
              key={idx}
              onClick={() => setActiveDayIndex(idx)}
              className={`px-6 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                activeDayIndex === idx
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {dayData.day}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* LEFT COLUMN: WORKOUT (Takes up 3/5 of the grid) */}
        <section className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Dumbbell className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Today's Protocol</h2>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
            {currentWorkoutDay && currentWorkoutDay.routines.length > 0 ? (
              <div className="space-y-4">
                {currentWorkoutDay.routines.map((routine, rIdx) => (
                  <div key={rIdx} className="bg-background rounded-2xl p-5 border border-border/50 flex flex-col sm:flex-row justify-between gap-4 group hover:border-primary/30 transition-colors">
                    <div>
                      <h4 className="font-bold text-lg">{routine.name}</h4>
                      <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-accent/50 rounded-md">
                        <span className="text-sm font-bold text-primary">
                          {routine.sets} Sets
                        </span>
                        <span className="text-muted-foreground text-sm">×</span>
                        <span className="text-sm font-bold text-primary">
                          {routine.reps} Reps
                        </span>
                      </div>
                      {routine.description && (
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                          {routine.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-start sm:justify-end mt-2 sm:mt-0">
                      <QuickAdaptButton 
                        planId={plan._id} 
                        day={currentWorkoutDay.day} 
                        exerciseName={routine.name} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Rest day or no exercises logged for this day.</p>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: HEALTH, NUTRITION & HYDRATION */}
        <section className="lg:col-span-2 space-y-6">
          
          {/* 📱 HEALTH SYNC COMPONENT WITH ONSYNC PROP */}
          <div className="mb-2">
            <HealthSyncCard onSync={handleHealthSync} />
            
            {/* 🔔 NEW: NOTIFICATION COMPONENT */}
            <ApexMotivationCard />
          </div>

          {/* 💧 WATER TRACKER */}
          <div className="mb-8">
            <WaterTracker />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Utensils className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Fuel Guide</h2>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
            {currentDietDay && currentDietDay.meals.length > 0 ? (
              <div className="space-y-4">
                {currentDietDay.meals.map((meal, mIdx) => (
                  <div key={mIdx} className="p-4 bg-background rounded-2xl border border-border/50 flex flex-col gap-2">
                    <span className="font-bold text-xs tracking-wider uppercase text-primary">
                      {meal.name}
                    </span>
                    <span className="text-sm font-medium leading-relaxed">
                      {meal.foods.join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No meal data available for this day.</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}