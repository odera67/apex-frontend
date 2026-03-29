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

// =========================================================================
// 🛑 PASTE YOUR DEFAULT_FLOW AND DEFAULT_ERRORS ARRAYS HERE! 🛑
// (I removed them from this snippet so the chat doesn't cut off your text)
//
// const DEFAULT_FLOW: IntakeStep[] = [ ... ];
// const DEFAULT_ERRORS: ErrorRow[] = [ ... ];
// =========================================================================

const STAGE_ORDER = ["GREETING", "CONSENT", "INTRO", "AGE", "HEIGHT", "GOAL", "LEVEL", "DAYS", "EQUIPMENT", "ALLERGIES_CHECK", "ALLERGIES_DETAIL", "INJURIES_CHECK", "INJURIES_DETAIL", "CONFIRMATION", "DONE"]; 

const normalizeNumberWords = (text: string) => { 
  const numMap: { [key: string]: string } = { "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10", "eleven": "11", "twelve": "12", "thirteen": "13", "fourteen": "14", "fifteen": "15", "sixteen": "16", "seventeen": "17", "eighteen": "18", "nineteen": "19", "twenty": "20", "thirty": "30", "forty": "40", "fifty": "50", "sixty": "60", "seventy": "70", "eighty": "80", "ninety": "90", "hundred": "100" }; 
  let normalized = text.toLowerCase(); 
  for (const [word, digit] of Object.entries(numMap)) { 
    const regex = new RegExp(`\\b${word}\\b`, 'gi'); 
    normalized = normalized.replace(regex, digit); 
  } 
  return normalized; 
}; 

const humanDelay = () => new Promise(res => setTimeout(res, 600 + Math.random() * 600)); 

export default function GenerateProgramPage() { 
  const router = useRouter(); 
  const { user } = useUser();
  const [userDataset, setUserDataset] = useState<UserResponseRow[]>([]); 
  const [callActive, setCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [stage, setStage] = useState<string>("GREETING");
  const [inputText, setInputText] = useState("");
  const [waveHeights, setWaveHeights] = useState([4, 4, 4, 4, 4]);
  const [editingField, setEditingField] = useState<string | null>(null);

  const [userData, setUserData] = useState({
    age: "", weight: "", height: "", goal: "", level: "", days: "", equipment: "", allergies: "", injuries: ""
  });

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<string>("GREETING");
  const stepConfigRef = useRef<IntakeStep | null>(null);
  const isAiSpeakingRef = useRef(false);
  const processingRef = useRef(false);
  const callActiveRef = useRef(false);
  const userDataRef = useRef(userData);
  const userRef = useRef(user);

  const createPlan = useMutation(api.plans.createPlan);

  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { userDataRef.current = userData; }, [userData]);
  useEffect(() => { callActiveRef.current = callActive; }, [callActive]);
  useEffect(() => { userRef.current = user; }, [user]);

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

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

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
    
    // 🚀 NEW WEB FIX: Auto-restart if silence causes it to stop
    recognition.onend = () => {
      if (callActiveRef.current && !isAiSpeakingRef.current && !processingRef.current) {
        try { recognition.start(); } catch(e) {}
      } else {
        setIsListening(false);
      }
    };
    
    recognition.onresult = (event: any) => {
      if (processingRef.current) return;
      const transcript = event.results[0][0].transcript.trim();
      if (transcript.length > 0) {
        processingRef.current = true;
        handleUserResponse(transcript);
        setIsListening(false);
        try { recognition.stop(); } catch(e) {}
        setTimeout(() => { processingRef.current = false; }, 400);
      }
    };
    
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      synthRef.current?.cancel();
    };
  }, []);

  // 🚀 NATIVE ANDROID MIC TIMEOUT FIX
  const startListening = async () => {
    if (isAiSpeakingRef.current) return;
    
    let isNative = false;
    try {
      const { Capacitor } = await import('@capacitor/core');
      isNative = Capacitor.isNativePlatform();
    } catch (e) { isNative = false; }

    if (isNative) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        
        const permissions = await SpeechRecognition.checkPermissions();
        if (permissions.speechRecognition !== 'granted') {
          const req = await SpeechRecognition.requestPermissions().catch(() => ({ speechRecognition: 'denied' }));
          if (req.speechRecognition !== 'granted') {
            toast.error("Microphone Permission Denied!");
            return;
          }
        }

        setIsListening(true);
        const result = await SpeechRecognition.start({
          language: "en-US",
          maxResults: 1,
          prompt: "Speak now...",
          partialResults: false,
          popup: false,
        });
        
        setIsListening(false);
        if (result && result.matches && result.matches.length > 0) {
          const transcript = result.matches[0].trim();
          if (transcript.length > 0) {
            processingRef.current = true;
            handleUserResponse(transcript);
            setTimeout(() => { processingRef.current = false; }, 400);
          }
        }
      } catch (err: any) {
        const errMsg = err.message?.toLowerCase() || "";
        
        // Android strictly kills the mic after 3-4 seconds of silence. We instantly catch it and turn it back on!
        const isSilenceTimeout = errMsg.includes("no match") || errMsg.includes("no speech") || errMsg.includes("error 7") || errMsg.includes("error 6");
        
        if (isSilenceTimeout && callActiveRef.current && !isAiSpeakingRef.current && !processingRef.current) {
          setTimeout(() => {
            startListening();
          }, 50);
          return; 
        }

        setIsListening(false);
        if (!errMsg.includes("cancel") && !errMsg.includes("no match")) {
          console.error("Native Mic Error:", err);
        }
      }
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {}
    }
  };

  const stopListening = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        await SpeechRecognition.stop();
      }
    } catch(e) {}
    try { recognitionRef.current?.stop(); } catch(e) {}
    setIsListening(false);
  };

  const speak = async (text: string, onComplete?: () => void) => {
    stopListening();
    setIsSpeaking(true);
    isAiSpeakingRef.current = true;
    setMessages(prev => [...prev, { role: "assistant", content: text }]);

    let isNative = false;
    try {
      const { Capacitor } = await import('@capacitor/core');
      isNative = Capacitor.isNativePlatform();
    } catch(e) {}

    const failsafeTimeout = setTimeout(() => {
      setIsSpeaking(false);
      isAiSpeakingRef.current = false;
      if (onComplete && callActiveRef.current) onComplete();
    }, 15000);

    if (isNative) {
      try {
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
        await TextToSpeech.speak({
          text: text,
          lang: 'en-US',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
        });
        clearTimeout(failsafeTimeout);
        setIsSpeaking(false);
        isAiSpeakingRef.current = false;
        if (onComplete && callActiveRef.current) onComplete();
      } catch(e) {
        clearTimeout(failsafeTimeout);
        setIsSpeaking(false);
        isAiSpeakingRef.current = false;
        if (onComplete && callActiveRef.current) onComplete();
      }
    } else {
      if (!synthRef.current) return;
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synthRef.current.getVoices();
        utterance.voice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha")) || voices[0];
        utterance.rate = 1.05;

        utterance.onend = () => {
          clearTimeout(failsafeTimeout);
          setIsSpeaking(false);
          isAiSpeakingRef.current = false;
          setTimeout(() => {
            if (onComplete && callActiveRef.current) onComplete();
          }, 600);
        };
        utterance.onerror = () => {
          clearTimeout(failsafeTimeout);
          setIsSpeaking(false);
          isAiSpeakingRef.current = false;
          setTimeout(() => {
            if (onComplete && callActiveRef.current) onComplete();
          }, 600);
        };
        synthRef.current.speak(utterance);
      } catch (error) {
        clearTimeout(failsafeTimeout);
        setIsSpeaking(false);
        isAiSpeakingRef.current = false;
        if (onComplete && callActiveRef.current) onComplete();
      }
    }
  };

  const addMessage = (role: string, content: string) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isAiSpeakingRef.current) return;
    const text = inputText;
    setInputText("");
    handleUserResponse(text);
  };

  const handleUserResponse = async (text: string) => {
    if (stageRef.current.includes("GENERATING") || stageRef.current === "DONE") return;
    
    setInputText("");
    addMessage("user", text);
    
    const normalizedText = normalizeNumberWords(text);
    const textLower = normalizedText.toLowerCase();

    let mappedStageForDataset = stageRef.current;
    if (stageRef.current === "ALLERGIES_DETAIL") mappedStageForDataset = "ALLERGIES_CHECK";
    if (stageRef.current === "INJURIES_DETAIL") mappedStageForDataset = "INJURIES_CHECK";

    let isValid = true;
    let isNegativeResponse = false;
    
    const currentConfig = stepConfigRef.current;

    if (currentConfig?.isConditional || currentConfig?.stage === "CONSENT" || currentConfig?.stage === "GREETING" || currentConfig?.stage === "CONFIRMATION") {
      if (textLower.match(/\b(no|nope|none|nah|not at all|nothing)\b/i)) {
        isNegativeResponse = true;
      } else if (!textLower.match(/\b(yes|yeah|sure|ok|okay|yep|agree)\b/i) && currentConfig?.stage !== "ALLERGIES_DETAIL" && currentConfig?.stage !== "INJURIES_DETAIL") {
        if (textLower.length < 10) {
          isValid = false;
        }
      }
    } else if (currentConfig?.saveField === "goal") {
      if (!textLower.includes("loss") && !textLower.includes("gain") && !textLower.includes("muscle") && !textLower.includes("fit")) isValid = false;
    } else if (currentConfig?.saveField === "level") {
      if (!textLower.includes("begin") && !textLower.includes("inter") && !textLower.includes("adv")) isValid = false;
    } else if (currentConfig?.saveField === "equipment") {
      if (!textLower.includes("gym") && !textLower.includes("dumb") && !textLower.includes("body")) isValid = false;
    } else if (currentConfig?.saveField === "age" || currentConfig?.saveField === "weight" || currentConfig?.saveField === "height" || currentConfig?.saveField === "days") {
      if (!textLower.match(/\d/)) isValid = false;
    }

    if (!isValid) {
      const stageErrors = DEFAULT_ERRORS.find(e => e.stage === stageRef.current);
      let errStr = stageErrors ? stageErrors.text : "I didn't quite catch that. Can you repeat?";
      const errOptions = errStr.split('|');
      let finalErr = errOptions[Math.floor(Math.random() * errOptions.length)];
      speak(finalErr, startListening);
      return;
    }

    let updatedData = { ...userDataRef.current };
    
    if (currentConfig?.saveField && !isNegativeResponse) {
      let valueToSave = text;
      
      if (currentConfig.saveField === "goal") {
        if (textLower.includes("loss") || textLower.includes("lose")) valueToSave = "lose weight";
        else if (textLower.includes("gain") || textLower.includes("muscle")) valueToSave = "build muscle";
        else valueToSave = "general fitness";
      } else if (currentConfig.saveField === "level") {
        if (textLower.includes("begin")) valueToSave = "beginner";
        else if (textLower.includes("inter")) valueToSave = "intermediate";
        else if (textLower.includes("adv")) valueToSave = "advanced";
      } else if (currentConfig.saveField === "equipment") {
        if (textLower.includes("gym")) valueToSave = "full gym";
        else if (textLower.includes("dumb")) valueToSave = "dumbbells";
        else valueToSave = "bodyweight";
      } else if (currentConfig.saveField === "weight") {
        const numMatch = textLower.match(/(\d+(?:\.\d+)?)/);
        const unitMatch = textLower.match(/(kg|kilo|lbs|pound)/i);
        if (numMatch) {
          const amount = numMatch[1];
          const unit = unitMatch ? (unitMatch[1].toLowerCase().startsWith('k') ? 'kg' : 'lbs') : 'kg';
          valueToSave = `${amount} ${unit}`;
        }
      } else if (currentConfig.saveField === "height") {
        if (textLower.includes("cm") || textLower.includes("centimeters")) {
          const cmMatch = textLower.match(/(\d+)/);
          if (cmMatch) valueToSave = `${cmMatch[1]} cm`;
        } else {
          const ftMatch = textLower.match(/(\d+)\s*(?:foot|feet|ft|'|\s)?\s*(\d+)?/i);
          if (ftMatch) {
            const feet = ftMatch[1];
            const inches = ftMatch[2] || "0";
            valueToSave = `${feet}'${inches}"`;
          }
        }
      } else if (currentConfig.saveField === "age" || currentConfig.saveField === "days") {
        const numberMatch = textLower.match(/(\d+)/);
        if (numberMatch) valueToSave = numberMatch[1];
      }
      
      if (valueToSave !== "") {
        updatedData[currentConfig.saveField as keyof typeof updatedData] = valueToSave;
        setUserData(updatedData);
        userDataRef.current = updatedData;
      }
    }

    setIsThinking(true);
    await humanDelay();
    setIsThinking(false);

    let targetStage = "DONE";
    if (currentConfig?.isConditional && isNegativeResponse) targetStage = currentConfig.nextStageIfNo || "DONE";
    else if (currentConfig?.nextStage) targetStage = currentConfig.nextStage;

    let baseConfig = DEFAULT_FLOW.find(s => s.stage === targetStage) || DEFAULT_FLOW.find(s => s.stage === "DONE")!;
    setStage(targetStage);
    stageRef.current = targetStage;
    stepConfigRef.current = baseConfig;

    let replyOptionsStr = isNegativeResponse && currentConfig?.isConditional ? currentConfig.repliesIfNo : baseConfig.replies;
    const replyOptions = replyOptionsStr.split('|').filter(r => r.trim() !== "");
    let finalReply = replyOptions.length > 0 ? replyOptions[Math.floor(Math.random() * replyOptions.length)] : "Alright, putting this together now.";
    
    if (finalReply.includes("[Name]")) finalReply = finalReply.replace(/\[Name\]/g, userRef.current?.firstName || "there");
    
    // Empathy injections
    if (currentConfig?.stage === "LEVEL") {
      const level = updatedData.level.toLowerCase();
      if (level.includes("beginner") || level.includes("new") || level.includes("start") || level.includes("novice")) {
        finalReply = "We all start somewhere. Don't even sweat it, I'll build this so it's challenging but totally doable. " + finalReply;
      }
    } else if (currentConfig?.stage === "INJURIES_DETAIL" || (currentConfig?.stage === "INJURIES_CHECK" && !isNegativeResponse)) {
      if (updatedData.injuries && updatedData.injuries !== "none" && updatedData.injuries.length > 2) {
        finalReply = "Man, dealing with injuries is tough. Don't worry, we'll build this specifically to keep you safe while still making gains. " + finalReply;
      }
    }

    if (targetStage === "DONE") {
      speak(finalReply);
      await generateAndSavePlan(updatedData);
    } else {
      speak(finalReply, startListening);
    }
  };

  const generateAndSavePlan = async (finalData: typeof userData) => {
    setIsThinking(true);
    try {
      const response = await fetch("https://apex-ai-backend-yfn8.onrender.com/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: finalData.age || "25",
          weight: finalData.weight || "70",
          height: finalData.height || "170",
          level: finalData.level || "beginner",
          goal: finalData.goal || "lose weight",
          injuries: finalData.injuries || "none",
          allergies: finalData.allergies || "none",
          days: finalData.days || "3",
          equipment: finalData.equipment || "full gym"
        }),
      });

      if (!response.ok) throw new Error("Backend response not OK");
      const aiData = await response.json();

      if (aiData.injuries_detected && aiData.injuries_detected.length > 0) {
        toast.success(`Plan adjusted automatically for detected injuries: ${aiData.injuries_detected.join(", ")}`);
      }

      await createPlan({
        userId: userRef.current?.id || "guest",
        name: `${userRef.current?.firstName || "User"}'s ${finalData.goal || "Fitness"} Plan`,
        isActive: true,
        userStats: {
          age: String(finalData.age || "25"),
          height: String(finalData.height || "170 cm"),
          weight: String(finalData.weight || "70 kg"),
          level: String(finalData.level || "beginner"),
          goal: String(finalData.goal || "general fitness"),
          equipment: String(finalData.equipment || "full gym"),
          allergies: String(finalData.allergies || "none"),
          injuries: String(finalData.injuries || "none")
        },
        workoutPlan: {
          schedule: aiData.workoutPlan?.schedule || [],
          exercises: (aiData.workoutPlan?.exercises || []).map((dayEx: any) => ({
            day: String(dayEx.day),
            routines: (dayEx.routines || []).map((r: any) => ({
              name: String(r.name),
              sets: Number(r.sets) || 3,
              reps: String(r.reps),
              description: r.description ? String(r.description) : undefined
            }))
          }))
        },
        dietPlan: {
          dailyCalories: Number(aiData.dietPlan?.dailyCalories) || 2000,
          dailyPlans: aiData.dietPlan?.dailyPlans || []
        }
      });

      setIsThinking(false);
      toast.success("Protocol Generated Successfully!");
      setTimeout(() => {
        router.push("/profile");
      }, 3000);

    } catch (error) {
      console.error(error);
      setIsThinking(false);
      toast.error("Generation failed. Please try again.");
      setStage("CONFIRMATION");
    }
  };

  const toggleCall = async () => {
    if (callActive) {
      setCallActive(false);
      setIsSpeaking(false);
      setIsListening(false);
      stopListening();
      
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
          await TextToSpeech.stop();
        } else {
          synthRef.current?.cancel();
        }
      } catch(e) {}
      
      setUserData({age: "", weight: "", height: "", goal: "", level: "", days: "", equipment: "", allergies: "", injuries: ""});
      setStage("GREETING");
    } else {
      setCallActive(true);
      setMessages([]);
      let baseConfig = DEFAULT_FLOW.find(s => s.stage === "GREETING")!;
      stepConfigRef.current = baseConfig;
      setStage("GREETING");
      
      const replyOptions = baseConfig.replies.split('|');
      let greeting = replyOptions[Math.floor(Math.random() * replyOptions.length)];
      if (userRef.current?.firstName && !greeting.includes(userRef.current?.firstName)) {
        greeting = greeting.replace(/^(Hey|What's up|Welcome in|So, I'm|Alright, let's)[!|,]/i, `$1 ${userRef.current?.firstName},`);
      }
      speak(greeting, startListening);
    }
  };

  const handleEditSave = (field: string, newValue: string) => {
    setUserData(prev => ({ ...prev, [field]: newValue }));
    setEditingField(null);
  };

  const downloadFitnessID = () => {
    // Hidden to save space since it wasn't modified!
    toast.success("ID Downloaded!");
  };

  const progressPercent = Math.round((STAGE_ORDER.indexOf(stage) / (STAGE_ORDER.length - 1)) * 100) || 0;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-6 pt-24">
      {!callActive ? (
        <div className="flex-grow flex flex-col items-center justify-center px-4 text-center">
          <div className="space-y-6 max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter uppercase">
              Initialize <span className="text-primary">Protocol</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              No forms. No boring surveys. Just a real conversation with Apex to build your perfect plan.
            </p>
            <div className="flex justify-center pt-6">
              <Button size="lg" onClick={toggleCall} className="group h-20 px-12 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-xl">
                <span className="text-2xl font-black italic tracking-widest mr-2">START</span>
                <Mic className="w-6 h-6 ml-2 group-hover:animate-pulse" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 max-w-6xl mt-4">
          <div className="mb-6 px-2">
            <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
              <span>Intake Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Card className="relative overflow-hidden flex flex-col items-center justify-center bg-black/5 border-primary/20 shadow-sm py-4 md:py-6">
                  <div className={`absolute inset-0 bg-primary/20 rounded-full blur-3xl transition-all duration-500 ${isSpeaking ? "scale-150 opacity-100" : "scale-50 opacity-0"}`} />
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`relative size-16 md:size-24 rounded-full border-4 border-primary/50 flex items-center justify-center bg-background shadow-xl overflow-hidden ${isSpeaking ? "scale-110 border-primary" : "scale-100"}`}>
                      <img src="ai-avatar.png" alt="AI Trainer" className="size-full object-cover p-2" />
                    </div>
                    <h3 className="mt-3 font-bold text-lg">Apex</h3>
                    <div className="mt-1 h-5 flex items-center justify-center">
                      {isSpeaking ? <span className="flex items-center gap-1.5 text-primary text-xs font-medium"><Volume2 className="w-3 h-3 animate-pulse" /> Speaking...</span> : <span className="text-muted-foreground text-xs font-medium">Waiting...</span>}
                    </div>
                  </div>
                </Card>

                <Card className="relative overflow-hidden flex flex-col items-center justify-center bg-muted/30 border-border shadow-sm py-4 md:py-6">
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`relative size-16 md:size-24 rounded-full border-4 ${isListening ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "border-muted"} flex items-center justify-center overflow-hidden bg-background transition-all duration-300`}>
                      <img src={user?.imageUrl || "https://github.com/shadcn.png"} alt="You" className="size-full object-cover" />
                    </div>
                    <h3 className="mt-3 font-bold text-lg">You</h3>
                    <div className="mt-1 h-5 flex items-center justify-center">
                      {isListening ? (
                        <div className="flex items-end gap-1 h-4">
                          {waveHeights.map((h, i) => (
                            <div key={i} className="w-1 bg-green-500 rounded-full transition-all duration-150" style={{ height: `${h}px` }} />
                          ))}
                        </div>
                      ) : <span className="text-muted-foreground text-xs font-medium">Muted</span>}
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="flex-1 bg-card border-border shadow-sm overflow-hidden flex flex-col">
                <div ref={messageContainerRef} className="flex-1 h-[300px] overflow-y-auto p-4 space-y-4 bg-background/50 scroll-smooth">
                  {messages.length === 0 && !isThinking && (
                    <div className="flex h-full items-center justify-center text-muted-foreground font-medium">Session initialized. Listening...</div>
                  )}
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3 text-sm md:text-base shadow-sm leading-relaxed ${msg.role === "assistant" ? "bg-muted text-foreground rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm"}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="bg-muted text-foreground rounded-2xl rounded-tl-sm px-5 py-3 text-sm shadow-sm flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="animate-pulse">Apex is analyzing...</span>
                      </div>
                    </div>
                  )}
                </div>

                {callActive && stage !== "DONE" && (
                  <div className="p-3 bg-muted/50 border-t border-border flex flex-wrap items-center gap-2">
                    <Button type="button" size="icon" variant="outline" onClick={() => setMessages(prev => prev.slice(0, -1))} disabled={messages.length === 0 || isSpeaking || isThinking} className="rounded-full shrink-0" title="Undo Last Answer">
                      <Undo2 className="w-4 h-4" />
                    </Button>
                    <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
                      <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isSpeaking || isThinking} placeholder={isSpeaking || isThinking ? "Wait for Apex to finish speaking..." : "Type your answer here..."} className="flex-1 bg-background border border-border rounded-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed" />
                      <Button type="submit" size="icon" disabled={!inputText.trim() || isSpeaking || isThinking} className="rounded-full shrink-0">
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                    <Button onClick={() => isListening ? stopListening() : startListening()} variant={isListening ? "default" : "outline"} className={`rounded-full shrink-0 shadow-sm transition-all ${isListening ? "bg-green-500 hover:bg-green-600 text-white border-none" : "text-primary border-primary"}`}>
                      {isListening ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-4">
              <Card className="p-5 bg-card border-border shadow-sm flex flex-col flex-1">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                  <div className="flex items-center gap-2 text-primary">
                    <Activity className="w-5 h-5" />
                    <h3 className="font-bold text-lg">Live Extraction</h3>
                  </div>
                  <Button onClick={downloadFitnessID} size="sm" variant="ghost" className="h-8 gap-1 text-xs text-muted-foreground hover:text-primary">
                    <Download className="w-3 h-3" /> ID
                  </Button>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                  {Object.entries(userData).map(([key, value]) => (
                    <div key={key} className="flex flex-col group">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                        {key.replace("_", " ")}
                        {value && <Check className="w-3 h-3 text-green-500" />}
                      </span>
                      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2.5 min-h-[44px] border border-transparent transition-colors group-hover:border-border">
                        {editingField === key ? (
                          <div className="flex items-center w-full gap-2">
                            <input type="text" defaultValue={value} autoFocus onBlur={(e) => handleEditSave(key, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(key, e.currentTarget.value); }} className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary outline-none" />
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-green-500"><Check className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <>
                            <span className="font-semibold text-foreground truncate max-w-[200px]">{value || "--"}</span>
                            {callActive && stage !== "DONE" && (
                              <button onClick={() => setEditingField(key)} className="text-muted-foreground hover:text-primary transition-colors p-1">
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <div className="flex justify-center mt-4">
            <Button size="lg" onClick={toggleCall} disabled={stage === "GENERATING" || stage === "DONE"} className="rounded-full px-12 py-6 text-lg shadow-xl bg-destructive hover:bg-destructive/90 text-white">
              {stage === "DONE" || isThinking ? <><Loader2 className="mr-2 animate-spin" /> Generating Plan...</> : "End Session"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}