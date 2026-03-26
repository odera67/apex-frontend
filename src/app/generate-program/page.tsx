"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader2, Mic, MicOff, Volume2, Send, Activity, Edit2, Check, Download, Undo2 } from "lucide-react";
import { toast } from "sonner";
import * as Papa from "papaparse";

// --- Types ---
interface IntakeStep {
  stage: string;
  saveField: string;
  nextStage: string;
  replies: string;
  isConditional: boolean;
  nextStageIfNo: string;
  repliesIfNo: string;
  dependsOnField: string;
  dependsOnValue: string;
}

interface ErrorRow {
  stage: string;
  text: string;
}

interface UserResponseRow {
  stage: string;
  user_raw_input: string;
  extracted_value: string;
}

// --- Constants ---
const DEFAULT_FLOW: IntakeStep[] = [
  { stage: "GREETING", saveField: "", nextStage: "CONSENT", replies: "Hello! My name is Apex, your virtual coach. Are you ready to get started?|Hey there! I'm Apex, your AI trainer. Are you ready to build your plan?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "CONSENT", saveField: "", nextStage: "INTRO", replies: "Before we dive in, do I have your consent to collect some basic health data to build your plan?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "INTRO", saveField: "age", nextStage: "AGE", replies: "Awesome! First up, how old are you?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "AGE", saveField: "weight", nextStage: "HEIGHT", replies: "Got it. How much do you weigh?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "HEIGHT", saveField: "height", nextStage: "GOAL", replies: "Noted. And what is your height?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "GOAL", saveField: "goal", nextStage: "LEVEL", replies: "Perfect. What is your primary fitness goal?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "LEVEL", saveField: "level", nextStage: "DAYS", replies: "Great. What is your current fitness level?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "DAYS", saveField: "days", nextStage: "EQUIPMENT", replies: "How many days a week can you commit to working out?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "EQUIPMENT", saveField: "equipment", nextStage: "ALLERGIES_CHECK", replies: "What equipment will you use?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "ALLERGIES_CHECK", saveField: "allergies", nextStage: "ALLERGIES_DETAIL", replies: "Do you have any food allergies?", isConditional: true, nextStageIfNo: "INJURIES_CHECK", repliesIfNo: "Okay, no allergies. Next, do you have any physical injuries?", dependsOnField: "", dependsOnValue: "" },
  { stage: "ALLERGIES_DETAIL", saveField: "allergies", nextStage: "INJURIES_CHECK", replies: "What are your allergies?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "INJURIES_CHECK", saveField: "injuries", nextStage: "INJURIES_DETAIL", replies: "Do you have any physical injuries?", isConditional: true, nextStageIfNo: "CONFIRMATION", repliesIfNo: "Alright, no injuries. Let's review your details.", dependsOnField: "", dependsOnValue: "" },
  { stage: "INJURIES_DETAIL", saveField: "injuries", nextStage: "CONFIRMATION", replies: "Please describe your injuries.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "CONFIRMATION", saveField: "", nextStage: "DONE", replies: "Does this look correct?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "DONE", saveField: "", nextStage: "", replies: "Building your perfect fitness plan now.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" }
];

const DEFAULT_ERRORS: ErrorRow[] = [
  { stage: "GREETING", text: "I didn't quite catch that. To start, please say 'Yes'." },
  { stage: "CONSENT", text: "I need your consent to proceed. Please say 'Yes' or 'No'." },
  { stage: "INTRO", text: "Please tell me your age as a number." },
  { stage: "AGE", text: "Please tell me your weight, like '150 pounds'." },
  { stage: "HEIGHT", text: "Please tell me your height, like '5 foot 10'." },
  { stage: "GOAL", text: "Please say 'Weight Loss', 'Muscle Gain', or 'General Fitness'." },
  { stage: "LEVEL", text: "Please say 'Beginner', 'Intermediate', or 'Advanced'." },
  { stage: "DAYS", text: "How many days? Please say a number between 1 and 7." },
  { stage: "EQUIPMENT", text: "Please say 'Full Gym', 'Dumbbells', or 'Bodyweight'." },
  { stage: "CONFIRMATION", text: "Please say 'Yes' to generate the plan." }
];

const STAGE_ORDER = ["GREETING", "CONSENT", "INTRO", "AGE", "HEIGHT", "GOAL", "LEVEL", "DAYS", "EQUIPMENT", "ALLERGIES_CHECK", "ALLERGIES_DETAIL", "INJURIES_CHECK", "INJURIES_DETAIL", "CONFIRMATION", "DONE"];

const normalizeNumberWords = (text: string) => {
  const numMap: { [key: string]: string } = { "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10" };
  let normalized = text.toLowerCase();
  for (const [word, digit] of Object.entries(numMap)) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit);
  }
  return normalized;
};

const humanDelay = () => new Promise(res => setTimeout(res, 800));

export default function GenerateProgramPage() {
  const router = useRouter();
  const { user } = useUser();
  const createPlan = useMutation(api.plans.createPlan);

  // --- State ---
  const [callActive, setCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [stage, setStage] = useState<string>("GREETING");
  const [inputText, setInputText] = useState("");
  const [userData, setUserData] = useState({ age: "", weight: "", height: "", goal: "", level: "", days: "", equipment: "", allergies: "", injuries: "" });
  const [userDataset, setUserDataset] = useState<UserResponseRow[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [waveHeights, setWaveHeights] = useState([4, 4, 4, 4, 4]);

  // --- Refs for Async Access ---
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isAiSpeakingRef = useRef(false);
  const callActiveRef = useRef(false);
  const stageRef = useRef<string>("GREETING");
  const userDataRef = useRef(userData);
  const processingRef = useRef(false);
  const stepConfigRef = useRef<IntakeStep | null>(null);

  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { userDataRef.current = userData; }, [userData]);
  useEffect(() => { callActiveRef.current = callActive; }, [callActive]);

  // --- Animation Hook ---
  useEffect(() => {
    let interval: any;
    if (isListening) {
      interval = setInterval(() => {
        setWaveHeights(Array.from({ length: 5 }, () => Math.floor(Math.random() * 20) + 4));
      }, 150);
    } else {
      setWaveHeights([4, 4, 4, 4, 4]);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  // --- Initialization ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Setup Web TTS
    synthRef.current = window.speechSynthesis;

    // Setup Web Recognition Fallback
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        if (processingRef.current) return;
        const transcript = event.results[0][0].transcript.trim();
        handleUserResponse(transcript);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }

    // Load CSV
    fetch('/Synthetic_User_Responses_5000.csv')
      .then(res => res.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          complete: (results) => setUserDataset(results.data as any)
        });
      }).catch(() => {});
  }, []);

  // --- Audio Logic: SPEAK ---
  const speak = async (text: string, onComplete?: () => void) => {
    await stopListening();
    setIsSpeaking(true);
    isAiSpeakingRef.current = true;
    addMessage("assistant", text);

    const { Capacitor } = await import('@capacitor/core');
    
    if (Capacitor.isNativePlatform()) {
      try {
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
        await TextToSpeech.speak({ text, lang: 'en-US', rate: 1.0, volume: 1.0, category: 'ambient' });
        setIsSpeaking(false);
        isAiSpeakingRef.current = false;
        if (onComplete && callActiveRef.current) onComplete();
      } catch (e) {
        setIsSpeaking(false);
        isAiSpeakingRef.current = false;
      }
    } else {
      // Browser Fallback
      if (!synthRef.current) return;
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        setIsSpeaking(false);
        isAiSpeakingRef.current = false;
        if (onComplete && callActiveRef.current) onComplete();
      };
      synthRef.current.speak(utterance);
    }
  };

  // --- Audio Logic: LISTEN ---
  const startListening = async () => {
    if (!callActiveRef.current || isAiSpeakingRef.current) return;

    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        const perm = await SpeechRecognition.checkPermissions();
        if (perm.speechRecognition !== 'granted') await SpeechRecognition.requestPermissions();

        setIsListening(true);
        const result = await SpeechRecognition.start({ language: "en-US", partialResults: false, popup: true });
        
        if (result.matches && result.matches.length > 0) {
          handleUserResponse(result.matches[0]);
        }
      } catch (e) {
        setIsListening(false);
      }
    } else {
      // Browser Fallback
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {}
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        await SpeechRecognition.stop();
      } catch (e) {}
    } else {
      recognitionRef.current?.stop();
    }
  };

  // --- Logic Handlers ---
  const addMessage = (role: string, content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const handleUserResponse = async (text: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    
    const input = text.trim();
    if (!input) { processingRef.current = false; return; }

    addMessage("user", input);
    const textLower = normalizeNumberWords(input);

    // Logic for Step Advancement (Simplified for brevity, matches your original flow logic)
    const currentConfig = stepConfigRef.current;
    const updatedData = { ...userDataRef.current };

    // Update data based on field
    if (currentConfig?.saveField) {
      (updatedData as any)[currentConfig.saveField] = input;
      setUserData(updatedData);
    }

    setIsThinking(true);
    await humanDelay();
    setIsThinking(false);

    // Determine next stage
    let nextStageStr = currentConfig?.nextStage || "DONE";
    // Check for negative responses if conditional
    if (currentConfig?.isConditional && /\b(no|none|nah)\b/i.test(textLower)) {
      nextStageStr = currentConfig.nextStageIfNo;
    }

    const nextConfig = DEFAULT_FLOW.find(s => s.stage === nextStageStr) || DEFAULT_FLOW[DEFAULT_FLOW.length-1];
    setStage(nextStageStr);
    stepConfigRef.current = nextConfig;

    if (nextStageStr === "DONE") {
      speak("Great, I'm building your plan now.");
      await generateAndSavePlan(updatedData);
    } else if (nextStageStr === "CONFIRMATION") {
        const summary = `Got it. You are ${updatedData.age}, weighing ${updatedData.weight}. Does everything look correct?`;
        speak(summary, startListening);
    } else {
      const reply = nextConfig.replies.split('|')[0];
      speak(reply, startListening);
    }

    processingRef.current = false;
  };

  const generateAndSavePlan = async (finalData: any) => {
    // Your existing API logic here
    setStage("DONE");
    setTimeout(() => router.push("/profile"), 3000);
  };

  const toggleCall = () => {
    if (callActive) {
      setCallActive(false);
      stopListening();
    } else {
      setCallActive(true);
      const start = DEFAULT_FLOW[0];
      stepConfigRef.current = start;
      speak(start.replies.split('|')[0], startListening);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-6 pt-24">
      {!callActive ? (
        <div className="flex-grow flex flex-col items-center justify-center px-4">
          <Button size="lg" onClick={toggleCall} className="h-20 px-12 rounded-full bg-primary text-2xl font-bold">
            START SESSION
          </Button>
        </div>
      ) : (
        <div className="container mx-auto px-4 max-w-4xl">
           <Card className="p-6 mb-6 flex flex-col items-center gap-4">
              <div className={`size-32 rounded-full border-4 transition-all ${isListening ? 'border-green-500 scale-110' : 'border-primary'}`}>
                <img src={user?.imageUrl || "https://github.com/shadcn.png"} className="rounded-full" alt="User" />
              </div>
              <div className="flex gap-1 h-8 items-center">
                {isListening && waveHeights.map((h, i) => (
                   <div key={i} className="w-1 bg-green-500 rounded-full" style={{ height: `${h}px` }} />
                ))}
              </div>
           </Card>

           <Card className="h-64 overflow-y-auto p-4 mb-4 space-y-2 bg-muted/20">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                   <div className={`p-3 rounded-lg max-w-[80%] ${m.role === 'assistant' ? 'bg-muted' : 'bg-primary text-white'}`}>
                      {m.content}
                   </div>
                </div>
              ))}
              {isThinking && <Loader2 className="animate-spin text-primary" />}
           </Card>

           <div className="flex justify-center gap-4">
              <Button variant="outline" size="icon" className="rounded-full size-16" onClick={() => isListening ? stopListening() : startListening()}>
                {isListening ? <Mic className="text-green-500" /> : <MicOff />}
              </Button>
              <Button variant="destructive" size="lg" className="rounded-full px-10" onClick={toggleCall}>
                End Session
              </Button>
           </div>
        </div>
      )}
    </div>
  );
}