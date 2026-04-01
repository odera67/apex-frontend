"use client";
import React, { useState, useEffect, useRef } from 'react';

// Tell TypeScript about the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function ApexOrb() {
  const [isActive, setIsActive] = useState(false); // Has the user granted permission?
  const [isProcessing, setIsProcessing] = useState(false); // Is Ollama thinking?
  const [latestReply, setLatestReply] = useState("");
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // Listen as we speak
    recognition.lang = 'en-US';

    recognition.onresult = async (event: any) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript.toLowerCase();
      }

      // WAKE WORD DETECTION
      if (currentTranscript.includes("hey apex") && !isProcessing) {
        console.log("Wake word detected!");
        
        // Extract the command after "hey apex"
        const command = currentTranscript.split("hey apex")[1]?.trim();
        
        if (command && command.length > 3) {
          // Pause listening while processing so it doesn't hear itself
          recognition.stop(); 
          await sendToOllama(command);
          // Resume listening after Ollama replies
          if (isActive) recognition.start(); 
        }
      }
    };

    recognition.onend = () => {
      // Auto-restart if it drops, as long as the user wants it active
      if (isActive && !isProcessing) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isActive, isProcessing]);

  const toggleApex = () => {
    if (!isActive) {
      setIsActive(true);
      recognitionRef.current?.start();
    } else {
      setIsActive(false);
      recognitionRef.current?.stop();
    }
  };

  const sendToOllama = async (prompt: string) => {
    setIsProcessing(true);
    setLatestReply("Thinking...");

    try {
      const res = await fetch('/api/apex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setLatestReply(data.reply || data.error);
      
      // Optional: Use Text-to-Speech so Apex speaks back!
      const speech = new SpeechSynthesisUtterance(data.reply);
      window.speechSynthesis.speak(speech);

    } catch (err) {
      setLatestReply("Connection to Apex lost.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed top-1/2 left-4 transform -translate-y-1/2 z-50 flex items-center gap-4">
      {/* The Orb */}
      <button
        onClick={toggleApex}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 border border-white/20 shadow-xl ${
          isActive && !isProcessing ? 'bg-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.8)] animate-pulse' : 
          isProcessing ? 'bg-purple-600 shadow-[0_0_30px_rgba(147,51,234,0.8)] animate-spin' : 
          'bg-gray-800 hover:bg-gray-700'
        }`}
      >
        <span className="text-white text-xs font-bold tracking-wider">
          {isProcessing ? '...' : isActive ? 'ON' : 'APEX'}
        </span>
      </button>

      {/* Floating Reply Box (Only shows when there's a reply) */}
      {latestReply && (
        <div className="bg-gray-900/90 backdrop-blur-sm text-white p-4 rounded-xl border border-blue-500/30 max-w-xs text-sm shadow-2xl transition-all">
          {latestReply}
          <button 
            onClick={() => setLatestReply("")} 
            className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs"
          >
            x
          </button>
        </div>
      )}
    </div>
  );
}