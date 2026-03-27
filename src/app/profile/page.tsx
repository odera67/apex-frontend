"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel"; 
import { useState, useRef } from "react";
import Link from "next/link"; 
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Components
import ProfileHeader from "@/components/ProfileHeader";
import NoFitnessPlan from "@/components/NoFitnessPlan";
import CornerElements from "@/components/CornerElements";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area"; 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";

// Icons
import { 
  Apple, 
  CalendarDays, 
  Dumbbell, 
  Flame, 
  Loader2, 
  Trophy,
  Trash2,
  Download,
  LayoutDashboard, 
  Activity,
  TrendingDown,
  PlayCircle // 🚀 ADDED PLAY ICON
} from "lucide-react";
import { toast } from "sonner"; 

const ProfilePage = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const userId = user?.id;

  // --- DATA FETCHING & MUTATIONS ---
  const allPlans = useQuery(
    api.plans.getUserPlans,
    userId ? { userId } : "skip"
  );
  
  const deletePlanMutation = useMutation(api.plans.deletePlan);
  const updatePlanMutation = useMutation(api.plans.updatePlan);

  // --- STATE ---
  const [selectedPlanId, setSelectedPlanId] = useState<Id<"plans"> | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // --- DERIVED STATE ---
  const activePlan = allPlans?.find((plan) => plan.isActive);
  const currentPlan = selectedPlanId
    ? allPlans?.find((plan) => plan._id === selectedPlanId)
    : activePlan || (allPlans && allPlans.length > 0 ? allPlans[0] : null);

  // Safely extract Diet, Workout plans, and Stats
  const currentDiet = (currentPlan as any)?.dietPlan || null;
  const currentWorkout = (currentPlan as any)?.workoutPlan || null;
  const userEquipment = (currentPlan as any)?.userStats?.equipment || "Not specified";
  
  // Extract Gamification Data
  const streak = currentPlan?.streak || 0;
  const weightHistory = currentPlan?.weightHistory || [];

  const workoutDays = currentWorkout?.exercises || [];
  const dietDays = currentDiet?.dailyPlans || [];

  // --- HANDLERS ---
  const handleConfirmDelete = async (planId: Id<"plans">, planName: string) => {
    try {
      await deletePlanMutation({ id: planId });
      toast.success(`"${planName}" deleted successfully`);
      
      if (selectedPlanId === planId) setSelectedPlanId(null);
      setOpenPopoverId(null); 
    } catch (error) {
      console.error("Failed to delete plan:", error);
      toast.error("Failed to delete plan");
    }
  };

  const handleUpdatePlan = async (newWorkoutData: any, newDietData: any) => {
    if (!currentPlan) return;
    
    setIsUpdating(true);
    const loadingToast = toast.loading("Updating your plan with AI...");

    try {
      await updatePlanMutation({
        planId: currentPlan._id,
        updatedWorkoutPlan: newWorkoutData,
        updatedDietPlan: newDietData,
      });
      toast.success("Plan updated successfully!", { id: loadingToast });
    } catch (error) {
      console.error("Failed to update plan:", error);
      toast.error("Failed to apply new AI updates.", { id: loadingToast });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) {
      toast.error("Nothing to download!");
      return;
    }

    const loadingToast = toast.loading("Generating your PDF...");

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const filename = currentPlan ? `${(currentPlan.name || "My_Plan").replace(/\s+/g, '_')}_AI_Plan.pdf` : "My_Fitness_Plan.pdf";

      const opt = {
        margin:       10,
        filename:     filename,
        image:        { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'mm' as 'mm', format: 'a4' as 'a4', orientation: 'portrait' as 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success("PDF downloaded successfully!", { id: loadingToast });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF.", { id: loadingToast });
    }
  };

  // --- LOADING STATE ---
  if (!isUserLoaded || allPlans === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="relative z-10 pt-24 pb-32 grow container mx-auto px-4 min-h-screen">
      <ProfileHeader user={user} />

      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-8">
        <Button asChild variant="outline" className="border-primary/50 text-primary hover:text-white hover:bg-primary/20 transition-all">
          <Link href="/dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="size-4" />
            <span>Go to Dashboard</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-primary/50 text-primary hover:text-white hover:bg-primary/20 transition-all">
          <Link href="/check-in" className="flex items-center gap-2">
            <Activity className="size-4" />
            <span>Weekly Check-In</span>
          </Link>
        </Button>
      </div>

      {allPlans && allPlans.length > 0 ? (
        <div className="space-y-8 mt-10">
          
          {/* --- PLAN SELECTOR --- */}
          <div className="relative backdrop-blur-md bg-background/40 border border-white/10 p-6 rounded-xl overflow-hidden shadow-sm">
            <CornerElements />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Trophy className="text-primary size-6" />
                <span>Fitness Plans</span>
              </h2>
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-mono font-bold">
                {allPlans.length} AVAILABLE
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {allPlans.map((plan) => {
                const isSelected = currentPlan?._id === plan._id;
                
                return (
                  <div key={plan._id} className="group relative">
                    <Button
                      onClick={() => setSelectedPlanId(plan._id)}
                      variant="outline"
                      className={`h-auto py-2 px-4 border transition-all duration-200 pr-9 ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                          : "bg-background/50 border-border hover:border-primary/50 text-muted-foreground"
                      }`}
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className="font-semibold text-sm">{plan.name || "My Fitness Plan"}</span>
                        {plan.isActive && (
                          <span className="text-[10px] uppercase opacity-90 font-mono mt-0.5">
                            • Active Plan
                          </span>
                        )}
                      </div>
                    </Button>

                    <Popover open={openPopoverId === plan._id} onOpenChange={(isOpen) => setOpenPopoverId(isOpen ? plan._id : null)}>
                      <PopoverTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute top-1.5 right-1.5 p-1.5 rounded-md transition-all duration-200 ${
                            isSelected 
                              ? "text-primary-foreground/70 hover:bg-white/20 hover:text-white" 
                              : "text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="center" side="right">
                        <div className="space-y-3">
                          <h4 className="font-medium leading-none text-sm">Delete this plan?</h4>
                          <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                          <div className="flex justify-end gap-2 pt-1">
                            <Button 
                              variant="outline" size="sm" className="h-7 text-xs"
                              onClick={(e) => { e.stopPropagation(); setOpenPopoverId(null); }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              variant="destructive" size="sm" className="h-7 text-xs"
                              onClick={(e) => { e.stopPropagation(); handleConfirmDelete(plan._id, plan.name || "My Fitness Plan"); }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- PLAN DETAILS --- */}
          {currentPlan ? (
            <div className="relative bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 shadow-xl">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-border/50">
                <div>
                  <h3 className="text-3xl font-bold text-foreground mb-2">{currentPlan.name || "My Fitness Plan"}</h3>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                      <CalendarDays className="size-4 text-primary" /> Generated Strategy
                    </p>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                      <Dumbbell className="size-4 text-primary" /> 
                      Equipment: <span className="font-medium text-foreground capitalize">{userEquipment}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                  <Button 
                    onClick={handleDownloadPdf}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 h-full py-3"
                  >
                    <Download className="size-4" />
                    <span className="hidden sm:inline">Save PDF</span>
                  </Button>

                  <div className="px-4 py-2 bg-background/60 rounded-lg border border-border flex flex-col items-center justify-center min-w-25">
                    <span className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1">
                      <Flame className="size-3 text-orange-500" /> Streak
                    </span>
                    <span className="text-xl font-bold text-orange-500">{streak}</span>
                  </div>

                  <div className="px-4 py-2 bg-background/60 rounded-lg border border-border flex flex-col items-center justify-center min-w-25">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Days/Wk</span>
                    <span className="text-xl font-bold text-primary">{workoutDays.length}</span>
                  </div>
                  
                  <div className="px-4 py-2 bg-background/60 rounded-lg border border-border flex flex-col items-center justify-center min-w-25">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Calories</span>
                    <span className="text-xl font-bold text-green-500">{currentDiet?.dailyCalories || 0}</span>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="progress" className="w-full">
                <TabsList className="mb-6 w-full grid grid-cols-3 p-1 bg-muted/40 rounded-xl h-12">
                  <TabsTrigger value="progress" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-blue-500 data-[state=active]:shadow-sm h-full font-bold transition-all">
                    <TrendingDown className="mr-2 size-4" /> Progress
                  </TabsTrigger>
                  <TabsTrigger value="workout" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm h-full font-bold transition-all">
                    <Dumbbell className="mr-2 size-4" /> Workout
                  </TabsTrigger>
                  <TabsTrigger value="diet" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-green-500 data-[state=active]:shadow-sm h-full font-bold transition-all">
                    <Apple className="mr-2 size-4" /> Nutrition
                  </TabsTrigger>
                </TabsList>

                {/* PROGRESS TAB */}
                <TabsContent value="progress" className="animate-in fade-in-50">
                  <div className="bg-background/40 rounded-xl border border-border/50 p-6 overflow-hidden">
                    <div className="flex items-center gap-2 mb-6">
                      <TrendingDown className="size-5 text-blue-500" />
                      <h4 className="font-bold text-lg">Weight Tracker</h4>
                    </div>
                    
                    {weightHistory.length > 0 ? (
                      <div className="h-100 w-full min-h-100">
                        <ResponsiveContainer width="100%" height="100%" minHeight={400} minWidth={300}>
                          <LineChart 
                            data={weightHistory} 
                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.2} />
                            <XAxis 
                              dataKey="date" 
                              stroke="#888" 
                              fontSize={12} 
                              tickMargin={10} 
                            />
                            <YAxis 
                              stroke="#888" 
                              fontSize={12} 
                              domain={['auto', 'auto']} 
                              tickFormatter={(value) => `${value}kg`} 
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                borderColor: 'hsl(var(--border))', 
                                borderRadius: '8px',
                                color: 'hsl(var(--foreground))'
                              }} 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="weight" 
                              stroke="#3b82f6" 
                              strokeWidth={3} 
                              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2 }} 
                              activeDot={{ r: 6, fill: '#2563eb' }} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="p-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/10">
                        <TrendingDown className="size-10 text-muted-foreground mb-3 opacity-30" />
                        <p className="text-muted-foreground italic max-w-sm">
                          No weight history recorded yet. Complete a weekly check-in to see your chart populate!
                        </p>
                        <Button asChild variant="outline" className="mt-4">
                          <Link href="/check-in">Go to Check-In</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* WORKOUT TAB */}
                <TabsContent value="workout" className="animate-in fade-in-50">
                  <div className="bg-background/40 rounded-xl border border-border/50 overflow-hidden">
                    <div className="p-4 bg-muted/30 border-b flex items-center gap-2">
                      <CalendarDays className="size-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Weekly Structure: {workoutDays.length} Days
                      </span>
                    </div>

                    <ScrollArea className="h-125 w-full p-4">
                      {workoutDays.length > 0 ? (
                        <Accordion type="single" collapsible className="space-y-4 pr-4">
                          {workoutDays.map((exerciseDay: any, index: number) => (
                            <AccordionItem key={index} value={`day-${index}`} className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
                              <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4 text-left w-full">
                                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                                    {index + 1}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-lg">{exerciseDay.day}</span>
                                    <span className="text-xs text-muted-foreground font-mono uppercase">
                                      {exerciseDay.routines?.length || 0} Exercises
                                    </span>
                                  </div>
                                </div>
                              </AccordionTrigger>

                              <AccordionContent className="p-0">
                                <div className="flex flex-col divide-y divide-border/50">
                                  {exerciseDay.routines?.length > 0 ? (
                                    exerciseDay.routines.map((routine: any, rIndex: number) => (
                                      <div key={rIndex} className="p-4 bg-background/50 hover:bg-background transition-colors flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
                                        
                                        {/* 🚀 ADDED YOUTUBE WATCH BUTTON HERE */}
                                        <div className="flex-1">
                                          <div className="flex flex-wrap items-center gap-3">
                                            <h4 className="font-semibold text-base">{routine.name}</h4>
                                            <a 
                                              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(routine.name + ' exercise form tutorial')}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-all text-xs font-bold border border-primary/20"
                                              title={`Watch tutorial for ${routine.name}`}
                                            >
                                              <PlayCircle className="size-3.5" />
                                              Watch Tutorial
                                            </a>
                                          </div>
                                          {routine.description && (
                                            <p className="text-sm text-muted-foreground mt-2 max-w-xl">{routine.description}</p>
                                          )}
                                        </div>

                                        <div className="flex gap-2 shrink-0 flex-wrap sm:flex-nowrap mt-2 sm:mt-0">
                                          <div className="px-3 py-1 rounded bg-muted text-xs font-mono font-bold flex items-center">{routine.sets} SETS</div>
                                          <div className="px-3 py-1 rounded bg-muted text-xs font-mono font-bold flex items-center">{routine.reps} REPS</div>
                                        </div>

                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-6 text-center text-muted-foreground italic">
                                      Rest Day - Recovery is key!
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <div className="p-12 text-center text-muted-foreground">
                          No workout plan data available yet.
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>

                {/* NUTRITION TAB */}
                <TabsContent value="diet" className="animate-in fade-in-50">
                  <div className="bg-background/40 rounded-xl border border-border/50 overflow-hidden">
                    <div className="p-4 bg-green-500/5 border-b border-green-500/10 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Flame className="size-5 text-green-500" />
                        <span className="font-bold text-green-700 dark:text-green-400">Daily Targets</span>
                      </div>
                      <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                        {currentDiet?.dailyCalories || 0} <span className="text-sm text-muted-foreground font-sans font-normal">kcal</span>
                      </div>
                    </div>

                    <ScrollArea className="h-125 w-full p-4">
                      {dietDays.length > 0 ? (
                        <Accordion type="single" collapsible className="space-y-4 pr-4">
                          {dietDays.map((dayPlan: any, dayIndex: number) => (
                            <AccordionItem key={dayIndex} value={`diet-day-${dayIndex}`} className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
                              <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4 text-left w-full">
                                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-500 font-bold text-sm">
                                    <Apple className="size-4" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-lg">{dayPlan.day} Nutrition</span>
                                    <span className="text-xs text-muted-foreground font-mono uppercase">
                                      {dayPlan.meals?.length || 0} Meals
                                    </span>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="p-0">
                                <div className="p-4 space-y-6">
                                  {dayPlan.meals?.map((meal: any, mIndex: number) => (
                                    <div key={mIndex} className="relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-green-500/30 before:rounded-full">
                                      <h4 className="text-lg font-bold mb-3 flex items-center gap-2">{meal.name}</h4>
                                      <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                                        <ul className="space-y-3">
                                          {meal.foods?.map((food: any, fIndex: number) => (
                                            <li key={fIndex} className="flex items-start gap-3 text-sm">
                                              <div className="size-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                              <span className="text-muted-foreground leading-relaxed">
                                                {typeof food === 'string' ? food : JSON.stringify(food)}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <div className="space-y-6">
                          {currentDiet?.meals?.length > 0 ? (
                            currentDiet.meals.map((meal: any, mIndex: number) => (
                              <div key={mIndex} className="relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-green-500/30 before:rounded-full">
                                <h4 className="text-lg font-bold mb-3 flex items-center gap-2">{meal.name}</h4>
                                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                                  <ul className="space-y-3">
                                    {meal.foods?.map((food: any, fIndex: number) => (
                                      <li key={fIndex} className="flex items-start gap-3 text-sm">
                                        <div className="size-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                        <span className="text-muted-foreground leading-relaxed">
                                          {typeof food === 'string' ? food : JSON.stringify(food)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-12 text-center text-muted-foreground">No diet plan data available.</div>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-border rounded-xl bg-muted/10">
              <Dumbbell className="size-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-muted-foreground">Select a plan to view details</h3>
            </div>
          )}
        </div>
      ) : (
        <NoFitnessPlan />
      )}

      {/* PRINTABLE PDF TEMPLATE */}
      <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ left: '-9999px', top: '-9999px' }}>
        <div 
          ref={printRef} 
          className="p-10 font-sans w-200"
          style={{ backgroundColor: "#ffffff", color: "#000000" }} 
        >
          {currentPlan && (
            <>
              <div className="border-b-2 pb-4 mb-8" style={{ borderColor: "#000000" }}>
                <h1 className="text-4xl font-extrabold mb-2">{currentPlan.name || "My Fitness Plan"}</h1>
                <p style={{ color: "#4b5563" }}>Generated AI Fitness & Nutrition Strategy</p>
                <p style={{ color: "#4b5563", marginTop: "4px" }}>
                  <strong>Equipment:</strong> <span style={{ textTransform: "capitalize" }}>{userEquipment}</span>
                </p>
              </div>

              {/* Workout Section */}
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2" style={{ color: "#000000", borderColor: "#d1d5db" }}>
                  🏋️ Workout Schedule
                </h2>
                {workoutDays.map((exerciseDay: any, index: number) => (
                  <div key={index} className="mb-6 break-inside-avoid">
                    <h3 className="text-lg font-bold mb-2 p-2 rounded" style={{ backgroundColor: "#f3f4f6", color: "#000000" }}>
                      {exerciseDay.day}
                    </h3>
                    {exerciseDay.routines?.length > 0 ? (
                      <ul className="list-disc pl-6 space-y-2">
                        {exerciseDay.routines.map((routine: any, rIndex: number) => (
                          <li key={rIndex}>
                            <strong>{routine.name}</strong> — {routine.sets} Sets x {routine.reps} Reps
                            {routine.description && (
                              <p className="text-sm mt-1" style={{ color: "#4b5563" }}>{routine.description}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="italic pl-2" style={{ color: "#6b7280" }}>Rest Day - Recovery is key!</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Diet Section */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4 border-b pb-2" style={{ color: "#000000", borderColor: "#d1d5db" }}>
                  🍎 Nutrition Plan ({currentDiet?.dailyCalories || 0} kcal)
                </h2>
                
                {dietDays.length > 0 ? (
                  dietDays.map((dayPlan: any, dayIndex: number) => (
                    <div key={dayIndex} className="mb-6 break-inside-avoid">
                      <h3 className="text-lg font-bold mb-2 p-2 rounded" style={{ backgroundColor: "#f0fdf4", color: "#14532d" }}>
                        {dayPlan.day}
                      </h3>
                      <div className="space-y-4 pl-2">
                        {dayPlan.meals?.map((meal: any, mIndex: number) => (
                          <div key={mIndex}>
                            <h4 className="font-bold underline">{meal.name}</h4>
                            <ul className="list-disc pl-6 text-sm mt-1">
                              {meal.foods?.map((food: any, fIndex: number) => (
                                <li key={fIndex}>{typeof food === 'string' ? food : JSON.stringify(food)}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : currentDiet?.meals?.length > 0 ? (
                  <div className="space-y-4 pl-2 break-inside-avoid">
                    {currentDiet.meals.map((meal: any, mIndex: number) => (
                      <div key={mIndex}>
                        <h4 className="font-bold underline">{meal.name}</h4>
                        <ul className="list-disc pl-6 text-sm mt-1">
                          {meal.foods?.map((food: any, fIndex: number) => (
                            <li key={fIndex}>{typeof food === 'string' ? food : JSON.stringify(food)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="italic pl-2" style={{ color: "#6b7280" }}>No detailed daily nutrition generated.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;