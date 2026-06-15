import { query } from "./_generated/server";

export const getGlobalUserList = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Access Denied: Unauthenticated configuration request.");
    }

    const allPlans = await ctx.db.query("plans").collect();

    return allPlans.map((plan) => ({
      id: plan._id,
      userId: plan.userId,
      protocolName: plan.name || "Alpha Protocol",
      goal: plan.userStats?.goal || "General Fitness",
      level: plan.userStats?.level || "Not Specified", // Fixed: changed from gender to level
      daysCount: plan.workoutPlan?.exercises?.length || 0,
    }));
  },
});