"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { askApex } from "@/actions/apexBrain"; 
import Image from "next/image";

type ApexState = "hidden" | "listening" | "thinking" | "speaking";

export default function ApexAssistant() {
  const [orbState, setOrbState] = useState<ApexState>("hidden");
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // --- 1. INACTIVITY SHUTDOWN LOGIC ---
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    
    // Shut down the orb after 10 seconds of no interaction
    inactivityTimer.current = setTimeout(() => {
      setOrbState("hidden");
    }, 10000);
  };

  // Clear timer if component unmounts
  useEffect(() => {
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []);

  // --- 2. THE APEX WAKE SEQUENCE ---
  const triggerApexWakeUp = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) {
        toast.error("Apex voice features require a physical mobile device.");
        return;
      }

      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech');

      // Check permissions
      const hasPermission = await SpeechRecognition.checkPermissions();
      if (hasPermission.speechRecognition !== 'granted') {
        await SpeechRecognition.requestPermissions();
      }

      // WAKE UP: Show the Orb and start listening
      setOrbState("listening");
      resetInactivityTimer();

      const userSpokenText: string = await new Promise((resolve, reject) => {
        // ✅ The fix: .catch handles Android's "No match" silence error gracefully
        SpeechRecognition.start({
          language: "en-US",
          maxResults: 1,
          prompt: "I'm listening...",
          partialResults: false,
        }).catch((err) => reject(err));

        SpeechRecognition.addListener('partialResults', (data: any) => {
          if (data.matches && data.matches.length > 0) {
            SpeechRecognition.stop();
            resolve(data.matches[0]);
          }
        });

        // Failsafe timeout
        setTimeout(() => {
          SpeechRecognition.stop();
          reject("timeout");
        }, 8000);
      });

      // THINKING: Send to Gemini
      setOrbState("thinking");
      resetInactivityTimer();
      const brainResponse = await askApex(userSpokenText);

      // SPEAKING: Animate the Orb while talking
      if (brainResponse.success && brainResponse.reply) {
        setOrbState("speaking");
        resetInactivityTimer();
        
        await TextToSpeech.speak({
          text: brainResponse.reply,
          lang: 'en-US',
          rate: 1.0,
          pitch: 1.0,
        });
        
        // Return to hidden state after speaking
        setOrbState("hidden"); 
      } else {
        setOrbState("hidden");
      }

    } catch (error: any) {
      // ✅ The fix: Gracefully handle silence or timeouts without crashing Chrome/Android
      const errorMessage = String(error);
      if (errorMessage.includes("No match") || errorMessage.includes("timeout")) {
        toast("Apex didn't catch that. Try again.");
      } else {
        console.error("Apex Sequence Error:", error);
      }
      setOrbState("hidden"); // Safely hide the orb
    }
  };

  // --- 3. DYNAMIC CSS CLASSES FOR THE ORB ---
  const getOrbStyles = () => {
    switch (orbState) {
      case "hidden":
        return "opacity-0 scale-50 pointer-events-none translate-y-10";
      case "listening":
        return "opacity-100 scale-100 shadow-[0_0_50px_rgba(56,189,248,0.6)] animate-pulse transition-all duration-700";
      case "thinking":
        return "opacity-80 scale-90 shadow-[0_0_30px_rgba(192,38,211,0.6)] animate-spin transition-all duration-500 hue-rotate-30";
      case "speaking":
        return "opacity-100 scale-110 shadow-[0_0_80px_rgba(56,189,248,0.9)] animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] transition-all duration-300";
      default:
        return "hidden";
    }
  };

  return (
    <>
      {/* HIGHLY VISIBLE TRIGGER - Safely on the LEFT */}
      {orbState === "hidden" && (
        <button 
          onClick={triggerApexWakeUp}
          className="fixed bottom-24 left-6 w-14 h-14 rounded-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)] z-[9999] flex items-center justify-center border-2 border-cyan-300"
        >
          <div className="w-4 h-4 rounded-full bg-white animate-ping absolute" />
          <div className="w-3 h-3 rounded-full bg-cyan-200 z-10" />
        </button>
      )}

      {/* THE HOLOGRAM ORB */}
      <div 
        className={`fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-700 ${
          orbState === "hidden" ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="relative flex flex-col items-center">
          
          <div className={`mb-8 text-cyan-300 font-medium tracking-widest uppercase text-sm transition-opacity duration-500 ${orbState === "hidden" ? "opacity-0" : "opacity-100"}`}>
            {orbState === "listening" && "Listening..."}
            {orbState === "thinking" && "Processing"}
            {orbState === "speaking" && "Apex"}
          </div>

          <div className={`relative w-64 h-64 rounded-full flex items-center justify-center mix-blend-screen ${getOrbStyles()}`}>
            <Image 
              src="/blueorb.gif" 
              alt="Apex Orb" 
              fill
              className="object-contain rounded-full"
              priority
              unoptimized
            />
          </div>
          
        </div>
      </div>
    </>
  );
}