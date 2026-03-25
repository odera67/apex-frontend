// convex/users.ts
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * 1. For Frontend: Syncs the Clerk user when they log in.
 * This ensures the database always has the latest info if they sign in from the browser.
 */
export const syncUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Could not sync user: Not authenticated");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    const userData = {
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "",
      clerkId: identity.subject,
      imageUrl: identity.pictureUrl,
    };

    if (existingUser) {
      await ctx.db.patch(existingUser._id, userData);
      return existingUser._id;
    }
    return await ctx.db.insert("users", userData);
  },
});

/**
 * 2. Helper query: Gets the current logged-in user's profile.
 * Use this in your React components to display their name/avatar.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

/**
 * 3. For Webhooks: Secure internal mutation to CREATE or UPDATE a user.
 * Only the Convex server (via http.ts) can call this.
 */
export const upsertFromWebhook = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
    });
  },
});

/**
 * 4. For Webhooks: Secure internal mutation to DELETE a user.
 * Called when a user deletes their account in Clerk.
 */
export const deleteFromWebhook = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      await ctx.db.delete(existingUser._id);
      
      // Note: If you want to automatically delete their fitness plans 
      // when they delete their account, you would add that logic right here!
    }
  },
});