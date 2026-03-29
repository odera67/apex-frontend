"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Bell, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function ApexMotivationCard() {
  const [status, setStatus] = useState<"loading" | "active" | "denied">("loading");

  useEffect(() => {
    const setupAutomaticNotifications = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        
        // If testing on the web, just show as active to keep the UI clean
        if (!Capacitor.isNativePlatform()) {
          setStatus("active");
          return; 
        }

        const { LocalNotifications } = await import('@capacitor/local-notifications');
        
        // 1. Automatically check and request permission on app load
        let permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display !== 'granted') {
          permStatus = await LocalNotifications.requestPermissions();
        }

        if (permStatus.display !== 'granted') {
          setStatus("denied");
          toast.error("Please enable notifications in your Android settings to get reminders.");
          return;
        }

        // 2. Clear out any old test notifications to start fresh
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }

        // 3. 🚀 Schedule the Continuous Daily Alarms (8 AM, 2 PM, 5 PM)
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 1,
              title: "Apex AI: Morning Briefing",
              body: "Time to wake up and execute. Let's crush today's protocol.",
              schedule: { on: { hour: 8, minute: 0 }, allowWhileIdle: true }, // 8:00 AM
            },
            {
              id: 2,
              title: "Apex AI: Midday Check",
              body: "It's 2:00 PM. Have you hit your water and meal goals yet?",
              schedule: { on: { hour: 14, minute: 0 }, allowWhileIdle: true }, // 2:00 PM
            },
            {
              id: 3,
              title: "Apex AI: Evening Review",
              body: "It's 5:00 PM. Time to log your final stats and check in for the day.",
              schedule: { on: { hour: 17, minute: 0 }, allowWhileIdle: true }, // 5:00 PM
            }
          ]
        });

        setStatus("active");
      } catch (error) {
        console.error("Auto-Notification Error:", error);
        setStatus("denied");
      }
    };

    setupAutomaticNotifications();
  }, []); // The empty array [] means this runs instantly when the dashboard loads!

  // Don't show anything while it's thinking
  if (status === "loading") return null;

  return (
    <Card className="p-5 border-border shadow-sm bg-card mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">Apex AI Alerts</h3>
            <p className="text-xs text-muted-foreground">
              {status === "active" ? "Daily reminders are active" : "Notifications blocked"}
            </p>
          </div>
        </div>
        
        {/* Status Indicator instead of a Button */}
        <div className={`flex items-center text-sm font-bold ${status === 'active' ? 'text-primary' : 'text-destructive'}`}>
          {status === "active" ? (
            <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Running</>
          ) : (
            <><ShieldAlert className="w-4 h-4 mr-1.5" /> Disabled</>
          )}
        </div>
      </div>
    </Card>
  );
}