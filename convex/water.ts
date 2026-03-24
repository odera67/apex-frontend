import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 🔍 Fetch today's water intake
export const getTodayWater = query({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("waterLogs")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();
  },
});

// 💧 Add water to today's log
export const logWater = mutation({
  args: { 
    userId: v.string(), 
    date: v.string(), 
    amount: v.number() // How many ml to add (e.g., 250)
  },
  handler: async (ctx, args) => {
    const existingLog = await ctx.db
      .query("waterLogs")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (existingLog) {
      // If they already drank water today, add to the total
      await ctx.db.patch(existingLog._id, { 
        amount: existingLog.amount + args.amount 
      });
    } else {
      // First glass of the day! Create a new record.
      await ctx.db.insert("waterLogs", {
        userId: args.userId,
        date: args.date,
        amount: args.amount,
      });
    }
  },
});