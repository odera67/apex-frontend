import TerminalOverlay from "@/components/TerminalOverlay";
import { Button } from "@/components/ui/button";
import UserPrograms from "@/components/UserPrograms";
import { ArrowRightIcon, Activity, Zap } from "lucide-react"; 
import Link from "next/link";
import InjuryPredictor from "@/components/InjuryPredictor";

const HomePage = () => {
  return (
    <div className="flex flex-col min-h-screen text-foreground overflow-hidden bg-background">
      
      {/* ================= HERO SECTION ================= */}
      <section className="relative z-10 py-12 md:py-24 flex-grow">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
            
            {/* CORNER DECORATION */}
            <div className="hidden md:block absolute -top-10 left-0 w-40 h-40 border-l-2 border-t-2 border-primary/20" />

            {/* LEFT SIDE CONTENT */}
            <div className="lg:col-span-7 space-y-8 relative order-2 lg:order-1">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                <div>
                  <span className="text-foreground">Transform</span>
                </div>
                <div>
                  <span className="text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]">Your Body</span>
                </div>
                <div className="pt-2">
                  <span className="text-foreground">With Advanced</span>
                </div>
                <div className="pt-2">
                  <span className="text-foreground">AI</span>
                  <span className="text-primary"> Technology</span>
                </div>
              </h1>

              <div className="h-px w-full bg-gradient-to-r from-primary via-secondary to-primary opacity-50"></div>

              <p className="text-xl text-muted-foreground w-full md:w-2/3 leading-relaxed">
                Talk to our AI assistant and get personalized diet plans and workout routines
                designed specifically for your biology.
              </p>

              {/* STATS */}
              <div className="flex items-center gap-6 md:gap-10 py-4 font-mono">
                <div className="flex flex-col">
                  <div className="text-2xl text-primary font-bold">500+</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">ACTIVE USERS</div>
                </div>
                <div className="h-10 w-px bg-border"></div>
                <div className="flex flex-col">
                  <div className="text-2xl text-primary font-bold">3min</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">GENERATION</div>
                </div>
                <div className="h-10 w-px bg-border"></div>
                <div className="flex flex-col">
                  <div className="text-2xl text-primary font-bold">100%</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">PERSONALIZED</div>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4">
                <Button
                  size="lg"
                  asChild
                  className="bg-primary text-primary-foreground px-8 py-7 text-lg font-bold shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                >
                  <Link href={"/generate-program"} className="flex items-center font-mono uppercase tracking-tighter">
                    Build Your Program
                    <ArrowRightIcon className="ml-2 size-5" />
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-primary text-primary hover:bg-primary/10 px-8 py-7 text-lg font-bold"
                >
                  <Link href={"/dashboard"} className="flex items-center font-mono uppercase tracking-tighter">
                    Dashboard
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="secondary"
                  asChild
                  className="bg-muted text-foreground border border-border px-8 py-7 text-lg font-bold"
                >
                  <Link href={"/check-in"} className="flex items-center font-mono uppercase tracking-tighter">
                    <Activity className="mr-2 size-5 text-primary" />
                    Check-In
                  </Link>
                </Button>
              </div>
            </div>

            {/* RIGHT SIDE CONTENT - FIXED IMAGE CROPPING */}
            <div className="lg:col-span-5 relative order-1 lg:order-2">
              <div className="absolute -inset-2 pointer-events-none z-20">
                <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-primary" />
                <div className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2 border-primary" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-l-2 border-b-2 border-primary" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-primary" />
              </div>

              {/* Changing aspect-square to aspect-[4/5] and adding object-top to save the head */}
              <div className="relative aspect-[4/5] w-full max-w-md mx-auto shadow-2xl rounded-sm overflow-hidden bg-black">
                <img
                  src="/hero-ai3.png"
                  alt="AI Fitness Coach"
                  className="absolute inset-0 size-full object-cover object-top transition-transform duration-700 hover:scale-105"
                />

                {/* SCAN LINE */}
                <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,transparent_calc(50%-1px),rgba(var(--primary),0.3)_50%,transparent_calc(50%+1px),transparent_100%)] bg-[length:100%_15px] animate-scanline pointer-events-none opacity-30" />

                {/* HUD DECORATIONS */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border border-primary/20 rounded-full animate-pulse" />
                  <div className="absolute top-1/2 left-0 w-full h-px bg-primary/20" />
                  <div className="absolute top-0 left-1/2 h-full w-px bg-primary/20" />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                
                {/* TERMINAL OVERLAY */}
                <div className="absolute bottom-4 left-4 right-4 z-30">
                   <TerminalOverlay />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= APEX SYSTEMS GRID ================= */}
      <section className="relative z-10 py-20 bg-muted/10 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-12">
            <Zap className="text-primary size-6 animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
            <h2 className="text-2xl md:text-3xl font-bold font-mono uppercase tracking-[0.2em] text-foreground">Apex Systems Active</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="w-full">
              <InjuryPredictor />
            
            </div>
          </div>
        </div>
      </section>

      {/* ================= USER PROGRAMS ================= */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
           <UserPrograms />
        </div>
      </section>

    </div>
  );
};

export default HomePage;