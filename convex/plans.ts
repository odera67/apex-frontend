import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ==========================================
// 🚀 CREATING A PLAN
// ==========================================
export const createPlan = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    isActive: v.boolean(),

    userStats: v.object({
      age: v.string(),
      height: v.string(),
      weight: v.string(),
      level: v.string(),
      goal: v.string(),
      equipment: v.optional(v.string()), 
      allergies: v.optional(v.string()), 
      injuries: v.optional(v.string()),  
      injuriesDetected: v.optional(v.array(v.string())), // 🚀 NEW: Match Schema
    }),

    workoutPlan: v.object({
      schedule: v.optional(v.array(v.string())),
      exercises: v.array(
        v.object({
          day: v.string(),
          routines: v.array(
            v.object({
              name: v.string(),
              sets: v.number(),
              reps: v.string(),
              description: v.optional(v.string()),
            })
          ),
        })
      ),
    }),

    dietPlan: v.object({
      dailyCalories: v.number(),
      dailyPlans: v.array(
        v.object({
          day: v.string(),
          meals: v.array(
            v.object({
              name: v.string(),
              foods: v.array(v.string()),
            })
          ),
        })
      ),
    }),
  },

  handler: async (ctx, args) => {
    const activePlans = await ctx.db
      .query("plans")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const plan of activePlans) {
      await ctx.db.patch(plan._id, { isActive: false });
    }

    const initialWeight = parseFloat(args.userStats.weight.replace(/[^\d.]/g, '')) || 0;
    
    const newPlanData = {
      ...args,
      streak: 1, 
      weightHistory: [
        {
          date: new Date().toISOString().split("T")[0],
          weight: initialWeight,
        }
      ],
    };

    const planId = await ctx.db.insert("plans", newPlanData);
    return planId;
  },
});

// ==========================================
// 🔍 FETCHING PLANS
// ==========================================
export const getUserPlans = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plans")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc") 
      .collect();
  },
});

export const getLatestUserPlan = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plans")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc") 
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

export const getUserPlan = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plans")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
  },
});

// ==========================================
// 🔄 UPDATING & CHECK-IN
// ==========================================
export const updatePlan = mutation({
  args: {
    planId: v.id("plans"),
    newWeight: v.optional(v.string()),
    updatedWorkoutPlan: v.optional(
      v.object({
        schedule: v.optional(v.array(v.string())),
        exercises: v.array(
          v.object({
            day: v.string(),
            routines: v.array(
              v.object({
                name: v.string(),
                sets: v.number(),
                reps: v.string(),
                description: v.optional(v.string()),
              })
            ),
          })
        ),
      })
    ),
    updatedDietPlan: v.optional(
      v.object({
        dailyCalories: v.number(),
        dailyPlans: v.array(
          v.object({
            day: v.string(),
            meals: v.array(
              v.object({
                name: v.string(),
                foods: v.array(v.string()),
              })
            ),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existingPlan = await ctx.db.get(args.planId);
    if (!existingPlan) throw new Error("Plan not found");

    const updates: any = {};

    if (args.newWeight !== undefined) {
      updates.userStats = {
        ...existingPlan.userStats,
        weight: args.newWeight,
      };

      const parsedWeight = parseFloat(args.newWeight.replace(/[^\d.]/g, '')) || 0;
      const weightHistory = existingPlan.weightHistory || [];
      
      weightHistory.push({
        date: new Date().toISOString().split("T")[0],
        weight: parsedWeight,
      });

      updates.weightHistory = weightHistory;
      updates.streak = (existingPlan.streak || 1) + 1;
    }

    if (args.updatedWorkoutPlan !== undefined) {
      updates.workoutPlan = args.updatedWorkoutPlan;
    }

    if (args.updatedDietPlan !== undefined) {
      updates.dietPlan = {
        ...existingPlan.dietPlan,
        dailyCalories: args.updatedDietPlan.dailyCalories,
        dailyPlans: args.updatedDietPlan.dailyPlans,
      };
    }

    await ctx.db.patch(args.planId, updates);
  },
});

// ==========================================
// ❌ DELETING & SWAPPING
// ==========================================
export const deletePlan = mutation({
  args: { id: v.id("plans") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const swapExercise = mutation({
  args: {
    planId: v.id("plans"),
    dayName: v.string(), 
    oldExerciseName: v.string(), 
    newExercise: v.optional(
      v.object({
        name: v.string(),
        sets: v.number(),
        reps: v.string(),
        description: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    if (!args.newExercise) {
      console.warn("No new exercise provided to swap with.");
      return; 
    }

    const updatedExercises = plan.workoutPlan.exercises.map((dayData: any) => {
      if (dayData.day !== args.dayName) return dayData;

      return {
        ...dayData,
        routines: dayData.routines.map((routine: any) => 
          routine.name === args.oldExerciseName ? args.newExercise : routine
        ),
      };
    });

    await ctx.db.patch(args.planId, {
      workoutPlan: {
        ...plan.workoutPlan,
        exercises: updatedExercises,
      },
    });
  },
});