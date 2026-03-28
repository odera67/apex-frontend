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

// 🚀 20+ VARIATIONS FOR EVERY SINGLE STAGE (NO FILLER WORDS)
const DEFAULT_FLOW: IntakeStep[] = [
  { stage: "GREETING", saveField: "", nextStage: "CONSENT", replies: "Hey, I'm Apex. Ready to crush some goals today?|What's up, I'm Apex. Are you ready to get started?|Welcome in. I'm your coach, Apex. Ready to build this plan?|Let's get to work. I'm Apex. Are you ready?|Hello. I am Apex. Ready to begin our session?|I'm Apex, your trainer. Are you prepared to start?|Let's dive in. I'm Apex. Ready when you are?|Hey there. I'm Apex. Shall we begin?|Welcome. I am Apex. Are you ready to set up your profile?|Time to work. I'm Apex. Ready to start?|I'm Apex. Let's build your fitness journey. Ready?|Greetings. I am Apex. Are you ready to proceed?|Hey, Apex here. Are we ready to kick this off?|I am Apex. Let's get your plan built. Ready?|Welcome to the session. I'm Apex. Ready to go?|Apex here. Are you ready to map out your routine?|Let's start your transformation. I'm Apex. Ready?|I'm Apex. Let's formulate your plan. Ready to begin?|Hey, I'm Apex. Are you prepared to answer a few questions?|Welcome. I'm Apex. Let's get your profile set up. Ready?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "CONSENT", saveField: "", nextStage: "INTRO", replies: "I need your consent to collect basic health data to build this safely. Do you agree?|Before we build your plan, do you consent to sharing your fitness data?|I require your permission to use your health details for this routine. Is that acceptable?|Do you consent to sharing physical data so I can customize your program?|I need a quick confirmation that you consent to sharing health info. Do you agree?|Before proceeding, do I have your consent to use your health metrics?|I need your authorization to process your fitness data. Do you consent?|Please confirm you consent to sharing basic body metrics for this plan.|Do you agree to let me use your physical data to tailor this workout?|I need your consent regarding health data collection before we start. Do you agree?|To proceed safely, do you consent to sharing your health data?|Please give your consent to share fitness data so we can move forward.|Do you authorize me to collect health data for your routine?|I must ask for your consent to handle your physical stats. Do you approve?|Before we continue, do you consent to sharing your health information?|I need your explicit consent to use your fitness data. Do you agree?|Do you permit me to analyze your health data for this program?|Please confirm your consent to share health details. Do you agree?|I require consent to process your physical metrics. Is that okay?|Do you consent to providing health data to build your profile?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "INTRO", saveField: "age", nextStage: "AGE", replies: "Let's start with your age. How old are you?|First up, what is your current age?|I need to know your age. How old are you?|To begin, please tell me your age.|What is your age?|How many years old are you?|Let's get your age on the record. How old are you?|Please state your current age.|I need your age to proceed. How old are you?|What age should I put down for you?|How old are you currently?|Let's start simple. What is your age?|Provide your age for me.|How many years of age are you?|I need your exact age to calibrate the plan. How old are you?|What is your current biological age?|Tell me how old you are.|We will begin with your age. How old are you?|State your age for the profile.|How old are you right now?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "AGE", saveField: "weight", nextStage: "HEIGHT", replies: "What is your current weight?|How much do you weigh?|Please tell me your exact weight.|I need your current body weight.|What do you weigh right now?|State your weight for the record.|How much do you currently weigh?|Please provide your body weight.|I need to know how much you weigh.|What is your weight?|Tell me your current weight.|How heavy are you right now?|I require your weight to calculate your plan.|What is your exact weight?|Please state how much you weigh.|Let's record your weight. What is it?|How much weight are you carrying currently?|What number are you at on the scale?|Provide your current body weight.|I need your weight. How much do you weigh?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "HEIGHT", saveField: "height", nextStage: "GOAL", replies: "How tall are you?|What is your exact height?|Please tell me your height.|I need to record your height.|How tall do you stand?|What is your current height?|Provide your height for the profile.|I need to know how tall you are.|Please state your height.|What is your height measurement?|How tall are you currently?|Tell me exactly how tall you are.|I require your height to finalize your stats.|What height should I record?|State how tall you are.|Let's get your height. What is it?|Please provide your vertical height.|How many centimeters or feet tall are you?|I need your height. How tall are you?|What is your total height?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "GOAL", saveField: "goal", nextStage: "LEVEL", replies: "What is your main goal? Weight loss, muscle gain, or general fitness?|Are you aiming for weight loss, muscle gain, or general fitness?|Tell me your primary objective: weight loss, muscle gain, or general fitness.|What are we working toward? Weight loss, muscle gain, or general fitness?|Is your focus on weight loss, muscle gain, or general fitness?|Choose your target: weight loss, muscle gain, or general fitness.|What is the primary goal here? Weight loss, muscle gain, or general fitness?|Which do you want most: weight loss, muscle gain, or general fitness?|I need your goal. Is it weight loss, muscle gain, or general fitness?|What is your main priority: weight loss, muscle gain, or general fitness?|Are we prioritizing weight loss, muscle gain, or general fitness?|Select a goal: weight loss, muscle gain, or general fitness.|What is the desired outcome? Weight loss, muscle gain, or general fitness?|Tell me what you want to achieve: weight loss, muscle gain, or general fitness.|Are you looking for weight loss, muscle gain, or general fitness?|Identify your goal: weight loss, muscle gain, or general fitness.|What is your primary focus? Weight loss, muscle gain, or general fitness?|Which path are we taking: weight loss, muscle gain, or general fitness?|Please choose one: weight loss, muscle gain, or general fitness.|What are you trying to accomplish: weight loss, muscle gain, or general fitness?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "LEVEL", saveField: "level", nextStage: "DAYS", replies: "Are you a beginner, intermediate, or advanced?|How would you rate your experience: beginner, intermediate, or advanced?|What is your fitness level: beginner, intermediate, or advanced?|Are you currently a beginner, intermediate, or advanced?|Tell me your training level: beginner, intermediate, or advanced.|Classify your experience: beginner, intermediate, or advanced.|Do you consider yourself a beginner, intermediate, or advanced?|What level are you at right now: beginner, intermediate, or advanced?|I need your experience level: beginner, intermediate, or advanced.|Are we starting as a beginner, intermediate, or advanced?|How experienced are you: beginner, intermediate, or advanced?|State your current fitness level: beginner, intermediate, or advanced.|Are you training as a beginner, intermediate, or advanced?|Choose your skill level: beginner, intermediate, or advanced.|What is your current athletic level: beginner, intermediate, or advanced?|Please identify as beginner, intermediate, or advanced.|What category fits you: beginner, intermediate, or advanced?|Are you technically a beginner, intermediate, or advanced?|Rate your proficiency: beginner, intermediate, or advanced.|Tell me where you stand: beginner, intermediate, or advanced?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "DAYS", saveField: "days", nextStage: "EQUIPMENT", replies: "How many days a week can you train?|What is the maximum number of days per week you can commit to?|How many days per week are you available to work out?|Tell me how many days a week you will train.|How many days a week can you dedicate to this?|I need to know how many days a week you can exercise.|How many training days per week can you realistically manage?|What number of days per week will you work out?|How many days a week are we scheduling?|Please state how many days a week you can train.|How many weekly sessions can you commit to?|Tell me the number of days a week you can exercise.|How many days per week can you put in the work?|I need a number of days per week you will train.|How many days out of the week can you work out?|What is your weekly day commitment?|How many days a week are you reserving for fitness?|State how many days per week you can train.|How many days a week do you have time for?|How many days per week are we lifting?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "EQUIPMENT", saveField: "equipment", nextStage: "ALLERGIES_CHECK", replies: "Will you use a full gym, dumbbells, or bodyweight?|What equipment do you have: full gym, dumbbells, or bodyweight?|Are you training at a full gym, with dumbbells, or using bodyweight?|Choose your setup: full gym, dumbbells, or bodyweight.|Do you have access to a full gym, dumbbells, or just bodyweight?|What are we working with: full gym, dumbbells, or bodyweight?|Are we utilizing a full gym, dumbbells, or bodyweight alone?|Tell me your equipment: full gym, dumbbells, or bodyweight.|What is available to you: full gym, dumbbells, or bodyweight?|Please specify your equipment: full gym, dumbbells, or bodyweight.|Are you using a full gym, dumbbells, or strictly bodyweight?|What access do you have: full gym, dumbbells, or bodyweight?|I need to know your setup: full gym, dumbbells, or bodyweight?|Select your available equipment: full gym, dumbbells, or bodyweight.|Will this be full gym, dumbbells, or bodyweight training?|What gear do you have: full gym, dumbbells, or bodyweight?|State your training environment: full gym, dumbbells, or bodyweight.|Are we restricted to bodyweight, using dumbbells, or a full gym?|What is your equipment situation: full gym, dumbbells, or bodyweight?|Choose your gym setup: full gym, dumbbells, or bodyweight.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "ALLERGIES_CHECK", saveField: "allergies", nextStage: "ALLERGIES_DETAIL", replies: "Do you have any food allergies?|Are you allergic to any specific foods?|Do you suffer from any food allergies?|Do you have any dietary restrictions or allergies?|Tell me if you have any food allergies.|Are there any food allergies I must know about?|Do you have any clinical food allergies?|Please state if you have food allergies.|Do you react negatively to any specific foods?|Do you carry any food allergies?|I need to know if you have any food allergies.|Are you medically allergic to any food items?|Do you possess any known food allergies?|Tell me if there are foods you are allergic to.|Do you have any known dietary allergies?|Are you diagnosed with any food allergies?|Do you have any severe food allergies?|Please tell me if you have food allergies.|Do you have any restrictions due to food allergies?|Are there food allergies we need to work around?", isConditional: true, nextStageIfNo: "INJURIES_CHECK", repliesIfNo: "Understood. Next, do you have any physical injuries?|Noted. Moving on, do you have any physical injuries?|I have recorded no allergies. Do you have any physical injuries?|No allergies confirmed. Do you have any physical injuries?|Clear on allergies. Do you have any physical injuries?|I see no allergies. Tell me, do you have any physical injuries?|No food restrictions. Do you have any physical injuries?|Allergies are blank. Next, do you have any physical injuries?|Confirmed no allergies. Do you have any physical injuries?|No allergies. Let's move to injuries. Do you have any?|I will note no allergies. Do you have any physical injuries?|Allergies are clear. Do you have any physical injuries?|No dietary issues. Do you have any physical injuries?|Allergies avoided. Do you have any physical injuries?|No allergies stated. Next, do you have any physical injuries?|Confirmed. Do you have any physical injuries?|I have that as no allergies. Do you have any physical injuries?|No allergies. Moving on, do you have any physical injuries?|Understood on allergies. Do you have any physical injuries?|No allergies recorded. Do you have any physical injuries?", dependsOnField: "", dependsOnValue: "" },
  { stage: "ALLERGIES_DETAIL", saveField: "allergies", nextStage: "INJURIES_CHECK", replies: "Please name the exact foods you are allergic to.|What specific foods are you allergic to?|List the exact foods you cannot eat.|Tell me the specific allergies you have.|What are the exact food items you are allergic to?|I need the names of the foods you are allergic to.|Please specify your food allergies.|Which exact foods trigger your allergies?|List the ingredients you are allergic to.|Tell me what foods to avoid due to allergies.|What exactly are you allergic to?|Name the foods that cause an allergic reaction.|Please be specific about your food allergies.|Identify the exact foods you are allergic to.|What specific dietary allergens do you have?|State the exact foods you must avoid.|Which foods are you officially allergic to?|List your specific food allergies now.|Tell me the precise foods you are allergic to.|What exact foods are off-limits due to allergies?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "INJURIES_CHECK", saveField: "injuries", nextStage: "INJURIES_DETAIL", replies: "Do you have any physical injuries?|Are you currently dealing with any physical injuries?|Do you have any lingering physical injuries?|Are you carrying any physical injuries right now?|Tell me if you have any physical injuries.|Do you suffer from any physical injuries?|Please state if you have any physical injuries.|Are there any physical injuries I must work around?|Do you have any diagnosed physical injuries?|Do you have any current bodily injuries?|I need to know if you have any physical injuries.|Are you compromised by any physical injuries?|Do you have any pain or physical injuries?|Tell me if there are physical injuries present.|Do you have any known physical injuries?|Are you hindered by any physical injuries?|Do you have any joint or muscle injuries?|Please tell me if you have physical injuries.|Do you have any restrictions from physical injuries?|Are there physical injuries we need to avoid?", isConditional: true, nextStageIfNo: "CONFIRMATION", repliesIfNo: "Understood. Let's review your final details.|Noted. Let's review the final profile.|I have recorded no injuries. Let's review your summary.|No injuries confirmed. Take a look at your summary.|Clear on injuries. Let's review the details.|I see no injuries. Let's look over your profile.|No physical restrictions. Please review the summary.|Injuries are blank. Let's review your details.|Confirmed no injuries. Let's do a final review.|No injuries. Let's look at your finalized data.|I will note no injuries. Please review the summary.|Injuries are clear. Let's look at the summary.|No physical issues. Let's review your profile.|Injuries avoided. Take a look at your data.|No injuries stated. Let's proceed to the review.|Confirmed. Let's look at your final summary.|I have that as no injuries. Please review your details.|No injuries. Let's look over the final profile.|Understood on injuries. Let's review your data.|No injuries recorded. Let's review your final summary.", dependsOnField: "", dependsOnValue: "" },
  { stage: "INJURIES_DETAIL", saveField: "injuries", nextStage: "CONFIRMATION", replies: "Please describe the exact injuries you have.|What specific physical injuries are you dealing with?|List the exact body parts that are injured.|Tell me specifically what is injured.|What are the exact injuries I need to avoid?|I need details on what exactly is injured.|Please specify your physical injuries.|Which exact body parts are currently injured?|List the specific injuries you are suffering from.|Tell me exactly what is injured so I can adapt.|What exactly is injured right now?|Name the specific injuries you have.|Please be specific about what is injured.|Identify the exact locations of your injuries.|What specific joint or muscle injuries do you have?|State the exact physical injuries you carry.|Which body parts are officially injured?|List your specific physical injuries now.|Tell me the precise nature of your injuries.|What exact injuries are we working around?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "CONFIRMATION", saveField: "", nextStage: "DONE", replies: "Review the summary on your screen. Is all of this correct?|Take a look at your profile on the screen. Is this accurate?|Look over your details on the screen. Are we good to proceed?|Check the summary provided. Is everything correct?|Review your metrics on the screen. Does this look right?|Please verify the summary on your screen. Is it correct?|Inspect your profile data. Is everything accurate?|Look at the screen. Are these details correct?|Check your data on the screen. Is it good to go?|Review the summary. Do I have your permission to generate?|Look over the screen. Is the profile perfectly accurate?|Please confirm the details on your screen are correct.|Verify the data on your screen. Is it correct?|Look at the summary. Is everything here correct?|Check the details on your screen. Are they accurate?|Review your final profile. Is everything correct?|Look at the screen. Is this information completely accurate?|Please validate the summary on your screen. Is it correct?|Inspect the details. Is everything correct to proceed?|Look over your profile. Is it one hundred percent accurate?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "DONE", saveField: "", nextStage: "", replies: "Generating your custom plan right now.|Building your personalized routine now.|I am compiling your fitness plan now. Stand by.|Creating your plan based on these metrics.|Generating your exact routine now. Please wait.|I am formulating your program now.|Building your specific workout and diet now.|Generating the calculations for your plan.|I am writing your custom fitness plan now.|Processing your data to build the routine.|Generating your routine immediately.|I am structuring your workout and diet right now.|Building your finalized program now.|Generating your tailored fitness plan.|I am executing the creation of your plan now.|Building your regimen based on your data.|Generating your complete schedule now.|I am assembling your custom routine.|Building your personalized profile and plan now.|Generating your instructions now. Stand by.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" }
];

// 🚀 20+ VARIATIONS FOR EVERY ERROR
const DEFAULT_ERRORS: ErrorRow[] = [
  { stage: "GREETING", text: "I need a clear 'yes' if you are ready to start.|Please answer with 'yes' if you are ready.|Say 'yes' to begin.|I require a 'yes' to proceed.|Just say 'yes' if you want to start.|Answer 'yes' so we can begin.|I need you to say 'yes' to start.|Please confirm with a 'yes'.|Say 'yes' to initiate the session.|I must hear a 'yes' to continue.|Answer with a 'yes' if ready.|Just confirm with 'yes'.|Say 'yes' if we are starting.|Please reply 'yes' to begin.|I need a verbal 'yes' to start.|Say 'yes' to get this going.|Confirm by saying 'yes'.|Reply 'yes' to kick things off.|Just state 'yes' if ready.|I need a 'yes' to unlock the session." },
  { stage: "CONSENT", text: "I need a definitive 'yes' or 'no' regarding data consent.|Please state 'yes' or 'no' for consent.|Say 'yes' or 'no' to the consent question.|I must have a 'yes' or 'no' to proceed with your data.|Answer 'yes' or 'no' regarding your privacy consent.|Just say 'yes' or 'no' to authorize data usage.|I require a 'yes' or 'no' on the consent prompt.|Please reply with 'yes' or 'no' for data collection.|Say 'yes' or 'no' so I can legally proceed.|I need a direct 'yes' or 'no' for consent.|Answer 'yes' or 'no' to the data question.|Just state 'yes' or 'no' for authorization.|Say 'yes' or 'no' to confirm data consent.|Please provide a 'yes' or 'no' regarding consent.|I need you to specify 'yes' or 'no' to data usage.|Say 'yes' or 'no' to authorize the profile.|Confirm 'yes' or 'no' for the privacy agreement.|Reply 'yes' or 'no' to the consent requirement.|Just answer 'yes' or 'no' regarding data.|I must hear 'yes' or 'no' to process your consent." },
  { stage: "INTRO", text: "I need a valid number for your age. Try again.|Please speak a specific number for your age.|I did not catch a number. How old are you?|State your exact age as a number.|I require a numeric age to continue.|Just say the number of your age.|Please provide a distinct number for your age.|I need an actual number for your age.|State your age clearly as a number.|I did not hear a number. What is your age?|Provide your age numerically.|Just say your age as a number.|I need a specific numeric value for your age.|Please repeat your age as a number.|State the number of your current age.|I require a distinct number for age.|Tell me your exact age as a number.|I did not register a number. How old are you?|Provide a numeric response for your age.|Just state the exact number of your age." },
  { stage: "AGE", text: "I need a specific number and unit like kilos or pounds.|Please state your weight with a number and a unit.|I require a numeric weight and the unit of measurement.|State your exact weight including pounds or kilos.|I did not catch a valid weight. Try again with units.|Just say the number followed by pounds or kilos.|Please provide a clear weight measurement.|I need an actual number and unit for your weight.|State your weight clearly with kilos or pounds.|I did not hear a specific weight. Try again.|Provide your weight numerically with the unit.|Just say your weight and specify the unit.|I need a specific numeric weight measurement.|Please repeat your weight and include the unit.|State the number and whether it is pounds or kilos.|I require a distinct weight measurement.|Tell me your exact weight with the unit.|I did not register a valid weight. Try again.|Provide a numeric response with pounds or kilos.|Just state the exact number and unit of your weight." },
  { stage: "HEIGHT", text: "I need a specific height measurement like centimeters or feet.|Please state your height clearly using units.|I require a numeric height measurement.|State your exact height including the unit.|I did not catch a valid height. Try again.|Just say your height in feet or centimeters.|Please provide a clear height measurement.|I need an actual measurement for your height.|State your height clearly with specific units.|I did not hear a specific height. Try again.|Provide your height numerically with the unit.|Just say your height and specify the measurement.|I need a specific numeric height.|Please repeat your height and include the unit.|State your height accurately with units.|I require a distinct height measurement.|Tell me your exact height with the unit.|I did not register a valid height. Try again.|Provide a clear response for your height.|Just state your exact height clearly." },
  { stage: "GOAL", text: "Please choose exactly: Weight Loss, Muscle Gain, or General Fitness.|I need you to say Weight Loss, Muscle Gain, or General Fitness.|Select strictly from: Weight Loss, Muscle Gain, or General Fitness.|You must say Weight Loss, Muscle Gain, or General Fitness.|State exactly: Weight Loss, Muscle Gain, or General Fitness.|I require one of these: Weight Loss, Muscle Gain, or General Fitness.|Please state Weight Loss, Muscle Gain, or General Fitness.|Just say Weight Loss, Muscle Gain, or General Fitness.|Pick one: Weight Loss, Muscle Gain, or General Fitness.|I only recognize Weight Loss, Muscle Gain, or General Fitness.|Please repeat: Weight Loss, Muscle Gain, or General Fitness.|Choose specifically: Weight Loss, Muscle Gain, or General Fitness.|State your preference: Weight Loss, Muscle Gain, or General Fitness.|I need you to state Weight Loss, Muscle Gain, or General Fitness.|You must choose Weight Loss, Muscle Gain, or General Fitness.|Select either Weight Loss, Muscle Gain, or General Fitness.|State one: Weight Loss, Muscle Gain, or General Fitness.|Just choose Weight Loss, Muscle Gain, or General Fitness.|I require Weight Loss, Muscle Gain, or General Fitness.|Please specifically say Weight Loss, Muscle Gain, or General Fitness." },
  { stage: "LEVEL", text: "Please choose exactly: Beginner, Intermediate, or Advanced.|I need you to say Beginner, Intermediate, or Advanced.|Select strictly from: Beginner, Intermediate, or Advanced.|You must say Beginner, Intermediate, or Advanced.|State exactly: Beginner, Intermediate, or Advanced.|I require one of these: Beginner, Intermediate, or Advanced.|Please state Beginner, Intermediate, or Advanced.|Just say Beginner, Intermediate, or Advanced.|Pick one: Beginner, Intermediate, or Advanced.|I only recognize Beginner, Intermediate, or Advanced.|Please repeat: Beginner, Intermediate, or Advanced.|Choose specifically: Beginner, Intermediate, or Advanced.|State your level: Beginner, Intermediate, or Advanced.|I need you to state Beginner, Intermediate, or Advanced.|You must choose Beginner, Intermediate, or Advanced.|Select either Beginner, Intermediate, or Advanced.|State one: Beginner, Intermediate, or Advanced.|Just choose Beginner, Intermediate, or Advanced.|I require Beginner, Intermediate, or Advanced.|Please specifically say Beginner, Intermediate, or Advanced." },
  { stage: "DAYS", text: "I need a specific number between 1 and 7.|Please state a numeric day count between 1 and 7.|I require a number of days from 1 to 7.|State an exact number between 1 and 7.|I did not catch a valid number of days. Try again.|Just say a number from 1 to 7.|Please provide a clear number of days.|I need an actual number between 1 and 7.|State your days numerically from 1 to 7.|I did not hear a specific number of days. Try again.|Provide the number of days numerically.|Just say the number of days you can train.|I need a specific numeric day count.|Please repeat the number of days you can commit to.|State a distinct number between 1 and 7.|I require an exact number of days.|Tell me your exact day count numerically.|I did not register a valid number. Try again.|Provide a numeric response for the days.|Just state the exact number of days between 1 and 7." },
  { stage: "EQUIPMENT", text: "Please choose exactly: Full Gym, Dumbbells, or Bodyweight.|I need you to say Full Gym, Dumbbells, or Bodyweight.|Select strictly from: Full Gym, Dumbbells, or Bodyweight.|You must say Full Gym, Dumbbells, or Bodyweight.|State exactly: Full Gym, Dumbbells, or Bodyweight.|I require one of these: Full Gym, Dumbbells, or Bodyweight.|Please state Full Gym, Dumbbells, or Bodyweight.|Just say Full Gym, Dumbbells, or Bodyweight.|Pick one: Full Gym, Dumbbells, or Bodyweight.|I only recognize Full Gym, Dumbbells, or Bodyweight.|Please repeat: Full Gym, Dumbbells, or Bodyweight.|Choose specifically: Full Gym, Dumbbells, or Bodyweight.|State your equipment: Full Gym, Dumbbells, or Bodyweight.|I need you to state Full Gym, Dumbbells, or Bodyweight.|You must choose Full Gym, Dumbbells, or Bodyweight.|Select either Full Gym, Dumbbells, or Bodyweight.|State one: Full Gym, Dumbbells, or Bodyweight.|Just choose Full Gym, Dumbbells, or Bodyweight.|I require Full Gym, Dumbbells, or Bodyweight.|Please specifically say Full Gym, Dumbbells, or Bodyweight." },
  { stage: "ALLERGIES_CHECK", text: "I need a clear 'yes' or 'no' regarding allergies.|Please state 'yes' or 'no' to the allergy question.|Say 'yes' or 'no' regarding your food allergies.|I must have a 'yes' or 'no' to proceed with allergies.|Answer 'yes' or 'no' to the dietary restriction prompt.|Just say 'yes' or 'no' if you have allergies.|I require a 'yes' or 'no' on the allergy check.|Please reply with 'yes' or 'no' for food allergies.|Say 'yes' or 'no' so I can register allergies.|I need a direct 'yes' or 'no' regarding food allergies.|Answer 'yes' or 'no' to the allergy question.|Just state 'yes' or 'no' for dietary allergies.|Say 'yes' or 'no' to confirm food allergies.|Please provide a 'yes' or 'no' regarding dietary issues.|I need you to specify 'yes' or 'no' to allergies.|Say 'yes' or 'no' to authorize allergy data.|Confirm 'yes' or 'no' for the allergy check.|Reply 'yes' or 'no' to the allergy requirement.|Just answer 'yes' or 'no' regarding dietary restrictions.|I must hear 'yes' or 'no' to process your allergy status." },
  { stage: "ALLERGIES_DETAIL", text: "I need specific foods. If you are not sure, state 'none', otherwise name the foods.|Please name exact foods. Vagueness is not accepted here.|I require specific names of allergens. What exactly are they?|If you have an allergy, you must name it. What is the food?|I need precise food names. What are you allergic to?|Do not guess. Name the specific foods you are allergic to.|I require an exact list of allergic foods.|Please state the specific dietary items you are allergic to.|I need precise food items, not uncertainty. Name them.|State the exact foods to avoid.|I require specific food names for your allergies.|Please provide explicit foods you are allergic to.|Name the exact foods. If unsure, we cannot proceed safely.|I need a specific list of food allergens.|State exactly what foods cause an allergic reaction.|I require definitive food names for your allergies.|Please list the exact foods clearly.|Name the specific ingredients you are allergic to.|I need explicit dietary allergens named right now.|Please state exact foods without uncertainty." },
  { stage: "INJURIES_CHECK", text: "I need a clear 'yes' or 'no' regarding injuries.|Please state 'yes' or 'no' to the injury question.|Say 'yes' or 'no' regarding your physical injuries.|I must have a 'yes' or 'no' to proceed with injuries.|Answer 'yes' or 'no' to the physical restriction prompt.|Just say 'yes' or 'no' if you have injuries.|I require a 'yes' or 'no' on the injury check.|Please reply with 'yes' or 'no' for physical injuries.|Say 'yes' or 'no' so I can register injuries.|I need a direct 'yes' or 'no' regarding bodily injuries.|Answer 'yes' or 'no' to the injury question.|Just state 'yes' or 'no' for physical restrictions.|Say 'yes' or 'no' to confirm bodily injuries.|Please provide a 'yes' or 'no' regarding physical issues.|I need you to specify 'yes' or 'no' to injuries.|Say 'yes' or 'no' to authorize injury data.|Confirm 'yes' or 'no' for the injury check.|Reply 'yes' or 'no' to the injury requirement.|Just answer 'yes' or 'no' regarding physical restrictions.|I must hear 'yes' or 'no' to process your injury status." },
  { stage: "INJURIES_DETAIL", text: "I need specific injuries. If you are not sure, state 'none', otherwise name the injury.|Please name exact body parts. Vagueness is not safe here.|I require specific names of injuries. What exactly is hurt?|If you have an injury, you must name it. What is the injury?|I need precise physical issues. What are you suffering from?|Do not guess. Name the specific body parts that are injured.|I require an exact list of physical injuries.|Please state the specific joints or muscles that are injured.|I need precise injuries, not uncertainty. Name them.|State the exact body parts to avoid.|I require specific physical injuries for your profile.|Please provide explicit injuries you are carrying.|Name the exact injuries. If unsure, we cannot proceed safely.|I need a specific list of bodily injuries.|State exactly what body parts cause pain.|I require definitive physical injuries named.|Please list the exact injuries clearly.|Name the specific body areas that are injured.|I need explicit physical restrictions named right now.|Please state exact injuries without uncertainty." },
  { stage: "CONFIRMATION", text: "I need a clear 'yes' to generate the plan, or 'no' to stop.|Please state 'yes' to confirm the summary.|Say 'yes' if the screen is correct, or 'no' to fix it.|I must have a 'yes' to proceed with generating.|Answer 'yes' to validate the final profile.|Just say 'yes' if the data is accurate.|I require a 'yes' on the final confirmation.|Please reply with 'yes' to finalize.|Say 'yes' so I can build your routine.|I need a direct 'yes' to lock in the profile.|Answer 'yes' to confirm the summary.|Just state 'yes' to authorize the generation.|Say 'yes' to confirm everything is accurate.|Please provide a 'yes' to proceed to generation.|I need you to specify 'yes' to confirm.|Say 'yes' to validate the final screen.|Confirm 'yes' for the final approval.|Reply 'yes' to the generation prompt.|Just answer 'yes' to confirm the data.|I must hear 'yes' to process your final plan." }
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
  const utteranceRef = useRef<any>(null); 
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

  // INITIALIZE WEB SPEECH
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
      
      if (transcript.length > 0) handleUserResponse(transcript);
      
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
          import('@capacitor-community/text-to-speech').then(({ TextToSpeech }) => TextToSpeech.stop().catch(() => {}));
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
    if (!callActiveRef.current) return;
    
    isAiSpeakingRef.current = false;
    setIsSpeaking(false);
    
    let isNative = false;
    try {
      const { Capacitor } = await import('@capacitor/core');
      isNative = Capacitor.isNativePlatform();
    } catch (e) {
      isNative = false;
    }

    if (isNative) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        
        const permissions = await SpeechRecognition.checkPermissions().catch(() => ({ speechRecognition: 'granted' }));
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
        setIsListening(false);
        const errMsg = err.message?.toLowerCase() || "";
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
    setIsListening(false);
    let isNative = false;
    try {
      const { Capacitor } = await import('@capacitor/core');
      isNative = Capacitor.isNativePlatform();
    } catch (e) {
      isNative = false;
    }

    if (isNative) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        SpeechRecognition.stop().catch(() => {}); 
      } catch (e) {}
    } else {
      try {
        recognitionRef.current?.stop();
      } catch(e) {}
    }
  };

  // 🔊 SPEAK
  const speak = async (text: string, onComplete?: () => void) => {
    stopListening();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setIsSpeaking(true); 
    isAiSpeakingRef.current = true;
    addMessage("assistant", text);

    let isNative = false;
    try {
      const { Capacitor } = await import('@capacitor/core');
      isNative = Capacitor.isNativePlatform();
    } catch (e) {
      isNative = false;
    }

    const failsafeTimeout = setTimeout(() => {
      if (isAiSpeakingRef.current) {
        setIsSpeaking(false);
        isAiSpeakingRef.current = false;
        if (onComplete && callActiveRef.current) onComplete();
      }
    }, Math.max(text.length * 100, 8000));

    if (isNative) {
      try {
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
        
        await TextToSpeech.speak({
          text: text,
          lang: 'en-US',
          rate: 1.05, 
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
        });
        
        clearTimeout(failsafeTimeout);
        setIsSpeaking(false); 
        isAiSpeakingRef.current = false;
        
        setTimeout(() => {
          if (onComplete && callActiveRef.current) {
            onComplete();
          }
        }, 1500); 
      } catch(error: any) {
        clearTimeout(failsafeTimeout);
        setIsSpeaking(false); 
        isAiSpeakingRef.current = false;
        if (onComplete && callActiveRef.current) onComplete();
      }
    } else {
      if (!synthRef.current) {
        clearTimeout(failsafeTimeout);
        setIsSpeaking(false); 
        isAiSpeakingRef.current = false;
        if (onComplete && callActiveRef.current) onComplete();
        return;
      }

      try {
        synthRef.current.cancel(); 

        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance; 
        const voices = synthRef.current.getVoices();
        utterance.voice = voices.find(v => v.name.includes("Google US English")) || voices[0];
        utterance.rate = 1.05; utterance.pitch = 1;

        utterance.onend = () => {
          clearTimeout(failsafeTimeout);
          setIsSpeaking(false); 
          isAiSpeakingRef.current = false;
          setTimeout(() => {
            if (onComplete && callActiveRef.current) onComplete();
          }, 600);
        };

        utterance.onerror = (e) => {
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
        speak("Understood, let's go back. " + prevConfig.replies.split('|')[0], startListening);
        return;
      }
    }

    if (stageRef.current === "GREETING" && (extractedFromDataset === "no" || textLower.match(/\b(no|nope|nah|not ready)\b/i))) {
      speak("Understood. I will be here when you are ready to begin.");
      setTimeout(() => toggleCall(), 4000); return;
    }
    if (stageRef.current === "CONSENT" && (extractedFromDataset === "no" || textLower.match(/\b(no|nope|nah|i don't agree)\b/i))) {
      speak("I understand. I require that info to build a program safely. We will stop here. Return when you are ready.");
      setTimeout(() => toggleCall(), 6000); return;
    }

    if (stageRef.current === "CONFIRMATION" && (extractedFromDataset === "no" || textLower.match(/\b(change|fix|no|wait|wrong|edit|incorrect)\b/i))) {
      speak("Understood. Tap the pencil icon next to any field on your screen to edit it manually. State 'looks good' when you are done.", startListening); return; 
    }

    let isValid = true;
    
    if (datasetMatch) {
      isValid = true;
    } else {
      if (stageRef.current === "GREETING" || stageRef.current === "CONSENT") {
        isValid = /\b(yes|yeah|sure|ok|okay|yep|agree|ready|let's go|lets go)\b/i.test(textLower);
      } else if (["INTRO", "AGE", "HEIGHT", "DAYS"].includes(stageRef.current)) {
        isValid = /\d/.test(textLower); 
      } else if (stageRef.current === "GOAL") {
        isValid = /\b(weight|loss|lose|muscle|gain|build|general|fitness|fit)\b/i.test(textLower);
      } else if (stageRef.current === "LEVEL") {
        isValid = /\b(beginner|intermediate|advanced|pro|new|start|novice)\b/i.test(textLower);
      } else if (stageRef.current === "EQUIPMENT") {
        isValid = /\b(gym|dumbbells|bodyweight|weights|home)\b/i.test(textLower);
      } else if (stageRef.current === "ALLERGIES_CHECK" || stageRef.current === "INJURIES_CHECK") {
        isValid = /\b(yes|yeah|yep|sure|no|nope|nah|none|nothing|clear)\b/i.test(textLower);
      } else if (stageRef.current === "ALLERGIES_DETAIL" || stageRef.current === "INJURIES_DETAIL") {
        // 🚀 PREVENTS USER FROM SAYING "I DON'T KNOW" OR "NOT SURE" FOR INJURIES/ALLERGIES
        const uncertainRegex = /\b(not sure|don't know|dont know|no idea|idk|unsure|maybe|can't remember|cant remember|not certain)\b/i;
        if (uncertainRegex.test(textLower) || textLower.trim().length < 2) {
          isValid = false;
        } else {
          isValid = true;
        }
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
      finalErrorReply = errorOptions.length > 0 ? errorOptions[Math.floor(Math.random() * errorOptions.length)] : "I require a clearer answer.";
      
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
    let finalReply = replyOptions.length > 0 ? replyOptions[Math.floor(Math.random() * replyOptions.length)] : "Generating your plan.";

    if (finalReply.includes("[Name]")) finalReply = finalReply.replace(/\[Name\]/g, userRef.current?.firstName || "there");

    // 🚀 EMPATHY INJECTIONS (NO FILLER WORDS) 🚀
    if (currentConfig?.stage === "LEVEL") {
      const level = updatedData.level.toLowerCase();
      if (level.includes("beginner") || level.includes("new") || level.includes("start") || level.includes("novice")) {
        finalReply = "Everyone starts somewhere. We will build a rock-solid foundation. " + finalReply;
      } else if (level.includes("intermediate")) {
        finalReply = "You have the basics down. Time to turn things up a notch. " + finalReply;
      } else if (level.includes("advanced") || level.includes("pro")) {
        finalReply = "We are going to dial in the details and push your limits. " + finalReply;
      }
    }

    if (currentConfig?.stage === "ALLERGIES_DETAIL") {
      finalReply = "Dealing with food restrictions is difficult, but I will make absolutely sure those are kept entirely out of your meal plan. " + finalReply;
    }

    if (targetStage === "CONFIRMATION") {
      finalReply = `Let us review the data. You are ${updatedData.age} years old, weigh ${updatedData.weight}, and are ${updatedData.height} tall. Goal is to ${updatedData.goal}. We will use the ${updatedData.equipment} for ${updatedData.days} days a week. Allergies: ${updatedData.allergies}. Injuries: ${updatedData.injuries}. Is this data correct?`;
      
      if (currentConfig?.stage === "INJURIES_DETAIL") {
        finalReply = "I am very sorry to hear you are dealing with that injury. We will absolutely work around it to keep you safe and pain-free while making progress. " + finalReply;
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
      };
      
      const formattedDiet = { 
        dailyCalories: Number(aiData.dietPlan?.dailyCalories) || 2000, 
        dailyPlans: aiData.dietPlan?.dailyPlans || []
      };

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
            injuries: String(finalData.injuries || "none"),
            injuriesDetected: aiData.injuries_detected || [] 
        },
        workoutPlan: formattedWorkout, 
        dietPlan: formattedDiet,
      });

      setStage("DONE");
      setIsThinking(false);

      speak("The program is finalized and saved. Transitioning you to your dashboard now.");
      
      setTimeout(() => {
        router.push("/profile"); 
      }, 6500); 

    } catch (error: any) {
      console.error("Critical Error Generating Plan:", error);
      setIsThinking(false);
      toast.error(`Failed to generate: ${error.message}`); 
      speak("I encountered an error during calculation. Let us try that again.");
      setStage("CONFIRMATION");
      stageRef.current = "CONFIRMATION";
    }
  };

  const toggleCall = async () => {
    if (callActive) {
      setCallActive(false); setIsSpeaking(false); setIsListening(false); isAiSpeakingRef.current = false;
      await stopListening(); 
      
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
        greeting = greeting.replace(/^(Hey|What's up|Welcome in)[!|,]/i, `$1 ${userRef.current?.firstName},`);
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
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground pb-32 pt-16 md:pt-24">
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
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Card className="relative overflow-hidden flex flex-col items-center justify-center bg-black/5 border-primary/20 shadow-sm py-4 md:py-6">
                <div className={`absolute inset-0 bg-primary/20 rounded-full blur-3xl transition-all duration-500 ${isSpeaking ? "scale-150 opacity-100" : "scale-50 opacity-0"}`} />
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`relative size-16 md:size-24 rounded-full border-4 border-primary/50 flex items-center justify-center bg-background shadow-xl overflow-hidden ${isSpeaking ? "scale-110 border-primary" : "scale-100"}`}>
                    <img src="ai-avatar.png" alt="AI Trainer" className="size-full object-cover p-2" />
                  </div>
                  <h3 className="mt-3 font-bold text-lg">Apex </h3>
                  <div className="mt-1 h-5 flex items-center justify-center">
                    {isSpeaking ? <span className="flex items-center gap-1.5 text-primary text-xs font-medium"><Volume2 className="w-3 h-3 animate-pulse" /> Speaking...</span> : <span className="text-muted-foreground text-xs font-medium">Waiting...</span>}
                  </div>
                </div>
              </Card>

              <Card className="relative overflow-hidden flex flex-col items-center justify-center bg-muted/30 border-border shadow-sm py-4 md:py-6">
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`relative size-16 md:size-24 rounded-full border-4 ${isListening ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "border-muted"} flex items-center justify-center overflow-hidden bg-background transition-all duration-300`}>
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
              <div ref={messageContainerRef} className="h-40 md:h-64 overflow-y-auto p-4 space-y-4 bg-background/50 scroll-smooth">
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
                      disabled={isSpeaking || isThinking}
                      placeholder={isSpeaking || isThinking ? "Wait for Apex to finish speaking..." : "Type your answer here..."} 
                      className="flex-1 bg-background border border-border rounded-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Button type="submit" size="icon" disabled={!inputText.trim() || isSpeaking || isThinking} className="rounded-full shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                  <Button
                    onClick={() => isListening ? stopListening() : startListening()}
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
            {stage === "DONE" || isThinking ? <><Loader2 className="mr-2 animate-spin" /> Generating Plan...</> : "End Session"}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}