"use client";

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 container mx-auto max-w-6xl animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="space-y-3">
          <div className="h-10 w-64 bg-muted rounded-lg"></div>
          <div className="h-4 w-48 bg-muted rounded-md"></div>
        </div>
        <div className="h-10 w-32 bg-muted rounded-xl"></div>
      </div>

      {/* Bento Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-card border border-border rounded-2xl p-6"></div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 mb-8 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-24 bg-muted rounded-full shrink-0"></div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column (Workout) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="h-8 w-40 bg-muted rounded-md mb-4"></div>
          <div className="h-[400px] bg-card border border-border rounded-3xl p-8 space-y-4">
            <div className="h-20 bg-background rounded-2xl border border-border/50"></div>
            <div className="h-20 bg-background rounded-2xl border border-border/50"></div>
            <div className="h-20 bg-background rounded-2xl border border-border/50"></div>
          </div>
        </div>

        {/* Right Column (Diet) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-8 w-40 bg-muted rounded-md mb-4"></div>
          <div className="h-[300px] bg-card border border-border rounded-3xl p-8 space-y-4">
            <div className="h-12 bg-background rounded-2xl border border-border/50"></div>
            <div className="h-12 bg-background rounded-2xl border border-border/50"></div>
            <div className="h-12 bg-background rounded-2xl border border-border/50"></div>
          </div>
        </div>
      </div>
    </div>
  );
}