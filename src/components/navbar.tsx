"use client";

import Link from "next/link";
import { ZapIcon, HomeIcon, DumbbellIcon, UserIcon, Activity, LayoutDashboard } from "lucide-react"; 
import { useUser, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const { isSignedIn } = useUser();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-md border-b border-border pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div className="container mx-auto flex items-center justify-between px-4">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2">
          <div className="p-1 bg-primary/10 rounded">
            <ZapIcon className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xl font-bold font-mono">
            fitness<span className="text-primary">flex</span>.ai
          </span>
        </Link>

        {/* NAVIGATION */}
        <nav className="flex items-center gap-5">
          {isSignedIn ? (
            <>
              <Link href="/" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                <HomeIcon size={16} />
                <span className="hidden md:inline">Home</span>
              </Link>

              {/* Dashboard Link */}
              <Link href="/dashboard" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors text-primary/90">
                <LayoutDashboard size={16} />
                <span className="hidden md:inline">Dashboard</span>
              </Link>

              <Link href="/generate-program" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                <DumbbellIcon size={16} />
                <span className="hidden md:inline">Generate</span>
              </Link>

              <Link href="/check-in" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                <Activity size={16} />
                <span className="hidden md:inline">Check-In</span>
              </Link>

              <Link href="/profile" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                <UserIcon size={16} />
                <span className="hidden md:inline">Profile</span>
              </Link>

              {/* Get Started Button */}
              <Button asChild variant="outline" className="ml-2 border-primary/50 text-primary hover:text-white hover:bg-primary/10 hidden lg:inline-flex">
                <Link href="/generate-program">Get Started</Link>
              </Button>

              <UserButton />
            </>
          ) : (
            <>
              {/* SIGN IN LINK */}
              <Button 
                asChild 
                variant="outline" 
                className="border-primary/50 text-primary hover:text-white hover:bg-primary/10"
              >
                <Link href="/sign-in">
                  Sign In
                </Link>
              </Button>

              {/* SIGN UP LINK */}
              <Button 
                asChild 
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/sign-up">
                  Sign Up
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;