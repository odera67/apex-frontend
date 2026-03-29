"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export default function BackButtonHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // We only want this running on native Android/iOS, not the web browser
    if (!Capacitor.isNativePlatform()) return;

    const setupBackButton = async () => {
      await App.addListener("backButton", ({ canGoBack }) => {
        // List the main pages where pressing "back" SHOULD close the app
        const exitRoutes = ["/", "/dashboard", "/sign-in", "/login"];

        if (exitRoutes.includes(pathname)) {
          // If they are on the dashboard and press back, exit the app
          App.exitApp();
        } else {
          // Otherwise, just go back one page in the app!
          router.back();
        }
      });
    };

    setupBackButton();

    // Cleanup the listener when the component unmounts
    return () => {
      App.removeAllListeners();
    };
  }, [pathname, router]);

  return null; // This component is invisible!
}