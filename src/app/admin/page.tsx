"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
// Fixed Path: Added an extra '../' to escape the 'src' directory layout
import { api } from "../../../convex/_generated/api"; 
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Users, ShieldAlert, ArrowLeft, Activity, 
  ChevronRight, Dumbbell, ShieldCheck 
} from "lucide-react";

// Explicitly type the client mapping structure to fix implicit 'any' error
interface AdminUserClient {
  id: string;
  userId: string;
  protocolName: string;
  goal: string;
  level: string;
  daysCount: number;
}

export default function AdminDashboardPage() {
  const { user, isLoaded } = useUser();
  const globalUsers = useQuery(api.admin.getGlobalUserList);

  if (!isLoaded || globalUsers === undefined) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Decrypting Core Ledger...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.publicMetadata?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black font-mono uppercase tracking-tight mb-2">Clearance Required</h1>
        <p className="text-muted-foreground max-w-md text-sm leading-relaxed mb-6">
          Your credentials do not match administrative protocols. This incident has been logged.
        </p>
        <Button asChild variant="outline" className="rounded-xl border-border/40 gap-2">
          <Link href="/">
            <ArrowLeft className="w-4 h-4" /> Return to Base
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-16 px-4 sm:px-6 container mx-auto max-w-5xl">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs tracking-widest uppercase mb-1">
            <ShieldCheck className="w-4 h-4" /> Secure Admin Session
          </div>
          <h1 className="text-3xl font-black font-mono uppercase tracking-tight">
            Global Control Center
          </h1>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl px-4 py-2.5 flex items-center gap-3 self-start">
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-black tracking-wider text-muted-foreground">Total Systems</span>
            <span className="text-sm font-black font-mono text-foreground">{globalUsers.length} Active Profiles</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2 px-1">
          User Database Registry
        </h2>

        {globalUsers.length === 0 ? (
          <div className="bg-card border border-border/40 rounded-3xl p-12 text-center text-muted-foreground">
            No live data instances initialized yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {globalUsers.map((client: AdminUserClient) => ( // Fixed: Typed explicitly
              <div 
                key={client.id}
                className="bg-card/40 border border-border/40 hover:border-primary/30 transition-all duration-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-zinc-900 border border-border/60 rounded-xl flex items-center justify-center shrink-0 group-hover:border-primary/20 transition-colors">
                    <Dumbbell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-muted-foreground tracking-tight select-all">
                        ID: {client.userId.substring(0, 12)}...
                      </span>
                      <span className="text-[10px] uppercase font-black tracking-widest bg-zinc-900 border border-border/60 px-2 py-0.5 rounded text-zinc-400">
                        {client.level}
                      </span>
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-foreground uppercase font-mono mt-0.5">
                      {client.protocolName}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      Objective: <span className="text-foreground/80 font-semibold">{client.goal}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/20">
                  <div className="text-left sm:text-right">
                    <span className="block text-[10px] uppercase font-black tracking-wider text-muted-foreground">Split Setup</span>
                    <span className="text-sm font-bold font-mono text-primary">{client.daysCount} Micro-Cycles</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}