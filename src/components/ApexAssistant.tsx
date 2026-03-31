"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { askApex } from "@/actions/apexBrain"; 
import Image from "next/image";

type ApexState = "hidden" | "listening" | "thinking" | "speaking";

export default function ApexAssistant() {
  const [orbState, setOrbState] = useState<ApexState>("hidden");
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setOrbState("hidden");
    }, 10000);
  };

  useEffect(() => {
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []);

  const triggerApexWakeUp = async () => {
    try {
      console.log("▶️ STEP 1: Waking up Apex...");
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) {
        toast.error("Requires a physical mobile device.");
        return;
      }

      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech');

      const hasPermission = await SpeechRecognition.checkPermissions();
      if (hasPermission.speechRecognition !== 'granted') {
        await SpeechRecognition.requestPermissions();
      }

      setOrbState("listening");
      resetInactivityTimer();
      console.log("▶️ STEP 2: Listening...");

      const userSpokenText: string = await new Promise((resolve, reject) => {
        // partialResults: true makes it much more forgiving!
        SpeechRecognition.start({
          language: "en-US",
          maxResults: 2, 
          prompt: "I'm listening...",
          partialResults: true, 
        }).catch((err) => reject(err));

        SpeechRecognition.addListener('partialResults', (data: any) => {
          if (data.matches && data.matches.length > 0) {
            SpeechRecognition.stop();
            resolve(data.matches[0]);
          }
        });

        setTimeout(() => {
          SpeechRecognition.stop();
          reject("timeout");
        }, 8000);
      });

      console.log("🗣️ USER SAID:", userSpokenText);
      toast.success("Heard: " + userSpokenText); 

      setOrbState("thinking");
      resetInactivityTimer();
      console.log("▶️ STEP 3: Sending to Gemini API...");
      
      const brainResponse = await askApex(userSpokenText);
      console.log("🧠 GEMINI RESPONSE:", brainResponse);

      if (brainResponse.success && brainResponse.reply) {
        setOrbState("speaking");
        resetInactivityTimer();
        console.log("▶️ STEP 4: Triggering Text-to-Speech...");
        
        await TextToSpeech.speak({
          text: brainResponse.reply,
          lang: 'en-US',
          rate: 1.0,
          pitch: 1.0,
        });
        
        console.log("✅ Sequence Complete.");
        setOrbState("hidden"); 
      } else {
        console.error("❌ GEMINI ERROR: Unsuccessful response or empty reply.");
        toast.error("Brain Error: Could not generate a reply.");
        setOrbState("hidden");
      }

    } catch (error: any) {
      const errorMessage = String(error);
      // Handles native Android silence/mumbling errors without crashing
      if (errorMessage.includes("No match") || errorMessage.includes("timeout") || errorMessage.includes("Didn't understand")) {
        console.log("⚠️ Silence/Mumble detected.");
        toast("Apex didn't catch that. Try speaking louder.");
      } else {
        console.error("💥 MASSIVE CRASH:", error);
        toast.error("Crash: " + errorMessage); 
      }
      setOrbState("hidden");
    }
  };

  const getOrbStyles = () => {
    switch (orbState) {
      case "hidden": return "opacity-0 scale-50 pointer-events-none translate-y-10";
      case "listening": return "opacity-100 scale-100 shadow-[0_0_50px_rgba(56,189,248,0.6)] animate-pulse transition-all duration-700";
      case "thinking": return "opacity-80 scale-90 shadow-[0_0_30px_rgba(192,38,211,0.6)] animate-spin transition-all duration-500 hue-rotate-30";
      case "speaking": return "opacity-100 scale-110 shadow-[0_0_80px_rgba(56,189,248,0.9)] animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] transition-all duration-300";
      default: return "hidden";
    }
  };

  return (
    <>
      {orbState === "hidden" && (
        <button 
          onClick={triggerApexWakeUp}
          style={{ zIndex: 9999 }}
          className="fixed bottom-24 left-6 w-14 h-14 rounded-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)] flex items-center justify-center border-2 border-cyan-300"
        >
          <div className="w-4 h-4 rounded-full bg-white animate-ping absolute" />
          <div className="w-3 h-3 rounded-full bg-cyan-200 z-10" />
        </button>
      )}

      <div className={`fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-700 ${orbState === "hidden" ? "opacity-0" : "opacity-100"}`}>
        <div className="relative flex flex-col items-center">
          <div className={`mb-8 text-cyan-300 font-medium tracking-widest uppercase text-sm transition-opacity duration-500 ${orbState === "hidden" ? "opacity-0" : "opacity-100"}`}>
            {orbState === "listening" && "Listening..."}
            {orbState === "thinking" && "Processing"}
            {orbState === "speaking" && "Apex"}
          </div>
          <div className={`relative w-64 h-64 rounded-full flex items-center justify-center mix-blend-screen ${getOrbStyles()}`}>
            <Image src="/blueorb.gif" alt="Apex Orb" fill className="object-contain rounded-full" priority unoptimized />
          </div>
        </div>
      </div>
    </>
  );
}