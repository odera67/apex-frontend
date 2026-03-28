"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function ApexMotivationCard() {
  const [isScheduled, setIsScheduled] = useState(false);

  // Check if the notification is already scheduled when the component loads
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const pending = await LocalNotifications.getPending();
          // We are using ID 1 for our morning motivation
          if (pending.notifications.some(n => n.id === 1)) {
            setIsScheduled(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkStatus();
  }, []);

  const enableMotivation = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        
        // 1. Request Native Permissions
        let permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display !== 'granted') {
          permStatus = await LocalNotifications.requestPermissions();
        }

        if (permStatus.display !== 'granted') {
          toast.error("Notification permissions denied in your phone settings.");
          return;
        }

        // 2. Schedule the Daily 8:00 AM Notification
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "Apex AI",
              body: "Time to wake up and execute. You've got goals to crush today. Let's go!",
              id: 1,
              schedule: { 
                on: { hour: 8, minute: 0 }, // Repeats every day at 8:00 AM
                allowWhileIdle: true // Delivers even if phone is in low-power mode
              },
            }
          ]
        });

        setIsScheduled(true);
        toast.success("Morning motivation enabled! See you at 8 AM.");
      } else {
        // 🌐 WEB BROWSER FALLBACK (For testing on your computer)
        if ("Notification" in window) {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            setIsScheduled(true);
            toast.success("Web notifications enabled!");
            // Send a test ping immediately so you can see it work on Desktop
            new Notification("Apex AI", { 
              body: "Time to wake up and execute. You've got goals to crush today. Let's go!",
              icon: "/favicon.ico" // Uses your app's favicon
            });
          } else {
            toast.error("Web notifications denied.");
          }
        } else {
          toast.error("Notifications not supported in this browser.");
        }
      }
    } catch (error) {
      console.error("Notification Error:", error);
      toast.error("Failed to enable notifications.");
    }
  };

  return (
    <Card className="p-5 border-border shadow-sm bg-card mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">Morning Briefing</h3>
            <p className="text-xs text-muted-foreground">Daily lock-screen nudge</p>
          </div>
        </div>
        
        <Button 
          variant={isScheduled ? "outline" : "default"} 
          size="sm" 
          onClick={enableMotivation}
          disabled={isScheduled}
          className={`rounded-full h-8 text-xs font-semibold ${isScheduled ? 'border-primary/50 text-primary' : ''}`}
        >
          {isScheduled ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> : <MessageSquare className="w-3.5 h-3.5 mr-1.5" />}
          {isScheduled ? "Enabled" : "Turn On"}
        </Button>
      </div>
    </Card>
  );
}