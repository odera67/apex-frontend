"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import  { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader2, Mic, MicOff, Send, Activity } from "lucide-react";
import { toast } from "sonner"; 

// ==========================================
// 🚀 MASSIVE RESPONSE & ERROR VARIATIONS
// ==========================================
const READY_ERRORS = [
  "I didn't quite catch that. Please answer by saying 'yes' if you are ready to begin.",
  "Could you repeat that? Just say 'yes' if you are ready for your check-in.",
  "I missed that. Please say 'yes' to start the session.",
  "Please answer clearly. Are you ready to begin? Say 'yes' or 'no'.",
  "I didn't understand. If you're ready, just say 'yes'.",
  "Could you say that again? Say 'yes' to get started.",
  "I didn't catch your response. Please say 'yes' if you are ready.",
  "Please speak clearly. Are you ready? Say 'yes'.",
  "I need a clear answer. Please say 'yes' to begin your check-in.",
  "Sorry, I missed that. Just say 'yes' if you are ready to start."
];

const WEIGHT_PROMPTS_MEM = [
  "Awesome. Let's start with a quick check in. Last time you weighed in at [WEIGHT] kilograms. What is your current weight today?",
  "Great to see you! Your previous weight was [WEIGHT] kg. What does the scale say today?",
  "Let's get started. You were [WEIGHT] kilos last week. How much do you weigh now?",
  "Welcome back! Last time we recorded [WEIGHT] kg. What is your weight today?",
  "Perfect. To kick things off, your last weight was [WEIGHT]. What is it currently?"
];

const WEIGHT_PROMPTS_NO_MEM = [
  "Awesome. Let's start with a quick check in. What is your current weight?",
  "Great to see you! To kick things off, what is your current weight?",
  "Let's get started. How much do you weigh today?",
  "Welcome back! Let's start by updating your stats. What is your current weight?",
  "Perfect. First question: what is your current weight?"
];

const WEIGHT_ERRORS = [
  "I didn't catch a valid weight. Please answer by saying a number, like '70 kilos' or '150 pounds'.",
  "Could you repeat your weight? Please include a number like '80'.",
  "I need a number for your weight. For example, '75'.",
  "Please say a number for your current weight.",
  "I missed your weight. Please state it clearly as a number."
];

const FEEDBACK_PROMPTS = [
  "Got it. How did the workouts feel this past week? Were they too easy, too hard, or just right?",
  "Noted. How was the difficulty of your workouts last week? Too hard, too easy, or perfect?",
  "Recorded. Did last week's workouts feel too challenging, too easy, or just right?",
  "Thanks. How would you rate the intensity of last week's plan? Easy, hard, or balanced?",
  "Got that. Were the exercises from last week too easy, too hard, or just right?"
];

const FEEDBACK_ERRORS = [
  "I didn't quite get that. Were the workouts easy, hard, or just right?",
  "Please tell me if the workouts were too hard or too easy.",
  "I missed that. How did the workouts feel?",
  "Could you repeat your feedback? Easy, hard, or perfect?",
  "I didn't understand. Just say if it was too easy, too hard, or just right."
];

const DAYS_PROMPTS = [
  "Noted. Finally, how many days can you commit to working out next week?",
  "Got that. How many days will you train next week?",
  "Thanks. How many days can you work out next week?",
  "Perfect. How many days a week are you available next week?",
  "Okay. How many days can you commit to the gym next week?"
];

const DAYS_ERRORS = [
  "I need a number between 1 and 7. Please answer by saying a number like '3' or '4'.",
  "I didn't catch the days. Please say a number between one and seven.",
  "Could you repeat that? Just say a number for how many days you can train.",
  "Please provide a number of days, for example, 'five'.",
  "I missed the number of days. Please state a number clearly."
];

const FINALIZING_PROMPTS = [
  "Awesome, [DAYS] days it is. Generating your new plan now.",
  "Perfect, [DAYS] days. I'm building your updated plan now.",
  "Great, [DAYS] days next week. Let me adjust your plan.",
  "Got it, [DAYS] days. Generating your next week's routine.",
  "Understood, [DAYS] days. I am adapting your plan now."
];

// 🚀 NUMBER WORD TRANSLATOR
const normalizeNumberWords = (text: string) => {
  const numMap: { [key: string]: string } = {
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
    "eleven": "11", "twelve": "12", "thirteen": "13", "fourteen": "14",
    "fifteen": "15", "sixteen": "16", "seventeen": "17", "eighteen": "18",
    "nineteen": "19", "twenty": "20", "thirty": "30", "forty": "40",
    "fifty": "50", "sixty": "60", "seventy": "70", "eighty": "80",
    "ninety": "90", "hundred": "100"
  };
  
  let normalized = text.toLowerCase();
  for (const [word, digit] of Object.entries(numMap)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, digit);
  }
  return normalized;
};

export default function CheckInPage() {
  const { user } = useUser();
  const router = useRouter();
  
  const activePlan = useQuery(api.plans.getLatestUserPlan, user ? { userId: user.id } : "skip");
  const updatePlan = useMutation(api.plans.updatePlan);

  const [callActive, setCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  
  const [stage, setStage] = useState<string>("WELCOME_BACK"); 
  const [inputText, setInputText] = useState("");
  const [waveHeights, setWaveHeights] = useState([4, 4, 4, 4, 4]);
  const [checkInData, setCheckInData] = useState({ newWeight: "", feedback: "", days: "" });

  // 🚀 ROCK-SOLID REFS: Prevents the microphone from dropping connections!
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<string>("WELCOME_BACK");
  const isAiSpeakingRef = useRef(false);
  const processingRef = useRef(false);

  // Keep Refs in sync with state
  useEffect(() => { stageRef.current = stage; }, [stage]);

  // Auto-scroll
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Audio wave visualizer
  useEffect(() => {
    let interval: any;
    if (isListening) {
      interval = setInterval(() => {
        setWaveHeights(Array.from({length: 5}, () => Math.floor(Math.random() * 20) + 4));
      }, 150);
    } else {
      setWaveHeights([4, 4, 4, 4, 4]);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  // 🚀 INITIALIZE SPEECH ONLY ONCE
  useEffect(() => {
    if (typeof window === "undefined") return;
    synthRef.current = window.speechSynthesis;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.lang = "en-US"; 
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      if (processingRef.current) return;
      processingRef.current = true;
      
      const transcript = event.results[0][0].transcript.trim();
      
      // 🚀 FIX: Length > 0 allows "ok" and "no" to register!
      if (transcript.length > 0) {
        handleUserResponse(transcript);
      }
      
      setIsListening(false);
      stopListening();
      
      setTimeout(() => { processingRef.current = false; }, 400);
    };
    
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => { recognition.abort(); synthRef.current?.cancel(); };
  }, []); // <-- 🚀 Empty array ensures the mic never disconnects wildly

  const startListening = () => {
    if (isAiSpeakingRef.current) return;
    try { recognitionRef.current?.start(); } catch {}
  };

  const stopListening = () => { 
    try { recognitionRef.current?.stop(); } catch {} 
  };

  const speak = (text: string, onComplete?: () => void) => {
    if (!synthRef.current) return;
    stopListening();
    setIsSpeaking(true);
    isAiSpeakingRef.current = true;
    setMessages(prev => [...prev, { role: "assistant", content: text }]);

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    utterance.voice = voices.find(v => v.name.includes("Google US English")) || voices[0];
    utterance.rate = 1.05;

    utterance.onend = () => {
      setIsSpeaking(false);
      isAiSpeakingRef.current = false;
      if (onComplete) onComplete();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      isAiSpeakingRef.current = false;
      if (onComplete) onComplete();
    };
    synthRef.current.speak(utterance);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSpeaking) return;
    const text = inputText;
    setInputText("");
    handleUserResponse(text);
  };

  const getRandomResponse = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  const handleUserResponse = async (text: string) => {
    if (stageRef.current === "DONE" || stageRef.current === "ADJUST_PLAN") return;
    
    setInputText(""); 
    setMessages(prev => [...prev, { role: "user", content: text }]);
    
    const normalizedText = normalizeNumberWords(text);
    const textLower = normalizedText.toLowerCase();

    // Uses stageRef.current to always have the correct state
    if (stageRef.current === "WELCOME_BACK" && textLower.match(/\b(no|nope|nah|not ready|later)\b/i)) {
      speak("No problem at all! I'll be right here when you are ready to check in.");
      setTimeout(() => toggleCall(), 4000); 
      return;
    }

    if (stageRef.current === "WELCOME_BACK") {
      const isReady = /\b(yes|yeah|sure|ok|okay|yep|agree|ready|let's go)\b/i.test(textLower);
      
      if (!isReady) {
        speak(getRandomResponse(READY_ERRORS), startListening);
        return;
      }

      setStage("NEW_WEIGHT");
      stageRef.current = "NEW_WEIGHT";
      
      const prevWeightRaw = activePlan?.userStats?.weight || "";
      const prevWeightNum = prevWeightRaw.toString().replace(/[^0-9.]/g, "").trim();

      if (prevWeightNum) {
        let prompt = getRandomResponse(WEIGHT_PROMPTS_MEM);
        prompt = prompt.replace("[WEIGHT]", prevWeightNum);
        speak(prompt, startListening);
      } else {
        speak(getRandomResponse(WEIGHT_PROMPTS_NO_MEM), startListening);
      }
      return;
    }

    if (stageRef.current === "NEW_WEIGHT") {
      const weightMatch = textLower.match(/(\d+(?:\.\d+)?)/);
      if (!weightMatch) {
        speak(getRandomResponse(WEIGHT_ERRORS), startListening);
        return;
      }
      setCheckInData(prev => ({ ...prev, newWeight: weightMatch[1] }));
      setStage("WORKOUT_FEEDBACK");
      stageRef.current = "WORKOUT_FEEDBACK";
      speak(getRandomResponse(FEEDBACK_PROMPTS), startListening);
      return;
    }

    if (stageRef.current === "WORKOUT_FEEDBACK") {
      if (textLower.length < 2) {
        speak(getRandomResponse(FEEDBACK_ERRORS), startListening);
        return;
      }
      setCheckInData(prev => ({ ...prev, feedback: textLower }));
      setStage("NEXT_WEEK_DAYS");
      stageRef.current = "NEXT_WEEK_DAYS";
      speak(getRandomResponse(DAYS_PROMPTS), startListening);
      return;
    }

    if (stageRef.current === "NEXT_WEEK_DAYS") {
      const dayMatch = textLower.match(/(\d+)/);
      if (!dayMatch || parseInt(dayMatch[1]) < 1 || parseInt(dayMatch[1]) > 7) {
        speak(getRandomResponse(DAYS_ERRORS), startListening);
        return;
      }
      setCheckInData(prev => ({ ...prev, days: dayMatch[1] }));
      setStage("ADJUST_PLAN");
      stageRef.current = "ADJUST_PLAN";
      
      let finalPrompt = getRandomResponse(FINALIZING_PROMPTS);
      finalPrompt = finalPrompt.replace("[DAYS]", dayMatch[1]);
      speak(finalPrompt);

      await processCheckIn(checkInData.newWeight, checkInData.feedback, dayMatch[1]);
      return;
    }
  };

  const processCheckIn = async (weight: string, feedback: string, days: string) => {
    setIsThinking(true);
    try {
      let nextWeekNum = 2;
      if (activePlan?.workoutPlan?.schedule && activePlan.workoutPlan.schedule.length > 0) {
        const firstDayString = activePlan.workoutPlan.schedule[0];
        const weekMatch = firstDayString.match(/Week\s+(\d+)/i);
        if (weekMatch) nextWeekNum = parseInt(weekMatch[1], 10) + 1;
      }

      const payload = {
        weight: weight,
        feedback: feedback,
        days: days,
        week_number: nextWeekNum,
        userStats: {
          age: activePlan?.userStats?.age || "25",
          height: activePlan?.userStats?.height || "170",
          weight: `${weight} kg`,
          level: activePlan?.userStats?.level || "beginner",
          goal: activePlan?.userStats?.goal || "lose weight",
          equipment: activePlan?.userStats?.equipment || "full gym",
          allergies: activePlan?.userStats?.allergies || "none",
          injuries: activePlan?.userStats?.injuries || "none"    
        }
      };

      const response = await fetch("https://apex-ai-backend-yfn8.onrender.com/api/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error("Failed to adapt plan");
      const result = await response.json();

      if (activePlan) {
        await updatePlan({
          planId: activePlan._id,
          newWeight: weight,
          updatedWorkoutPlan: {
            schedule: result.updatedWorkoutPlan.schedule,
            exercises: result.updatedWorkoutPlan.exercises
          },
          updatedDietPlan: {
            dailyCalories: result.updatedDietPlan.dailyCalories,
            dailyPlans: result.updatedDietPlan.dailyPlans
          }
        });
      }

      setStage("DONE");
      stageRef.current = "DONE";
      setIsThinking(false);
      speak("Your check-in is complete and your new plan is ready. Taking you back to your dashboard.");
      
      if (result.injuries_detected && result.injuries_detected.length > 0) {
        toast.success(`Plan adjusted for: ${result.injuries_detected.join(", ")}`);
      }

      setTimeout(() => {
        router.push("/profile");
      }, 3000);

    } catch (error: any) {
      console.error("Critical Check-In Error:", error);
      setIsThinking(false);
      toast.error(`Check-in failed: ${error.message}`);
      speak("I encountered an error trying to save your check-in.");
      setStage("DONE");
      stageRef.current = "DONE";
      setTimeout(() => router.push("/profile"), 2000);
    }
  };

  const toggleCall = () => {
    if (callActive) {
      setCallActive(false);
      setIsSpeaking(false);
      setIsListening(false);
      stopListening();
      synthRef.current?.cancel();
      setStage("WELCOME_BACK");
      stageRef.current = "WELCOME_BACK";
      setCheckInData({ newWeight: "", feedback: "", days: "" });
    } else {
      setCallActive(true);
      setMessages([]);
      setStage("WELCOME_BACK");
      stageRef.current = "WELCOME_BACK";
      
      const greetings = [
        `Welcome back, ${user?.firstName || "User"}! Are you ready for your weekly check-in?`,
        `Hey ${user?.firstName || "there"}! Ready to crush your check-in?`,
        `Hello ${user?.firstName || "User"}! Shall we start your weekly review?`,
        `Welcome ${user?.firstName || "back"}! Are you ready to update your plan?`
      ];
      speak(getRandomResponse(greetings), startListening);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-6 pt-24">
      {!callActive ? (
        <div className="flex-grow flex flex-col items-center justify-center px-4 text-center">
          <div className="space-y-6 max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter uppercase">
              Weekly <span className="text-primary">Check-In</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Let's review your progress and dynamically adapt your plan for next week.
            </p>
            <div className="flex justify-center pt-6">
              <Button 
                size="lg" 
                onClick={toggleCall} 
                className="group h-20 px-12 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-xl"
              >
                {activePlan === undefined ? <Loader2 className="animate-spin" /> : <span className="text-2xl font-black italic">START CHECK-IN</span>}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 max-w-6xl mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: CHAT INTERFACE */}
            <div className="lg:col-span-2 flex flex-col space-y-4">
              <Card className="w-full bg-card border-border shadow-sm overflow-hidden flex flex-col">
                <div ref={messageContainerRef} className="h-[500px] overflow-y-auto p-4 space-y-4 bg-background/50 scroll-smooth">
                  {messages.length === 0 && !isThinking && (
                    <div className="flex h-full items-center justify-center text-muted-foreground font-medium">Listening...</div>
                  )}
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.role === "assistant" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="bg-muted text-foreground rounded-2xl px-4 py-2 text-sm shadow-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="animate-pulse">Apex is analyzing and adjusting...</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {callActive && stage !== "DONE" && (
                  <div className="p-3 bg-muted/50 border-t border-border flex items-center gap-2">
                    <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
                      <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={isSpeaking}
                        placeholder={isSpeaking ? "Wait for Apex..." : "Type your response..."} 
                        className="flex-1 bg-background border border-border rounded-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <Button type="submit" size="icon" disabled={!inputText.trim() || isSpeaking} className="rounded-full shrink-0">
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                    <Button
                      onClick={isListening ? stopListening : startListening}
                      disabled={isSpeaking}
                      variant={isListening ? "default" : "outline"}
                      className={`rounded-full shrink-0 shadow-sm transition-all ${isListening ? "bg-green-500 hover:bg-green-600 text-white border-none" : "text-primary border-primary"}`}
                    >
                      {isListening ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </Card>
              
              <div className="flex justify-center mt-2">
                <Button size="lg" onClick={toggleCall} variant="destructive" className="rounded-full px-8 shadow-sm">
                  Cancel Check-in
                </Button>
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE EXTRACTION SUMMARY */}
            <div className="lg:col-span-1">
              <Card className="w-full bg-card border-border shadow-sm overflow-hidden sticky top-24 p-6">
                <div className="flex flex-col items-center justify-center mb-6 pb-6 border-b border-border">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-inner mb-4 transition-colors duration-500 ${isSpeaking ? 'bg-primary/20' : isListening ? 'bg-green-500/20' : 'bg-muted'}`}>
                    {isListening ? (
                      <div className="flex items-end justify-center gap-1 h-8">
                        {waveHeights.map((h, i) => (
                          <div key={i} className="w-1.5 bg-green-500 rounded-full transition-all duration-150" style={{ height: `${h}px` }} />
                        ))}
                      </div>
                    ) : isSpeaking ? (
                      <Activity className="w-10 h-10 text-primary animate-pulse" />
                    ) : (
                      <MicOff className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Live Extraction</h2>
                  <p className="text-sm text-muted-foreground mt-1 text-center">
                    {isThinking ? "Finalizing weekly plan..." : isListening ? "Listening to your update..." : isSpeaking ? "Apex is speaking..." : "Ready."}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-muted/50 rounded-xl border border-border/50">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">New Weight</span>
                    <span className="font-semibold text-foreground truncate block">
                      {checkInData.newWeight ? `${checkInData.newWeight} kg` : "--"}
                    </span>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl border border-border/50">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Workout Feedback</span>
                    <span className="font-semibold text-foreground capitalize truncate block">
                      {checkInData.feedback || "--"}
                    </span>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl border border-border/50">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Days Next Week</span>
                    <span className="font-semibold text-foreground truncate block">
                      {checkInData.days ? `${checkInData.days} days` : "--"}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}