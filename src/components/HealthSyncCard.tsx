"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Activity, Flame, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface HealthSyncCardProps {
  onSync?: (data: { steps: number; calories: number; heartRate: number }) => void;
}

export default function HealthSyncCard({ onSync }: HealthSyncCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [healthData, setHealthData] = useState({ steps: 0, calories: 0, heartRate: 0 });
  const [lastSync, setLastSync] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { HealthConnect } = await import('@devmaxime/capacitor-health-connect');
        
        // 1. Check if Health Connect is available
        const check = await HealthConnect.checkAvailability();
        if (check.availability === 'NotInstalled') {
          toast.error("Google Health Connect is not installed on this device.", { duration: 4000 });
          setIsSyncing(false);
          return;
        }

        // 2. Request Permissions
        await HealthConnect.requestPermissions({
          read: ['Steps' as any, 'ActiveCaloriesBurned' as any, 'HeartRate' as any],
          write: []
        });

        // 3. Get Today's Date Range (Midnight to Now)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = now.toISOString();

        // 4. Fetch Real Data from Android
        const stepsRecord = await HealthConnect.readRecords({ type: 'Steps' as any, start: startOfDay, end: endOfDay });
        const caloriesRecord = await HealthConnect.readRecords({ type: 'ActiveCaloriesBurned' as any, start: startOfDay, end: endOfDay });
        const hrRecord = await HealthConnect.readRecords({ type: 'HeartRate' as any, start: startOfDay, end: endOfDay });

        // 5. Calculate Totals
        const totalSteps = stepsRecord.records.reduce((sum: number, record: any) => sum + record.count, 0);
        const totalCalories = caloriesRecord.records.reduce((sum: number, record: any) => sum + record.energy, 0);
        
        // Get most recent heart rate
        let latestHR = 72; // Default resting HR if no watch is connected
        if (hrRecord.records.length > 0) {
          const lastRecord: any = hrRecord.records[hrRecord.records.length - 1];
          if (lastRecord.samples && lastRecord.samples.length > 0) {
            latestHR = lastRecord.samples[lastRecord.samples.length - 1].beatsPerMinute;
          }
        }

        const newData = { 
          steps: Math.round(totalSteps), 
          calories: Math.round(totalCalories), 
          heartRate: Math.round(latestHR) 
        };
        
        setHealthData(newData);
        if (onSync) onSync(newData);
        setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        toast.success("Real health data synced from Android!");

      } else {
        // 🌐 WEB FALLBACK (For testing on your computer)
        setTimeout(() => {
          const mockData = {
            steps: Math.floor(Math.random() * 3000) + 5000,
            calories: Math.floor(Math.random() * 200) + 300,
            heartRate: Math.floor(Math.random() * 15) + 65
          };
          setHealthData(mockData);
          if (onSync) onSync(mockData);
          setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          toast.success("Web Testing: Mock data generated.");
        }, 1200);
      }
    } catch (error: any) {
      console.error("Health Sync Error:", error);
      // 🔥 THIS IS CRITICAL: It will now show the exact error on your phone screen!
      toast.error(`Sync Failed: ${error.message || JSON.stringify(error)}`, { duration: 6000 });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="p-6 bg-card border-border shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Device Health
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {lastSync ? `Last synced at ${lastSync}` : "Sync with Health Connect"}
          </p>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={isSyncing} 
          size="sm" 
          variant="outline" 
          className="gap-2 rounded-full border-primary/50 text-primary hover:bg-primary/10"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-border/50">
          <Activity className="w-6 h-6 text-blue-500 mb-2" />
          <span className="text-xl font-bold">{healthData.steps.toLocaleString()}</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Steps</span>
        </div>

        <div className="bg-muted/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-border/50">
          <Flame className="w-6 h-6 text-orange-500 mb-2" />
          <span className="text-xl font-bold">{healthData.calories}</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Kcal</span>
        </div>

        <div className="bg-muted/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-border/50">
          <Heart className="w-6 h-6 text-red-500 mb-2" />
          <span className="text-xl font-bold">{healthData.heartRate}</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">BPM</span>
        </div>
      </div>
    </Card>
  );
}