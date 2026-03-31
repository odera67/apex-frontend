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
  // In a true MVP, the user taps a hidden/small UI element to start the session, 
  // bypassing the Android continuous-listening battery drain.
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
        SpeechRecognition.start({
          language: "en-US",
          maxResults: 1,
          prompt: "I'm listening...",
          partialResults: false,
        });

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
        
        // Return to listening or shut down after speaking
        setOrbState("hidden"); 
      } else {
        setOrbState("hidden");
      }

    } catch (error: any) {
      if (error !== "timeout") {
        console.error("Apex Sequence Error:", error);
      }
      setOrbState("hidden"); // Hide if it failed or timed out
    }
  };

  // --- 3. DYNAMIC CSS CLASSES FOR THE ORB ---
  const getOrbStyles = () => {
    switch (orbState) {
      case "hidden":
        return "opacity-0 scale-50 pointer-events-none translate-y-10";
      case "listening":
        // Bright, gentle pulsing while waiting for user to speak
        return "opacity-100 scale-100 shadow-[0_0_50px_rgba(56,189,248,0.6)] animate-pulse transition-all duration-700";
      case "thinking":
        // Fast rotation and shrinking while Gemini processes
        return "opacity-80 scale-90 shadow-[0_0_30px_rgba(192,38,211,0.6)] animate-spin transition-all duration-500 hue-rotate-30";
      case "speaking":
        // Wild, aggressive scaling to simulate voice waveforms
        return "opacity-100 scale-110 shadow-[0_0_80px_rgba(56,189,248,0.9)] animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] transition-all duration-300";
      default:
        return "hidden";
    }
  };

  return (
    <>
      {/* INVISIBLE TRIGGER: We place a transparent overlay or a tiny discreet button 
          somewhere on the screen to trigger the wake-up without an ugly microphone button */}
      {orbState === "hidden" && (
        <button 
          onClick={triggerApexWakeUp}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm z-40 flex items-center justify-center text-blue-500/50 hover:bg-blue-500/20"
        >
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        </button>
      )}

      {/* THE HOLOGRAM ORB */}
      <div 
        className={`fixed inset-0 pointer-events-none z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-700 ${
          orbState === "hidden" ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="relative flex flex-col items-center">
          
          {/* Status text floating above */}
          <div className={`mb-8 text-cyan-300 font-medium tracking-widest uppercase text-sm transition-opacity duration-500 ${orbState === "hidden" ? "opacity-0" : "opacity-100"}`}>
            {orbState === "listening" && "Listening..."}
            {orbState === "thinking" && "Processing"}
            {orbState === "speaking" && "Apex"}
          </div>

          {/* The Actual GIF */}
          <div className={`relative w-64 h-64 rounded-full flex items-center justify-center mix-blend-screen ${getOrbStyles()}`}>
            <Image 
              src="/blueorb.gif" 
              alt="Apex Orb" 
              fill
              className="object-contain rounded-full"
              priority
              unoptimized // Required so Next.js doesn't freeze the GIF into a static image
            />
          </div>
          
        </div>
      </div>
    </>
  );
}