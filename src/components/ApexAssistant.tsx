"use client";
import React, { useState, useEffect } from 'react';
import { VoiceRecorder } from 'capacitor-voice-recorder';

export default function ApexAssistant() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // Check microphone permissions when the component loads
  useEffect(() => {
    VoiceRecorder.canDeviceVoiceRecord().then((result) => {
      if (result.value) {
        VoiceRecorder.requestAudioRecordingPermission().then((permission) => {
          setHasPermission(permission.value);
        });
      }
    });
  }, []);

  const toggleRecording = async () => {
    if (!hasPermission) {
      alert("Please allow microphone access to talk to Apex.");
      return;
    }

    if (isRecording) {
      // Stop Recording
      const result = await VoiceRecorder.stopRecording();
      setIsRecording(false);
      console.log("Audio Data (Base64):", result.value.recordDataBase64);
      // Here is where we will send the audio to Groq/Next.js backend
    } else {
      // Start Recording
      await VoiceRecorder.startRecording();
      setIsRecording(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-xl shadow-lg border border-gray-700 max-w-sm mx-auto mt-10">
      <h2 className="text-2xl font-bold text-white mb-4">Apex Assistant</h2>
      
      <button 
        onClick={toggleRecording}
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(0,191,255,0.6)] ${
          isRecording ? 'bg-red-500 scale-110 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'
        }`}
      >
        {isRecording ? (
          <span className="text-white font-bold">Stop</span>
        ) : (
          <span className="text-white font-bold">Speak</span>
        )}
      </button>

      <p className="text-gray-400 mt-6 text-center">
        {isRecording ? "Apex is listening..." : "Tap the orb to speak to Apex"}
      </p>
    </div>
  );
}