"use client";

import { useState } from "react";
import Link from "next/link";
import { ZapIcon, HomeIcon, DumbbellIcon, UserIcon, Activity, LayoutDashboard, Menu, X } from "lucide-react"; 
import { useUser, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const { isSignedIn } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Helper to close the mobile menu when a link is clicked
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-md border-b border-border pb-3 transition-all"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      <div className="container mx-auto flex items-center justify-between px-4">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
          <div className="p-1 bg-primary/10 rounded">
            <ZapIcon className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xl font-bold font-mono">
            fitness<span className="text-primary">flex</span>.ai
          </span>
        </Link>

        {/* --- DESKTOP NAVIGATION (Hidden on mobile) --- */}
        <nav className="hidden md:flex items-center gap-5">
          {isSignedIn ? (
            <>
              <Link href="/" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                <HomeIcon size={16} />
                <span>Home</span>
              </Link>

              <Link href="/dashboard" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors text-primary/90">
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>

              <Link href="/generate-program" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                <DumbbellIcon size={16} />
                <span>Generate</span>
              </Link>

              <Link href="/check-in" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                <Activity size={16} />
                <span>Check-In</span>
              </Link>

              <Link href="/profile" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
                <UserIcon size={16} />
                <span>Profile</span>
              </Link>

              <Button asChild variant="outline" className="ml-2 border-primary/50 text-primary hover:text-white hover:bg-primary/10">
                <Link href="/generate-program">Get Started</Link>
              </Button>

              <UserButton />
            </>
          ) : (
            <>
              <Button asChild variant="outline" className="border-primary/50 text-primary hover:text-white hover:bg-primary/10">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>

        {/* --- MOBILE ACTION AREA (Visible only on mobile) --- */}
        <div className="flex md:hidden items-center gap-4">
          {/* Always show User Avatar on mobile so they can manage their account easily */}
          {isSignedIn && <UserButton />}
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="p-1 text-foreground hover:text-primary transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* --- MOBILE DROPDOWN MENU --- */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border shadow-xl md:hidden flex flex-col py-4 px-4 gap-2">
          {isSignedIn ? (
            <>
              <Link href="/" onClick={closeMenu} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-base font-medium">
                <HomeIcon size={20} className="text-primary" />
                Home
              </Link>
              <Link href="/dashboard" onClick={closeMenu} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-base font-medium">
                <LayoutDashboard size={20} className="text-primary" />
                Dashboard
              </Link>
              <Link href="/generate-program" onClick={closeMenu} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-base font-medium">
                <DumbbellIcon size={20} className="text-primary" />
                Generate Plan
              </Link>
              <Link href="/check-in" onClick={closeMenu} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-base font-medium">
                <Activity size={20} className="text-primary" />
                Check-In
              </Link>
              <Link href="/profile" onClick={closeMenu} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-base font-medium">
                <UserIcon size={20} className="text-primary" />
                Profile
              </Link>

              <div className="pt-4 pb-2">
                <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={closeMenu}>
                  <Link href="/generate-program">Get Started</Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3 pt-2">
              <Button asChild variant="outline" className="w-full border-primary/50 text-primary hover:text-white hover:bg-primary/10" onClick={closeMenu}>
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={closeMenu}>
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;