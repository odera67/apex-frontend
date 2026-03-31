"use client";

import { useState } from "react";
import { Mic, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { askApex } from "@/actions/apexBrain"; // Adjust path if needed

export default function ApexAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const startApexSequence = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (!Capacitor.isNativePlatform()) {
        toast.error("Apex voice features only work on physical devices right now.");
        return;
      }

      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech');

      // 1. Request Microphone Permission
      const hasPermission = await SpeechRecognition.checkPermissions();
      if (hasPermission.speechRecognition !== 'granted') {
        await SpeechRecognition.requestPermissions();
      }

      // 2. Start Listening (The Ears)
      setIsListening(true);
      
      // We wrap the listening in a Promise so we can wait for the result
      const userSpokenText: string = await new Promise((resolve, reject) => {
        SpeechRecognition.start({
          language: "en-US",
          maxResults: 1,
          prompt: "Talk to Apex...",
          partialResults: false,
        });

        // Listen for the result
        SpeechRecognition.addListener('partialResults', (data: any) => {
          if (data.matches && data.matches.length > 0) {
            SpeechRecognition.stop(); // Stop listening once we have words
            resolve(data.matches[0]);
          }
        });

        // Failsafe timeout just in case
        setTimeout(() => {
          SpeechRecognition.stop();
          reject("Listening timed out");
        }, 8000);
      });

      setIsListening(false);
      setIsThinking(true); // Orb turns purple/thinking mode

      // 3. Send to Gemini (The Brain)
      const brainResponse = await askApex(userSpokenText);
      setIsThinking(false);

      // 4. Speak the answer (The Voice)
      if (brainResponse.success && brainResponse.reply) {
        await TextToSpeech.speak({
          text: brainResponse.reply,
          lang: 'en-US',
          rate: 1.0,
          pitch: 1.0,
        });
        toast.success("Apex: " + brainResponse.reply);
      }

    } catch (error: any) {
      console.error("Apex Sequence Error:", error);
      setIsListening(false);
      setIsThinking(false);
      toast.error("Apex couldn't hear you clearly.");
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center">
      
      {/* Status Text Indicator */}
      {(isListening || isThinking) && (
        <div className="mb-4 bg-black/70 text-white px-4 py-1.5 rounded-full text-sm font-medium animate-pulse backdrop-blur-sm border border-white/10">
          {isListening ? "Listening..." : "Apex is thinking..."}
        </div>
      )}

      {/* The Orb Button */}
      <button
        onClick={isListening ? undefined : startApexSequence}
        disabled={isThinking}
        className={`relative flex items-center justify-center rounded-full transition-all duration-500 ease-in-out ${
          isListening 
            ? "w-24 h-24 bg-gradient-to-tr from-blue-600 via-cyan-400 to-blue-500 shadow-[0_0_40px_rgba(56,189,248,0.8)]" 
            : isThinking
            ? "w-24 h-24 bg-gradient-to-tr from-purple-600 via-fuchsia-400 to-purple-500 shadow-[0_0_40px_rgba(192,38,211,0.8)]"
            : "w-16 h-16 bg-primary shadow-lg hover:scale-105"
        }`}
      >
        {/* Pulsing rings when active */}
        {(isListening || isThinking) && (
          <>
            <div className={`absolute inset-0 rounded-full border-2 opacity-50 animate-ping ${isThinking ? 'border-fuchsia-300' : 'border-cyan-300'}`}></div>
            <div className={`absolute inset-[-10px] rounded-full opacity-20 animate-pulse ${isThinking ? 'bg-purple-400' : 'bg-blue-400'}`}></div>
            <div className={`absolute inset-[-20px] rounded-full opacity-10 animate-pulse delay-75 ${isThinking ? 'bg-fuchsia-300' : 'bg-cyan-300'}`}></div>
          </>
        )}

        {/* Icon inside the Orb */}
        <div className="relative z-10 text-white">
          {isThinking ? (
            <Loader2 className="w-8 h-8 opacity-80 animate-spin" />
          ) : isListening ? (
            <X className="w-8 h-8 opacity-80" />
          ) : (
            <Mic className="w-7 h-7" />
          )}
        </div>
      </button>

    </div>
  );
}