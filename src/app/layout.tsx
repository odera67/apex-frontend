import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs"; 
import ConvexClientProvider from "@/components/ConvexClientProvider";
import AccessibilityMenu from "@/components/AccessibilityMenu";
import ApexAssistant from "@/components/ApexAssistant"; // ✅ 1. IMPORT APEX HERE

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Fitness Coach",
  description: "Generate your dream body with AI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI Fitness Coach",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", 
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
          <ConvexClientProvider>
            {/* ✅ NEW: This div pushes your page content down so the taller navbar doesn't cover it! */}
            <div style={{ paddingTop: 'env(safe-area-inset-top)' }}>
              {children}
            </div>
          </ConvexClientProvider>
          
          <AccessibilityMenu />
          <ApexAssistant /> {/* ✅ 2. DROP THE ORB HERE TO FLOAT OVER EVERY PAGE */}
        </body>
      </html>
    </ClerkProvider>
  );
}