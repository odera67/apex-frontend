// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 👤 User Profile Table: Stores the core Clerk identity
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(), // Changed to required to match identity.name sync
    imageUrl: v.optional(v.string()),
  }).index("by_clerk_id", ["clerkId"]),

  // 📋 Fitness Plans Table: Contains the generated AI plans
  plans: defineTable({
    userId: v.string(),
    isActive: v.boolean(),
    name: v.optional(v.string()), 
    
    // 👇 FIXED: Made streak and weightHistory optional for newly generated plans
    streak: v.optional(v.number()),
    weightHistory: v.optional(
      v.array(
        v.object({
          date: v.string(),
          weight: v.number(),
        })
      )
    ),
    
    userStats: v.object({
      age: v.string(),
      height: v.string(),
      weight: v.string(),
      level: v.string(),
      goal: v.string(),
      equipment: v.optional(v.string()),
      allergies: v.optional(v.string()), 
      injuries: v.optional(v.string()),   
      injuriesDetected: v.optional(v.array(v.string())),
    }),
    workoutPlan: v.object({
      name: v.optional(v.string()),
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
  }).index("by_userId", ["userId"]),

  // 🏋️ Workout Logs Table: Tracks individual sets and reps
  workoutLogs: defineTable({
    userId: v.string(),
    exerciseName: v.string(),
    weight: v.number(),
    reps: v.number(),
    setNumber: v.number(),
  })
    .index("by_user_exercise", ["userId", "exerciseName"])
    .index("by_userId", ["userId"]),

  // 💧 Water Tracking Table: Tracks hydration by date
  waterLogs: defineTable({
    userId: v.string(),
    date: v.string(), 
    amount: v.number(), 
  }).index("by_user_date", ["userId", "date"]),
});