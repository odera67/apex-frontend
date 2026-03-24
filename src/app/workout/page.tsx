"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Components
import ActiveWorkout from "@/components/ActiveWorkout";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

export default function WorkoutPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // 1. Fetch the user's plans
  const allPlans = useQuery(
    api.plans.getUserPlans,
    user?.id ? { userId: user.id } : "skip"
  );

  // 2. Find the active plan
  const activePlan = allPlans?.find((p) => p.isActive);

  // 3. Fallback calendar day string
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  // 4. PRO WORKOUT FINDER: Based on plan age, not calendar days!
  const exercises = activePlan?.workoutPlan?.exercises || [];
  let todaysWorkout = null;

  if (activePlan && exercises.length > 0) {
    // Convex automatically provides _creationTime. Fallback to Date.now() just in case.
    const creationTime = activePlan._creationTime || Date.now();
    
    // Normalize both dates to midnight so we only calculate actual day rollovers
    const startOfCreationDay = new Date(creationTime).setHours(0, 0, 0, 0);
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    
    // Calculate difference in milliseconds, then convert to days
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysSinceStart = Math.round((startOfToday - startOfCreationDay) / msPerDay);
    
    // Use modulo (%) so if they are on Day 8 of a 7-day plan, it loops back to Day 1
    const currentDayIndex = Math.max(0, daysSinceStart) % exercises.length;
    
    todaysWorkout = exercises[currentDayIndex];
  }

  // Determine the display name (Use the AI's name like "Day 1", or fallback to today's name)
  const displayDayName = todaysWorkout?.day || todayName;

  // --- HANDLERS ---
  const handleFinish = () => {
    // When they finish, send them back to the dashboard or profile
    router.push("/dashboard");
  };

  // --- LOADING STATE ---
  if (!isLoaded || allPlans === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  // --- NO ACTIVE PLAN STATE ---
  if (!activePlan) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold mb-2">No Active Plan</h2>
        <p className="text-muted-foreground mb-6">You need to generate a plan before working out.</p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  // --- REST DAY STATE ---
  if (!todaysWorkout || !todaysWorkout.routines || todaysWorkout.routines.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold mb-2">Rest Day! 🛋️</h2>
        <p className="text-muted-foreground mb-6">You don't have any exercises scheduled for {displayDayName}.</p>
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  // --- ACTIVE WORKOUT STATE ---
  return (
    <section className="relative z-10 pt-24 pb-32 flex-grow container mx-auto px-4 min-h-screen">
      <div className="max-w-md mx-auto mb-6">
        <Button asChild variant="ghost" className="hover:bg-transparent hover:text-primary pl-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="size-4" /> Cancel Workout
          </Link>
        </Button>
      </div>

      <ActiveWorkout 
        dayName={displayDayName} 
        exercises={todaysWorkout.routines} 
        onFinishWorkout={handleFinish} 
      />
    </section>
  );
}