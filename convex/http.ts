// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Missing CLERK_WEBHOOK_SECRET environment variable");
    }

    const svix_id = request.headers.get("svix-id");
    const svix_signature = request.headers.get("svix-signature");
    const svix_timestamp = request.headers.get("svix-timestamp");

    if (!svix_id || !svix_signature || !svix_timestamp) {
      return new Response("Error: Missing svix headers", { status: 400 });
    }

    const payloadString = await request.text();
    const wh = new Webhook(webhookSecret);
    let evt: any;

    try {
      evt = wh.verify(payloadString, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return new Response("Error: Invalid signature", { status: 400 });
    }

    const eventType = evt.type;

    // Handle user creation and updates
    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, first_name, last_name, image_url, email_addresses } = evt.data;

      const email = email_addresses?.[0]?.email_address || "";
      const name = `${first_name || ""} ${last_name || ""}`.trim() || "New User";

      if (!id) {
        return new Response("Error: Missing user ID", { status: 400 });
      }

      try {
        await ctx.runMutation(internal.users.upsertFromWebhook, {
          email,
          name,
          clerkId: id,
          imageUrl: image_url || "", 
        });
      } catch (error) {
        console.error("Error creating/updating user:", error);
        return new Response("Error creating/updating user", { status: 500 });
      }
    }

    // Handle user deletions
    if (eventType === "user.deleted") {
      const { id } = evt.data;

      if (!id) {
        return new Response("Error: Missing user ID for deletion", { status: 400 });
      }

      try {
        await ctx.runMutation(internal.users.deleteFromWebhook, {
          clerkId: id,
        });
      } catch (error) {
        console.error("Error deleting user:", error);
        return new Response("Error deleting user", { status: 500 });
      }
    }

    return new Response("Webhook processed successfully", { status: 200 });
  }),
});

export default http;