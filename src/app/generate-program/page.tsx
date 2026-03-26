"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader2, Mic, MicOff, Volume2, Send, Activity, Edit2, Check, Download, Undo2, XCircle } from "lucide-react";
import { toast } from "sonner";

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

interface UserResponseRow {
  stage: string;
  user_raw_input: string;
  extracted_value: string;
}

const DEFAULT_FLOW: IntakeStep[] = [
  { stage: "GREETING", saveField: "", nextStage: "CONSENT", replies: "Hello! My name is Apex, your virtual coach. Are you ready to get started?|Welcome! I am Apex. Are you ready to begin?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "CONSENT", saveField: "", nextStage: "INTRO", replies: "Before we dive in, do I have your consent to collect some basic health data to build your plan?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "INTRO", saveField: "age", nextStage: "AGE", replies: "Awesome! First up, how old are you?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "AGE", saveField: "weight", nextStage: "HEIGHT", replies: "Got it. How much do you weigh?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "HEIGHT", saveField: "height", nextStage: "GOAL", replies: "Noted. And what is your height?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "GOAL", saveField: "goal", nextStage: "LEVEL", replies: "What is your primary fitness goal? (Weight Loss, Muscle Gain, or General Fitness)", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "LEVEL", saveField: "level", nextStage: "DAYS", replies: "What is your current fitness level? (Beginner, Intermediate, or Advanced)", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "DAYS", saveField: "days", nextStage: "EQUIPMENT", replies: "How many days a week can you commit to working out?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "EQUIPMENT", saveField: "equipment", nextStage: "ALLERGIES_CHECK", replies: "What equipment will you use? (Full Gym, Dumbbells, or Bodyweight)", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "ALLERGIES_CHECK", saveField: "allergies", nextStage: "ALLERGIES_DETAIL", replies: "Do you have any food allergies or dietary restrictions?", isConditional: true, nextStageIfNo: "INJURIES_CHECK", repliesIfNo: "No allergies. Next, do you have any physical injuries?", dependsOnField: "", dependsOnValue: "" },
  { stage: "ALLERGIES_DETAIL", saveField: "allergies", nextStage: "INJURIES_CHECK", replies: "Please tell me which foods you are allergic to.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "INJURIES_CHECK", saveField: "injuries", nextStage: "INJURIES_DETAIL", replies: "Lastly, do you have any physical injuries I should work around?", isConditional: true, nextStageIfNo: "CONFIRMATION", repliesIfNo: "Alright, no injuries. Let's review your details.", dependsOnField: "", dependsOnValue: "" },
  { stage: "INJURIES_DETAIL", saveField: "injuries", nextStage: "CONFIRMATION", replies: "Please describe your injuries so I can avoid them in your plan.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "CONFIRMATION", saveField: "", nextStage: "DONE", replies: "Does this summary look correct? Say yes to generate your plan.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "DONE", saveField: "", nextStage: "", replies: "Generating your highly customized plan now.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" }
];

export default function GenerateProgramPage() {
  const router = useRouter();
  const { user } = useUser();
  const createPlan = useMutation(api.plans.createPlan);

  const [callActive, setCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [stage, setStage] = useState<string>("GREETING"); 
  const [userData, setUserData] = useState<any>({
    age: "", weight: "", height: "", goal: "", level: "", days: "", equipment: "", allergies: "None", injuries: "None"
  });

  const isAiSpeakingRef = useRef(false);
  const callActiveRef = useRef(false);
  const stageRef = useRef("GREETING");
  const userDataRef = useRef(userData);

  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { userDataRef.current = userData; }, [userData]);
  useEffect(() => { callActiveRef.current = callActive; }, [callActive]);

  const addMessage = (role: string, content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  // 🔊 SPEAK HANDLER
  const speak = async (text: string, onComplete?: () => void) => {
    setIsSpeaking(true);
    isAiSpeakingRef.current = true;
    addMessage("assistant", text);

    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
        await TextToSpeech.speak({ text, lang: 'en-US', rate: 1.0, volume: 1.0, category: 'ambient' });
        setIsSpeaking(false);
        isAiSpeakingRef.current = false;
        setTimeout(() => { if (onComplete && callActiveRef.current) onComplete(); }, 500);
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => {
          setIsSpeaking(false);
          isAiSpeakingRef.current = false;
          setTimeout(() => { if (onComplete && callActiveRef.current) onComplete(); }, 400);
        };
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error(e);
      setIsSpeaking(false);
      isAiSpeakingRef.current = false;
    }
  };

  // 🎤 START LISTENING
  const startListening = async () => {
    if (!callActiveRef.current || isAiSpeakingRef.current) return;
    setIsListening(true);
    
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        const result = await SpeechRecognition.start({ language: "en-US", maxResults: 1, partialResults: false, popup: false });
        
        // FIXED: Explicitly check that result.matches exists and has items
        if (result.matches && result.matches.length > 0) {
          handleUserResponse(result.matches[0]);
        }
      } else {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.onresult = (event: any) => handleUserResponse(event.results[0][0].transcript);
        recognition.onend = () => setIsListening(false);
        recognition.start();
      }
    } catch (e) {
      setIsListening(false);
    }
  };

  // 🧠 LOGIC: HANDLE USER RESPONSE
  const handleUserResponse = async (input: string) => {
    setIsListening(false);
    addMessage("user", input);
    setIsThinking(true);

    const currentStep = DEFAULT_FLOW.find(s => s.stage === stageRef.current);
    if (!currentStep) return;

    // Simple Extraction Logic
    let nextStage = currentStep.nextStage;
    const lowerInput = input.toLowerCase();

    if (currentStep.isConditional) {
      const isNo = lowerInput.includes("no") || lowerInput.includes("none") || lowerInput.includes("don't");
      if (isNo) {
        nextStage = currentStep.nextStageIfNo;
        await speak(currentStep.repliesIfNo, () => moveToStage(nextStage));
        setIsThinking(false);
        return;
      }
    }

    if (currentStep.saveField) {
      setUserData((prev: any) => ({ ...prev, [currentStep.saveField]: input }));
    }

    setIsThinking(false);
    moveToStage(nextStage);
  };

  const moveToStage = (nextStage: string) => {
    if (!nextStage || nextStage === "DONE") {
      generateAndSavePlan();
      return;
    }

    setStage(nextStage);
    const nextStep = DEFAULT_FLOW.find(s => s.stage === nextStage);
    if (nextStep) {
      const replyOptions = nextStep.replies.split("|");
      const randomReply = replyOptions[Math.floor(Math.random() * replyOptions.length)];
      speak(randomReply, () => startListening());
    }
  };

  const generateAndSavePlan = async () => {
    setIsThinking(true);
    try {
      await createPlan({
        userId: user?.id ?? "guest",
        ...userDataRef.current
      });
      toast.success("Plan generated successfully!");
      router.push("/dashboard");
    } catch (error) {
      toast.error("Failed to save plan.");
    } finally {
      setIsThinking(false);
      setCallActive(false);
    }
  };

  const startCall = () => {
    setCallActive(true);
    setStage("GREETING");
    const firstStep = DEFAULT_FLOW[0];
    speak(firstStep.replies.split("|")[0], () => startListening());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
      <Card className="w-full max-w-2xl p-6 shadow-xl border-t-4 border-t-primary">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Activity className="text-primary w-6 h-6" />
            <h1 className="text-2xl font-bold tracking-tight">Apex AI Onboarding</h1>
          </div>
          {callActive && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-600 rounded-full animate-pulse">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              <span className="text-xs font-medium uppercase">Live Session</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {!callActive ? (
            <div className="text-center py-12">
              <div className="mb-6 flex justify-center">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Mic className="w-12 h-12 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Ready to build your plan?</h2>
              <p className="text-muted-foreground mb-8">Click the button below to start your voice-guided fitness assessment.</p>
              <Button onClick={startCall} size="lg" className="rounded-full px-8 h-14 text-lg">
                Start Voice Onboarding
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* FIXED: Replaced h-[300px] with h-75 */}
              <div className="h-75 overflow-y-auto border rounded-lg p-4 bg-slate-100/50 space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl ${m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white border rounded-tl-none'}`}>
                      <p className="text-sm">{m.content}</p>
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex justify-start">
                    <div className="bg-white border p-3 rounded-2xl rounded-tl-none flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center items-center gap-6 py-4">
                <div className={`p-4 rounded-full transition-all ${isSpeaking ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-slate-100 text-slate-400'}`}>
                  <Volume2 className="w-8 h-8" />
                </div>
                <div className={`p-6 rounded-full transition-all ${isListening ? 'bg-red-500 text-white scale-125 shadow-lg shadow-red-200' : 'bg-slate-200 text-slate-500'}`}>
                  {isListening ? <Mic className="w-10 h-10 animate-pulse" /> : <MicOff className="w-10 h-10" />}
                </div>
                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setCallActive(false)}>
                  <XCircle className="w-8 h-8" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}