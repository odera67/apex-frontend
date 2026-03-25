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

const DEFAULT_FLOW: IntakeStep[] = [
  { stage: "GREETING", saveField: "", nextStage: "CONSENT", replies: "Hello! My name is Apex, your virtual coach. Are you ready to get started?|Hey there! I'm Apex, your AI trainer. Are you ready to build your plan?|Welcome! I am Apex. Are you ready to begin?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "CONSENT", saveField: "", nextStage: "INTRO", replies: "Before we dive in, do I have your consent to collect some basic health data to build your plan?|First, do you consent to sharing fitness data so I can customize your plan?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "INTRO", saveField: "age", nextStage: "AGE", replies: "Awesome! First up, how old are you?|Great! To begin, what is your current age?|Perfect. Let's start with the basics. How old are you?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "AGE", saveField: "weight", nextStage: "HEIGHT", replies: "Got it. How much do you weigh?|Noted. What is your current weight?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "HEIGHT", saveField: "height", nextStage: "GOAL", replies: "Noted. And what is your height?|Got it. How tall are you?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "GOAL", saveField: "goal", nextStage: "LEVEL", replies: "Perfect. What is your primary fitness goal?|Great. What are you trying to achieve right now?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "LEVEL", saveField: "level", nextStage: "DAYS", replies: "Great. What is your current fitness level?|Got it. How would you rate your fitness experience?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "DAYS", saveField: "days", nextStage: "EQUIPMENT", replies: "Awesome. How many days a week can you commit to working out?|Got it. How many days per week can you train?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "EQUIPMENT", saveField: "equipment", nextStage: "ALLERGIES_CHECK", replies: "Got it. What equipment will you use?|Thanks. Where will you work out?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "ALLERGIES_CHECK", saveField: "allergies", nextStage: "ALLERGIES_DETAIL", replies: "Got it. Do you have any food allergies or dietary restrictions?|Thanks. Are you allergic to any foods?", isConditional: true, nextStageIfNo: "INJURIES_CHECK", repliesIfNo: "Okay, no allergies. Next, do you have any physical injuries?|Got it, no allergies. Do you have any physical injuries?", dependsOnField: "", dependsOnValue: "" },
  { stage: "ALLERGIES_DETAIL", saveField: "allergies", nextStage: "INJURIES_CHECK", replies: "Got it. What are your allergies?|Please tell me which foods you are allergic to.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "INJURIES_CHECK", saveField: "injuries", nextStage: "INJURIES_DETAIL", replies: "Lastly, do you have any physical injuries I should work around?|Finally, do you have any physical injuries?", isConditional: true, nextStageIfNo: "CONFIRMATION", repliesIfNo: "Alright, no injuries. Let's review your details.|Got it, no injuries. Let's review everything.", dependsOnField: "", dependsOnValue: "" },
  { stage: "INJURIES_DETAIL", saveField: "injuries", nextStage: "CONFIRMATION", replies: "Please describe your injuries so I can avoid them in your plan.|What are your injuries?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "CONFIRMATION", saveField: "", nextStage: "DONE", replies: "Let's review everything. Does this look correct?|Here is your profile summary. Does everything look good?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "DONE", saveField: "", nextStage: "", replies: "Generating your highly customized plan now.|Building your perfect fitness plan now.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" }
];

const DEFAULT_ERRORS: ErrorRow[] = [
  { stage: "GREETING", text: "I didn't quite catch that. To start the session, please answer by saying 'Yes'." },
  { stage: "CONSENT", text: "I need your clear consent to proceed. Please answer by saying 'Yes' or 'No'." },
  { stage: "INTRO", text: "I didn't catch that. Please answer by saying a number, like '25' or '30'." },
  { stage: "AGE", text: "I didn't catch a valid weight. Please answer by saying a number and a unit, like '70 kilos' or '150 pounds'." },
  { stage: "HEIGHT", text: "I didn't catch your height. Please answer by saying something like '170 centimeters' or '5 foot 10'." },
  { stage: "GOAL", text: "I didn't catch your goal. Please answer by saying exactly 'Weight Loss', 'Muscle Gain', or 'General Fitness'." },
  { stage: "LEVEL", text: "I didn't catch your level. Please answer by saying exactly 'Beginner', 'Intermediate', or 'Advanced'." },
  { stage: "DAYS", text: "I need a number of days. Please answer by saying a number between 1 and 7, like '3' or '4'." },
  { stage: "EQUIPMENT", text: "I didn't catch that. Please answer by saying exactly 'Full Gym', 'Dumbbells', or 'Bodyweight'." },
  { stage: "ALLERGIES_CHECK", text: "I didn't understand. Please answer with a simple 'Yes' if you have allergies, or 'No' if you don't." },
  { stage: "ALLERGIES_DETAIL", text: "I didn't catch that. Please name the specific foods you are allergic to, like 'peanuts' or 'dairy'." },
  { stage: "INJURIES_CHECK", text: "I didn't understand. Please answer with a simple 'Yes' if you have physical injuries, or 'No' if you don't." },
  { stage: "INJURIES_DETAIL", text: "I didn't catch that. Please describe your specific injuries, like 'bad left knee' or 'shoulder pain'." },
  { stage: "CONFIRMATION", text: "Please say 'Yes' to generate the plan, or say 'No' if you need to fix something." }
];

const STAGE_ORDER = ["GREETING", "CONSENT", "INTRO", "AGE", "HEIGHT", "GOAL", "LEVEL", "DAYS", "EQUIPMENT", "ALLERGIES_CHECK", "ALLERGIES_DETAIL", "INJURIES_CHECK", "INJURIES_DETAIL", "CONFIRMATION", "DONE"];

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

const humanDelay = () => new Promise(res => setTimeout(res, 600 + Math.random() * 600));

export default function GenerateProgramPage() {
  const router = useRouter();
  
  const [intakeSteps, setIntakeSteps] = useState<IntakeStep[]>(DEFAULT_FLOW);
  const [errorResponses, setErrorResponses] = useState<ErrorRow[]>(DEFAULT_ERRORS);
  const [userDataset, setUserDataset] = useState<UserResponseRow[]>([]);
  
  const [callActive, setCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [stage, setStage] = useState<string>("GREETING"); 
  const [inputText, setInputText] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [waveHeights, setWaveHeights] = useState([4, 4, 4, 4, 4]);

  const [userData, setUserData] = useState({
    age: "", weight: "", height: "", goal: "", level: "", days: "", equipment: "", allergies: "", injuries: ""
  });

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isAiSpeakingRef = useRef(false);
  const callActiveRef = useRef(false);
  const stageRef = useRef<string>("GREETING");
  const userDataRef = useRef(userData);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);
  const stepConfigRef = useRef<IntakeStep | null>(null);

  const { user } = useUser();
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
    const fetchUserDatasetCSV = async () => {
      try {
        const response = await fetch('/Synthetic_User_Responses_5000.csv');
        const text = await response.text();
        Papa.parse(text, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data.map((row: any) => ({
              stage: row.stage || "", 
              user_raw_input: row.user_raw_input || "", 
              extracted_value: row.extracted_value || ""
            })).filter((row: any) => row.stage !== "" && row.user_raw_input !== "");
            setUserDataset(parsedData);
          }
        });
      } catch (err) { console.error("Error loading User Dataset CSV:", err); }
    };
    fetchUserDatasetCSV();
  }, []);

  // INITIALIZE WEB SPEECH (Fallback for Desktop)
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
      
      if (transcript.length > 0) {
        handleUserResponse(transcript);
      }
      
      setIsListening(false);
      stopListening();
      
      setTimeout(() => { processingRef.current = false; }, 400);
    };
    
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => { 
      recognition.abort(); 
      import('@capacitor/core').then(({ Capacitor }) => {
        if (Capacitor.isNativePlatform()) {
          import('@capacitor-community/text-to-speech').then(({ TextToSpeech }) => {
            TextToSpeech.stop().catch(() => {});
          });
          import('@capacitor-community/speech-recognition').then(({ SpeechRecognition }) => {
            SpeechRecognition.removeAllListeners().catch(() => {});
            SpeechRecognition.stop().catch(() => {});
          });
        } else {
          synthRef.current?.cancel(); 
        }
      }).catch(() => {});
    };
  }, []);

  // 🎤 START LISTENING
  const startListening = async () => {
    if (!callActiveRef.current || isAiSpeakingRef.current) return;
    
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        
        const permissions = await SpeechRecognition.checkPermissions();
        if (permissions.speechRecognition !== 'granted') {
          const req = await SpeechRecognition.requestPermissions();
          if (req.speechRecognition !== 'granted') {
            toast.error("Microphone permission denied! Please allow it in settings.");
            return;
          }
        }

        setIsListening(true);
        
        try {
          const result = await SpeechRecognition.start({
            language: "en-US",
            maxResults: 1,
            prompt: "I am listening...",
            partialResults: false, 
            popup: false, 
          });

          if (result && result.matches && result.matches.length > 0) {
            const transcript = result.matches[0].trim();
            if (transcript.length > 0 && !processingRef.current) {
              processingRef.current = true;
              
              handleUserResponse(transcript);
              
              setTimeout(() => { processingRef.current = false; }, 400);
            }
          }
        } catch (err) {
          console.log("Mic timed out or no speech detected.");
        } finally {
          setIsListening(false);
        }

      } else {
        recognitionRef.current?.start();
      }
    } catch (e) {
      console.error("Microphone error:", e);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        await SpeechRecognition.stop();
      } else {
        recognitionRef.current?.stop();
      }
    } catch (e) {}
  };

  // 🔊 SPEAK
  const speak = async (text: string, onComplete?: () => void) => {
    stopListening();
    setIsSpeaking(true); 
    isAiSpeakingRef.current = true;
    addMessage("assistant", text);

    try {
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
        await TextToSpeech.speak({
          text: text,
          lang: 'en-US',
          rate: 1.05, 
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
        });
        
        setIsSpeaking(false); 
        isAiSpeakingRef.current = false;
        
        // ✅ THE FIX: We added a 500ms delay to let the Android speaker finish shutting off
        // before we try to instantly fire up the microphone. This stops the collision!
        setTimeout(() => {
          if (onComplete && callActiveRef.current) onComplete();
        }, 500);
        
      } else {
        if (!synthRef.current) {
          setIsSpeaking(false); 
          isAiSpeakingRef.current = false;
          if (onComplete && callActiveRef.current) onComplete();
          return;
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synthRef.current.getVoices();
        utterance.voice = voices.find(v => v.name.includes("Google US English")) || voices[0];
        utterance.rate = 1.05; utterance.pitch = 1;

        utterance.onend = () => {
          setIsSpeaking(false); isAiSpeakingRef.current = false;
          setTimeout(() => {
            if (onComplete && callActiveRef.current) onComplete();
          }, 400);
        };

        utterance.onerror = () => {
          setIsSpeaking(false); isAiSpeakingRef.current = false;
          setTimeout(() => {
            if (onComplete && callActiveRef.current) onComplete();
          }, 400);
        };
        
        synthRef.current.speak(utterance);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsSpeaking(false); 
      isAiSpeakingRef.current = false;
      if (onComplete && callActiveRef.current) onComplete();
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
    if (stageRef.current === "INTRO") mappedStageForDataset = "AGE";
    if (stageRef.current === "ALLERGIES_CHECK") mappedStageForDataset = "ALLERGIES";
    if (stageRef.current === "INJURIES_CHECK") mappedStageForDataset = "INJURIES";

    const datasetMatch = userDataset.find(
      row => row.stage === mappedStageForDataset && row.user_raw_input.toLowerCase() === textLower
    );

    const extractedFromDataset = datasetMatch ? datasetMatch.extracted_value.toLowerCase() : null;

    if (textLower.match(/\b(go back|undo|wait|previous|mistake|wrong)\b/i) && stageRef.current !== "CONFIRMATION") {
      const currentIndex = STAGE_ORDER.indexOf(stageRef.current);
      if (currentIndex > 0) {
        const prevStage = STAGE_ORDER[currentIndex - 1];
        setStage(prevStage); stageRef.current = prevStage;
        let prevConfig = DEFAULT_FLOW.find(s => s.stage === prevStage) || DEFAULT_FLOW[0];
        stepConfigRef.current = prevConfig;
        speak("No problem, let's go back. " + prevConfig.replies.split('|')[0], startListening);
        return;
      }
    }

    if (stageRef.current === "GREETING" && (extractedFromDataset === "no" || textLower.match(/\b(no|nope|nah|not ready)\b/i))) {
      speak("No problem at all! I'll be right here when you are ready to start.");
      setTimeout(() => toggleCall(), 4000); return;
    }
    if (stageRef.current === "CONSENT" && (extractedFromDataset === "no" || textLower.match(/\b(no|nope|nah|i don't agree)\b/i))) {
      speak("I completely understand. I need your consent to safely build your plan, so we'll stop here for now.");
      setTimeout(() => toggleCall(), 5000); return;
    }

    if (stageRef.current === "CONFIRMATION" && (extractedFromDataset === "no" || textLower.match(/\b(change|fix|no|wait|wrong|edit|incorrect)\b/i))) {
      speak("No problem. You can tap the pencil icon next to any field on your screen to edit it manually. Just say 'looks good' or 'Yes' when you are ready to proceed.", startListening); return; 
    }

    let isValid = true;
    
    if (datasetMatch) {
      isValid = true;
    } else {
      if (stageRef.current === "GREETING" || stageRef.current === "CONSENT") {
        isValid = /\b(yes|yeah|sure|ok|okay|yep|agree)\b/i.test(textLower);
      } else if (["INTRO", "AGE", "HEIGHT", "DAYS"].includes(stageRef.current)) {
        isValid = /\d/.test(textLower); 
      } else if (stageRef.current === "GOAL") {
        isValid = /\b(weight|loss|lose|muscle|gain|build|general|fitness)\b/i.test(textLower);
      } else if (stageRef.current === "LEVEL") {
        isValid = /\b(beginner|intermediate|advanced|pro|new|start|novice)\b/i.test(textLower);
      } else if (stageRef.current === "EQUIPMENT") {
        isValid = /\b(gym|dumbbells|bodyweight|weights|home)\b/i.test(textLower);
      } else if (stageRef.current === "ALLERGIES_CHECK" || stageRef.current === "INJURIES_CHECK") {
        isValid = /\b(yes|yeah|yep|sure|no|nope|nah|none)\b/i.test(textLower);
      } else if (stageRef.current === "CONFIRMATION") {
        isValid = /\b(yes|yeah|sure|ok|okay|yep|agree|good|perfect|generate|do it|right|looks good)\b/i.test(textLower);
      } else {
        isValid = textLower.trim().length > 1; 
      }
    }

    if (!isValid) {
      let finalErrorReply = "";
      const baseErrorConfig = DEFAULT_ERRORS.find(s => s.stage === stageRef.current) || DEFAULT_ERRORS[0];
      const errorOptions = baseErrorConfig.text.split('|').filter(r => r.trim() !== "");
      finalErrorReply = errorOptions.length > 0 ? errorOptions[Math.floor(Math.random() * errorOptions.length)] : "I didn't quite catch that.";
      
      if (finalErrorReply.includes("[Name]")) finalErrorReply = finalErrorReply.replace(/\[Name\]/g, userRef.current?.firstName || "there");
      speak(finalErrorReply, startListening);
      return; 
    }

    let isNegativeResponse = false;
    if (stepConfigRef.current?.isConditional) {
      const negativeRegex = /\b(no|none|nope|nah|nothing|zero|zilch|nada|negative|not at all|i don't have any|i do not|never|no injuries|no allergies|don't have any|not really|all clear|i'm good|im good)\b/i;
      if (negativeRegex.test(textLower) && textLower.length < 30) {
        isNegativeResponse = true;
      }
    }

    const updatedData = { ...userDataRef.current };
    const currentConfig = stepConfigRef.current;

    if (currentConfig && currentConfig.saveField) {
      let valueToSave = textLower;

      if (datasetMatch && stageRef.current !== "ALLERGIES_CHECK" && stageRef.current !== "INJURIES_CHECK") {
        valueToSave = datasetMatch.extracted_value;
        if (mappedStageForDataset === "WEIGHT" && !valueToSave.includes("lbs") && !valueToSave.includes("kg")) {
             valueToSave = `${valueToSave} lbs`; 
        }
        if (mappedStageForDataset === "HEIGHT" && !valueToSave.includes("cm") && !valueToSave.includes("'")) {
             valueToSave = `${valueToSave} cm`;
        }
      } else {
        if (currentConfig.saveField === "allergies" || currentConfig.saveField === "injuries") {
           if (stageRef.current === "ALLERGIES_CHECK" || stageRef.current === "INJURIES_CHECK") {
               valueToSave = isNegativeResponse ? "none" : ""; 
           } else {
               valueToSave = textLower;
           }
        } else if (currentConfig.saveField === "weight") {
          const weightMatch = textLower.match(/(\d+(?:\.\d+)?)\s*(kg|kilos|lbs|pounds)?/i);
          if (weightMatch) {
            const amount = parseFloat(weightMatch[1]);
            let unit = weightMatch[2] ? (weightMatch[2].toLowerCase().startsWith('k') ? 'kg' : 'lbs') : (amount < 100 ? 'kg' : 'lbs');
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
      }

      if (valueToSave !== "") {
          updatedData[currentConfig.saveField as keyof typeof updatedData] = valueToSave;
          setUserData(updatedData); userDataRef.current = updatedData;
      }
    }

    setIsThinking(true); await humanDelay(); setIsThinking(false);

    let targetStage = "DONE";
    if (currentConfig?.isConditional && isNegativeResponse) targetStage = currentConfig.nextStageIfNo || "DONE";
    else if (currentConfig?.nextStage) targetStage = currentConfig.nextStage;

    let baseConfig = DEFAULT_FLOW.find(s => s.stage === targetStage) || DEFAULT_FLOW.find(s => s.stage === "DONE")!;
    
    setStage(targetStage); stageRef.current = targetStage; stepConfigRef.current = baseConfig;

    let replyOptionsStr = isNegativeResponse && currentConfig?.isConditional ? currentConfig.repliesIfNo : baseConfig.replies;
    const replyOptions = replyOptionsStr.split('|').filter(r => r.trim() !== "");
    let finalReply = replyOptions.length > 0 ? replyOptions[Math.floor(Math.random() * replyOptions.length)] : "Okay, generating your plan.";

    if (finalReply.includes("[Name]")) finalReply = finalReply.replace(/\[Name\]/g, userRef.current?.firstName || "there");

    if (targetStage === "CONFIRMATION") {
      finalReply = `Alright, let's review. You are ${updatedData.age} years old, weigh ${updatedData.weight}, and are ${updatedData.height} tall. Your goal is to ${updatedData.goal}. You'll train using your ${updatedData.equipment} for ${updatedData.days} days. Allergies: ${updatedData.allergies}. Injuries: ${updatedData.injuries}. Does everything look correct?`;
    }

    if (targetStage === "DONE") {
      speak(finalReply);
      await generateAndSavePlan(updatedData);
    } else {
      speak(finalReply, startListening);
    }
  };

  const generateAndSavePlan = async (finalData: typeof userData) => {
    try {
      const response = await fetch("https://apex-backend-xyz.onrender.com/api/recommend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: finalData.age || "25", weight: finalData.weight || "70", height: finalData.height || "170",
          level: finalData.level || "beginner", goal: finalData.goal || "lose weight", injuries: finalData.injuries || "none",
          allergies: finalData.allergies || "none", days: finalData.days || "3", equipment: finalData.equipment || "full gym"
        }),
      });
      if (!response.ok) throw new Error("Backend response not OK");
      const aiData = await response.json();

      if (aiData.injuries_detected && aiData.injuries_detected.length > 0) {
        toast.success(`Plan adjusted automatically for detected injuries: ${aiData.injuries_detected.join(", ")}`);
      }

      const formattedWorkout = { 
        schedule: aiData.workoutPlan.schedule, 
        exercises: aiData.workoutPlan.exercises.map((dayEx: any) => ({ 
          day: dayEx.day, 
          routines: dayEx.routines.map((r: any) => ({ 
            name: r.name, 
            sets: Number(r.sets), 
            reps: String(r.reps), 
            description: r.description || "" 
          })) 
        })) 
      };
      
      const formattedDiet = { 
        dailyCalories: Number(aiData.dietPlan.dailyCalories), 
        dailyPlans: aiData.dietPlan.dailyPlans
      };

      await createPlan({
        userId: userRef.current?.id || "guest", 
        name: `${userRef.current?.firstName || "User"}'s ${finalData.goal || "Fitness"} Plan`,
        isActive: true, 
        userStats: { 
            age: String(finalData.age), 
            height: String(finalData.height), 
            weight: String(finalData.weight), 
            level: finalData.level, 
            goal: finalData.goal, 
            equipment: finalData.equipment || "full gym",
            allergies: finalData.allergies || "none",
            injuries: finalData.injuries || "none",
            injuriesDetected: aiData.injuries_detected || [] 
        },
        workoutPlan: formattedWorkout, 
        dietPlan: formattedDiet,
      });

      setStage("DONE");
      speak("Your highly customized plan is ready and saved. Taking you to your dashboard now.");

      setTimeout(() => {
        router.push("/profile"); 
      }, 3000); 

    } catch (error: any) {
      console.error("Critical Error Generating Plan:", error);
      toast.error(`Failed to generate: ${error.message}`); 
      speak("I encountered an error while saving the plan.");
      setStage("CONFIRMATION");
      stageRef.current = "CONFIRMATION";
    }
  };

  const toggleCall = async () => {
    if (callActive) {
      setCallActive(false); setIsSpeaking(false); setIsListening(false); isAiSpeakingRef.current = false;
      stopListening(); 
      
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          try { 
            const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
            await TextToSpeech.stop(); 
          } catch(e) {}
        } else {
          synthRef.current?.cancel(); 
        }
      } catch(e) {}

      setUserData({age: "", weight: "", height: "", goal: "", level: "", days: "", equipment: "", allergies: "", injuries: ""});
      setStage("GREETING");
    } else {
      setCallActive(true); setMessages([]);
      let baseConfig = DEFAULT_FLOW.find(s => s.stage === "GREETING")!;
      stepConfigRef.current = baseConfig; setStage("GREETING");

      const replyOptions = baseConfig.replies.split('|');
      let greeting = replyOptions[Math.floor(Math.random() * replyOptions.length)];
      if (userRef.current?.firstName && !greeting.includes(userRef.current?.firstName)) {
        greeting = greeting.replace(/^(Hey there|Welcome|Hello|Hi|Greetings)[!|,]/i, `$1 ${userRef.current?.firstName},`);
      }
      speak(greeting, startListening);
    }
  };

  const handleEditSave = (field: string, newValue: string) => {
    setUserData(prev => ({ ...prev, [field]: newValue }));
    setEditingField(null);
  };

  const downloadFitnessID = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 0, 1000);
    grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 1000);

    ctx.fillStyle = '#10b981'; ctx.font = 'bold 50px system-ui, sans-serif';
    ctx.fillText('APEX FITNESS ID', 60, 120);
    
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillText(`${userRef.current?.firstName || "Guest"}'s Profile`, 60, 200);

    let y = 320;
    Object.entries(userDataRef.current).forEach(([key, value]) => {
      ctx.fillStyle = '#94a3b8'; ctx.font = '30px system-ui, sans-serif';
      ctx.fillText(key.toUpperCase(), 60, y);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillText(value || '--', 60, y + 45);
      y += 110;
    });

    ctx.fillStyle = '#10b981'; ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('Powered by Apex AI Program Generator', 60, 940);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `Apex_Fitness_ID_${userRef.current?.firstName || "User"}.png`;
    a.click();
  };

  useEffect(() => {
    if (messageContainerRef.current) messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
  }, [messages, isThinking]);

  const currentStageIndex = STAGE_ORDER.indexOf(stage);
  const progressPercent = Math.max(0, Math.min(100, Math.round((currentStageIndex / (STAGE_ORDER.length - 1)) * 100)));

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-6 pt-24">
      {!callActive ? (
        <div className="flex-grow flex flex-col items-center justify-center px-4 text-center">
          <div className="space-y-6 max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter uppercase">
              Ready to <span className="text-primary">Evolve?</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Your AI-powered fitness journey starts here.
            </p>
            <div className="flex justify-center pt-6">
              <Button 
                size="lg" 
                onClick={toggleCall} 
                className="group h-20 px-12 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-xl shadow-primary/20"
              >
                <span className="text-2xl font-black italic">START SESSION</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="max-w-4xl mx-auto mb-8">
           <div className="flex justify-between text-sm text-muted-foreground mb-2 font-medium">
             <span>Intake Progress</span>
             <span>{progressPercent}%</span>
           </div>
           <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="relative overflow-hidden flex flex-col items-center justify-center bg-black/5 border-primary/20 shadow-sm py-6">
                <div className={`absolute inset-0 bg-primary/20 rounded-full blur-3xl transition-all duration-500 ${isSpeaking ? "scale-150 opacity-100" : "scale-50 opacity-0"}`} />
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`relative size-24 rounded-full border-4 border-primary/50 flex items-center justify-center bg-background shadow-xl overflow-hidden ${isSpeaking ? "scale-110 border-primary" : "scale-100"}`}>
                    <img src="ai-avatar.png" alt="AI Trainer" className="size-full object-cover p-2" />
                  </div>
                  <h3 className="mt-3 font-bold text-lg">Apex </h3>
                  <div className="mt-1 h-5 flex items-center justify-center">
                    {isSpeaking ? <span className="flex items-center gap-1.5 text-primary text-xs font-medium"><Volume2 className="w-3 h-3 animate-pulse" /> Speaking...</span> : <span className="text-muted-foreground text-xs font-medium">Waiting...</span>}
                  </div>
                </div>
              </Card>

              <Card className="relative overflow-hidden flex flex-col items-center justify-center bg-muted/30 border-border shadow-sm py-6">
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`relative size-24 rounded-full border-4 ${isListening ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "border-muted"} flex items-center justify-center overflow-hidden bg-background transition-all duration-300`}>
                    <img src={user?.imageUrl || "https://github.com/shadcn.png"} alt="User" className="size-full object-cover" />
                  </div>
                  <h3 className="mt-3 font-bold text-lg">{user?.firstName || "Guest"}</h3>
                  <div className="mt-1 h-5 flex items-center justify-center">
                    {isListening ? (
                      <div className="flex gap-1 items-center h-4">
                        {waveHeights.map((h, i) => (
                          <div key={i} className="w-1 bg-green-500 rounded-full transition-all duration-150" style={{ height: `${h}px` }} />
                        ))}
                      </div>
                    ) : (
                      <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium"><MicOff className="w-3 h-3" /> Mic Off</span>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <Card className="w-full bg-card border-border shadow-sm overflow-hidden flex flex-col">
              <div ref={messageContainerRef} className="h-64 overflow-y-auto p-4 space-y-4 bg-background/50 scroll-smooth">
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
                      <span className="animate-pulse">Apex is thinking...</span>
                    </div>
                  </div>
                )}
              </div>
              
              {callActive && stage !== "DONE" && (
                <div className="p-3 bg-muted/50 border-t border-border flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleUserResponse("wait, go back")} className="text-muted-foreground hover:text-foreground shrink-0" title="Undo Last Answer">
                    <Undo2 className="w-4 h-4" />
                  </Button>
                  <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isSpeaking}
                      placeholder={isSpeaking ? "Wait for Apex to finish..." : "Type your answer here..."} 
                      className="flex-1 bg-background border border-border rounded-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
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
          </div>

          <div className="lg:col-span-1">
            <Card className="p-5 shadow-sm border-border bg-card sticky top-24">
              <div className="flex items-center justify-between mb-4 border-b pb-4">
                <div className="flex items-center gap-2">
                  <Activity className="text-primary w-5 h-5" />
                  <h3 className="font-bold text-lg">Live Fitness ID</h3>
                </div>
                <Button variant="outline" size="sm" onClick={downloadFitnessID} className="h-8 gap-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-all">
                  <Download className="w-3.5 h-3.5" /> Share
                </Button>
              </div>
              
              <div className="space-y-3 text-sm">
                {Object.entries(userData).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1 border-b border-border/50 pb-2 last:border-0">
                    <span className="text-muted-foreground capitalize font-medium text-xs">{key}</span>
                    <div className="flex items-center justify-between">
                      {editingField === key ? (
                        <div className="flex items-center gap-2 w-full">
                          <input 
                            autoFocus
                            defaultValue={value}
                            onBlur={(e) => handleEditSave(key, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleEditSave(key, e.currentTarget.value)}
                            className="flex-1 bg-background border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary outline-none"
                          />
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
          <Button 
            size="lg" 
            onClick={toggleCall} 
            disabled={stage === "GENERATING" || stage === "DONE"}
            className="rounded-full px-12 py-6 text-lg shadow-xl bg-destructive hover:bg-destructive/90 text-white"
          >
            {stage === "DONE" ? <><Loader2 className="mr-2 animate-spin" /> Generating Plan...</> : "End Session"}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}