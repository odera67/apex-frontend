import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs"; 
import ConvexClientProvider from "@/components/ConvexClientProvider";
import AccessibilityMenu from "@/components/AccessibilityMenu"; // <-- New import

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Fitness Coach",
  description: "Generate your dream body with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider> 
      <html lang="en">
        <body className={inter.className}>
          {/* Clerk wraps the app -> Convex wraps the children */}
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
          
          {/* Floating Accessibility Menu available across the whole app */}
          <AccessibilityMenu />
        </body>
      </html>
    </ClerkProvider>
  );
}