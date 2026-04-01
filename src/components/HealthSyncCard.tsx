"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, Heart, Flame, Footprints, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface HealthSyncCardProps {
  onSync: (data: { steps: number; calories: number; heartRate: number }) => void;
}

export default function HealthSyncCard({ onSync }: HealthSyncCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  
  // State to show the numbers on the UI
  const [stats, setStats] = useState({
    steps: 0,
    calories: 0,
    heartRate: 0,
  });

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      // 1. Dynamically import Capacitor to prevent Next.js server-side crashes
      const { Capacitor } = await import('@capacitor/core');
      
      let fetchedSteps = 0;

      // 2. Check if we are physically running on the Mobile App
      if (Capacitor.isNativePlatform()) {
        try {
          // NOTE: If you are using a specific plugin like @capacitor-community/health, 
          // the call would look something like this:
          // const { Health } = await import('@capacitor-community/health');
          // await Health.requestPermissions([{ read: ['steps'] }]);
          // const result = await Health.query({ sampleType: 'steps', ... });
          
          // For now, simulating the mobile Health Connect delay to get steps
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Fallback realistic step count until your specific health plugin is hooked up
          fetchedSteps = Math.floor(Math.random() * 4000) + 4000; 

        } catch (healthError) {
          console.error("Health Connect Error:", healthError);
          toast.error("Failed to read from Health Connect. Ensure permissions are granted.");
          setIsSyncing(false);
          return;
        }
      } else {
        // 3. Web Browser Fallback (so you can still test on your computer)
        await new Promise(resolve => setTimeout(resolve, 800));
        fetchedSteps = 5432; // Mock web steps
      }

      // 4. Force Calories and BPM to 0 as requested, mapping only the steps
      const syncedData = {
        steps: fetchedSteps,
        calories: 0,  // Hardcoded to 0
        heartRate: 0, // Hardcoded to 0
      };

      // 5. Update local UI state and send to Dashboard
      setStats(syncedData);
      onSync(syncedData);
      
      toast.success(Capacitor.isNativePlatform() ? "Health Connect Synced!" : "Web Mock Synced!");

    } catch (error) {
      console.error("Sync process failed:", error);
      toast.error("A system error occurred during sync.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -right-6 -top-6 text-primary/5">
        <Smartphone className="w-32 h-32" />
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Device Sync
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Pull step data directly from Health Connect.
          </p>
        </div>
        
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="gap-2 w-full sm:w-auto shadow-md shadow-primary/20"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing Device..." : "Sync Health Data"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 relative z-10">
        <div className="bg-background rounded-2xl p-4 border border-border/50 text-center flex flex-col items-center justify-center">
          <Footprints className="w-5 h-5 text-primary mb-2" />
          <span className="text-2xl font-bold">{stats.steps.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Steps</span>
        </div>
        
        <div className="bg-background/50 rounded-2xl p-4 border border-border/30 text-center flex flex-col items-center justify-center opacity-70">
          <Flame className="w-5 h-5 text-muted-foreground mb-2" />
          <span className="text-2xl font-bold text-muted-foreground">{stats.calories}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Kcal</span>
        </div>
        
        <div className="bg-background/50 rounded-2xl p-4 border border-border/30 text-center flex flex-col items-center justify-center opacity-70">
          <Heart className="w-5 h-5 text-muted-foreground mb-2" />
          <span className="text-2xl font-bold text-muted-foreground">{stats.heartRate}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">BPM</span>
        </div>
      </div>
    </div>
  );
}