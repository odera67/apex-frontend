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

// 🚀 ULTRA-REALISTIC CONVERSATIONAL DIALOGUE
const DEFAULT_FLOW: IntakeStep[] = [
  { stage: "GREETING", saveField: "", nextStage: "CONSENT", replies: "Hey, I'm Apex. How's your day going? You ready to jump into this?|What's going on? I'm Apex. Ready to get this going?|Hey there. I'm your coach, Apex. Are you ready to map this out?|So, I'm Apex. Whenever you're ready to start, just let me know.|Hey! I'm Apex. Ready to build this routine?|Let's get into it. I'm Apex. You ready?|What's up! I'm Apex. Are you good to go?|Hey, Apex here. You ready to set up your profile?|So glad you're here. I'm Apex. Ready to start?|Alright, let's do this. I'm Apex. You ready?|Hey there, I'm Apex. Should we kick this off?|I'm Apex. Whenever you're ready, just say the word.|Let's get this moving. I'm Apex. Ready?|Hey, Apex speaking. Are we ready to get to work?|What's up? Apex here. You ready to start building?|Hey, I'm Apex. Are you ready to dive in?|So, I'm Apex. Ready to figure out your game plan?|Hey there! Apex here. Let's get this going—you ready?|I'm Apex. Whenever you're good to start, I am.|Hey, let's get you set up. I'm Apex. Ready?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "CONSENT", saveField: "", nextStage: "INTRO", replies: "Before we really get into the weeds, I just need to make sure you're cool with me using your fitness data to build this out.|Just a quick heads up, I need to use some of your health info to make this safe. Does that sound good to you?|To make this actually work for you, I'll need to process some basic physical stats. Is that alright?|Quick housekeeping—are you okay with sharing some basic health metrics so I can personalize this?|Before we start, are you cool with me collecting your fitness data for the plan?|Just need a quick yes from you on sharing health details so we can do this safely.|Are you comfortable with me using your physical stats to build the routine?|To get this right, I need your permission to use your health data. Sound good?|I have to ask—are you okay with sharing your fitness data so I can customize things?|Before moving on, are you good with sharing your health info with me?|Just making sure you consent to me using your physical metrics for this program.|Are you fine with providing some basic health data to get this rolling?|To keep things safe, I need your go-ahead to use your fitness data. Okay with you?|Just a formality, but do you consent to sharing your health data?|Are you okay with me processing your physical stats to build your profile?|Before we dive in, do you mind sharing your fitness info so I can tailor this?|Are you cool with me using your health details to make sure this plan actually fits you?|Just checking if you're comfortable sharing your physical data for the workout plan.|I need to clear this first—do you consent to sharing your health metrics?|Before I ask any questions, are you okay with me using your fitness data?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "INTRO", saveField: "age", nextStage: "AGE", replies: "Alright, let's get the basics out of the way. How old are you?|To start, mind telling me your age?|Let's start super simple. How old are you right now?|So, first things first—how old are you?|Just to get a baseline, what's your age?|Let's kick things off. How old are you?|To get a sense of where you're at, how old are you?|How many years young are we talking?|Starting with the easy stuff. What's your age?|Mind sharing how old you are to start?|Let's get your age down first. How old are you?|To start off your profile, how old are you?|Just so I know who I'm working with, what's your age?|Let's get the numbers going. How old are you?|First question for you—how old are you?|What's your current age, just to start?|To get the ball rolling, how old are you?|Let's start with your age. What are we looking at?|Mind telling me your age so we can start?|Just for the baseline, how old are you?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "AGE", saveField: "weight", nextStage: "HEIGHT", replies: "And what are you weighing these days?|Just for the record, how much do you weigh right now?|Mind telling me your current weight?|Let's get your weight down. What are we working with?|About how much do you weigh right now?|And your current weight is...?|What's the scale saying these days?|Just to calculate things right, how much do you weigh?|Mind giving me your current weight?|And what are you weighing right now?|Let's grab your weight. What is it?|So, how much do you weigh currently?|And what's your weight looking like right now?|Just need your weight to keep things accurate.|What are we looking at for your current weight?|And how heavy are you right now?|Mind telling me what you weigh?|Let's jot down your weight. How much is it?|And what's your current body weight?|Just so I have it, how much do you weigh?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "HEIGHT", saveField: "height", nextStage: "GOAL", replies: "How tall are you, by the way?|And what's your height?|Just to finish up the measurements, how tall are you?|Mind telling me how tall you are?|And your height is...?|How tall are you standing these days?|Let's get your height. What are we working with?|And how tall would you say you are?|Just need your height real quick.|What's your height, just so I have it?|And how tall are you right now?|Mind giving me your current height?|Let's jot down your height. What is it?|And what are we looking at for your height?|Just to round out the stats, how tall are you?|How tall are you, just for the record?|And your height would be...?|Mind telling me your height?|Let's get your vertical. How tall are you?|And what's your exact height?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "GOAL", saveField: "goal", nextStage: "LEVEL", replies: "So what's the big goal here? Trying to lose some weight, pack on muscle, or just improve your overall fitness?|What are we actually aiming for? Weight loss, muscle gain, or general fitness?|Tell me what you really want out of this. Is it weight loss, muscle gain, or just general fitness?|So, what's the main focus? Leaning out, putting on size, or just getting fit?|What's the end game here? Are we looking at weight loss, muscle gain, or general fitness?|So, why are we doing this? Weight loss, muscle gain, or general fitness?|What are you trying to achieve right now? Weight loss, muscle gain, or general fitness?|What's the priority? Dropping weight, building muscle, or just general fitness?|Are you mostly focused on weight loss, muscle gain, or general fitness right now?|What's the main goal driving you? Weight loss, muscle gain, or general fitness?|So, what are we chasing? Weight loss, muscle gain, or just general fitness?|What's the big picture goal? Weight loss, muscle gain, or general fitness?|Are we trying to lose weight, gain muscle, or just work on general fitness?|What's your primary focus right now? Weight loss, muscle gain, or general fitness?|Tell me what success looks like for you. Weight loss, muscle gain, or general fitness?|So, what's the plan? Weight loss, muscle gain, or general fitness?|What are we striving for? Weight loss, muscle gain, or general fitness?|Are you leaning more towards weight loss, muscle gain, or general fitness?|What's the main objective here? Weight loss, muscle gain, or general fitness?|So, what's the ultimate goal? Weight loss, muscle gain, or general fitness?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "LEVEL", saveField: "level", nextStage: "DAYS", replies: "If you had to guess, where would you say you're at right now experience-wise? Like, beginner, intermediate, or advanced?|Be honest with me—how experienced are you? Beginner, intermediate, or advanced?|Where do you feel your fitness level is right now? Beginner, intermediate, or advanced?|How comfortable are you working out? Would you say beginner, intermediate, or advanced?|What's your experience level like? Beginner, intermediate, or advanced?|So, how seasoned are you? Are we talking beginner, intermediate, or advanced?|Where are you starting from today? Beginner, intermediate, or advanced?|How would you rate your current fitness? Beginner, intermediate, or advanced?|Are you coming into this as a beginner, intermediate, or advanced?|What's your background like? Beginner, intermediate, or advanced?|How much experience do you actually have? Beginner, intermediate, or advanced?|So, what level are we working with? Beginner, intermediate, or advanced?|Are you essentially a beginner, intermediate, or advanced right now?|How would you classify yourself? Beginner, intermediate, or advanced?|Where do you sit on the spectrum? Beginner, intermediate, or advanced?|Are we starting fresh as a beginner, or are you intermediate or advanced?|What's your comfort level in the gym? Beginner, intermediate, or advanced?|How skilled are you with training? Beginner, intermediate, or advanced?|Would you call yourself a beginner, intermediate, or advanced?|So, what's your current level? Beginner, intermediate, or advanced?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "DAYS", saveField: "days", nextStage: "EQUIPMENT", replies: "Realistically, how many days a week can you dedicate to working out?|How many days a week can you actually commit to this without burning out?|What does your schedule look like? How many days a week can we train?|How many days a week do you realistically have time to train?|If we're being honest, how many days a week can you put the work in?|How many days a week can you fit a workout into your life?|What's your availability like? How many days a week can you train?|How many days a week are you willing to sweat?|Realistically, how many days can you train each week?|How many weekly sessions can you comfortably handle?|What's a realistic number of days per week for you to train?|How many days a week can you consistently show up?|Let's talk schedule. How many days a week can you train?|How many days a week are we going to be doing this?|What's the maximum number of days a week you can commit to?|How many days per week do you want to be working out?|Realistically, how many days a week can we make this happen?|How many days a week do you actually have the time to train?|What's a sustainable number of days per week for you to work out?|How many days a week are you bringing the energy?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "EQUIPMENT", saveField: "equipment", nextStage: "ALLERGIES_CHECK", replies: "What kind of gear do you have access to? Are we talking a full gym, some dumbbells at home, or strictly bodyweight?|Where are you working out? Do you have a full gym, just dumbbells, or only bodyweight?|What's your setup look like? Full gym, dumbbells, or bodyweight?|Are we hitting a full gym, using some dumbbells, or sticking to bodyweight?|What equipment are we working with? Full gym, dumbbells, or bodyweight?|Do you have access to a full gym, some dumbbells, or are we doing bodyweight stuff?|What's the equipment situation? Full gym, dumbbells, or bodyweight?|Are you training at a full gym, with dumbbells, or using your own bodyweight?|What kind of access do you have? Full gym, dumbbells, or bodyweight only?|So, are we using a full gym, dumbbells, or bodyweight for this plan?|What do you have available? Full gym, dumbbells, or bodyweight?|Are we talking a full gym setup, dumbbells, or strictly bodyweight?|What gear can we use? Full gym, dumbbells, or bodyweight?|Are you working out in a full gym, with dumbbells, or doing bodyweight exercises?|What's your training environment? Full gym, dumbbells, or bodyweight?|Do you plan to use a full gym, dumbbells, or just bodyweight?|What's the plan for equipment? Full gym, dumbbells, or bodyweight?|Are we going full gym, sticking to dumbbells, or doing bodyweight?|What do you have at your disposal? Full gym, dumbbells, or bodyweight?|So, what are we using? Full gym, dumbbells, or bodyweight?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "ALLERGIES_CHECK", saveField: "allergies", nextStage: "ALLERGIES_DETAIL", replies: "Let's pivot to food for a second. Any allergies I should know about?|Do you have any strict food allergies we need to dodge?|Are there any foods you're straight-up allergic to?|Quick question on nutrition—do you have any food allergies?|Do you have any food allergies or things you absolutely can't eat?|Are there any dietary restrictions or allergies I need to be aware of?|Let's talk diet really quick. Any food allergies?|Do you have any known food allergies we need to work around?|Are you allergic to anything specific when it comes to food?|Just checking, do you have any food allergies?|Any foods that cause an allergic reaction for you?|Do you have any strict allergies to certain foods?|Are there any ingredients you're allergic to?|Quick check—do you suffer from any food allergies?|Do you have any food allergies that I need to keep out of the plan?|Are there any dietary allergies you're dealing with?|Do you have any food allergies at all?|Just to be safe, do you have any food allergies?|Are you completely clear of any food allergies?|Let me know if you have any specific food allergies.", isConditional: true, nextStageIfNo: "INJURIES_CHECK", repliesIfNo: "Gotcha. Next thing—any physical injuries holding you back right now?|Makes sense. Moving on, do you have any nagging injuries I should know about?|Okay, no allergies. How about your body—any physical injuries?|No food issues, good. Do you have any physical injuries right now?|Alright, no allergies. Are you dealing with any physical injuries?|Cool, no allergies. What about physical injuries? Anything hurting?|No dietary restrictions. Any physical injuries we need to work around?|Okay, moving past allergies. Do you have any physical injuries?|No allergies to worry about. Are you nursing any physical injuries?|Alright, let's talk about your body. Any physical injuries?|No food allergies. Do you have any current physical injuries?|Got it on the allergies. Are you dealing with any physical injuries?|No dietary issues. Any physical injuries I need to be careful with?|Okay, avoiding allergies. Do you have any physical injuries?|No allergies stated. Do you have any physical injuries holding you back?|Understood. Are you dealing with any physical injuries?|Okay, I've got that down. Do you have any physical injuries?|No allergies. Let's move to injuries—do you have any?|Got it. Are there any physical injuries you're currently dealing with?|No food allergies. Do you have any physical injuries right now?", dependsOnField: "", dependsOnValue: "" },
  { stage: "ALLERGIES_DETAIL", saveField: "allergies", nextStage: "INJURIES_CHECK", replies: "What exactly are you allergic to? Like peanuts, dairy, gluten?|Tell me specifically what foods mess with you.|What specific foods do we need to completely avoid?|Which foods are you actually allergic to?|Name the exact foods that you're allergic to for me.|What specific ingredients do we need to keep off your plate?|Tell me exactly what you can't eat.|What are the specific food allergies you're dealing with?|List the exact foods that trigger your allergies.|Which specific foods do we need to dodge?|What exactly should I be keeping out of your diet?|Tell me the specific foods you're allergic to.|What exact ingredients are we avoiding here?|Name the specific foods you have an allergic reaction to.|What exactly are your food allergies?|Tell me the precise foods we need to avoid.|Which specific foods are off-limits for you?|List the exact foods you're allergic to.|What specific dietary items are we avoiding?|Tell me exactly what foods you're allergic to.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "INJURIES_CHECK", saveField: "injuries", nextStage: "INJURIES_DETAIL", replies: "Last thing before we wrap this up—any injuries holding you back right now?|Got any nagging injuries I need to be careful with?|Are you dealing with any joint pain or physical injuries right now?|Do you have any physical injuries we need to work around?|Are there any injuries or pain points I should know about?|Are you nursing any physical injuries at the moment?|Do you have any lingering physical injuries?|Are there any physical restrictions or injuries you're dealing with?|Do you have any bodily injuries I need to keep in mind?|Are you currently dealing with any physical injuries?|Any injuries or spots that have been bothering you lately?|Do you have any physical injuries that might limit you?|Are there any physical injuries we need to be careful with?|Do you suffer from any ongoing physical injuries?|Are you dealing with any pain or physical injuries?|Do you have any physical injuries you're currently nursing?|Are there any bodily injuries I should be aware of?|Do you have any physical injuries holding you back?|Are you completely free of any physical injuries?|Let me know if you have any physical injuries right now.", isConditional: true, nextStageIfNo: "CONFIRMATION", repliesIfNo: "Awesome. Take a look at the screen—did I miss anything, or does everything look solid?|Perfect. Check out the summary on your screen. Does everything look accurate?|Great. Look over your profile on the screen. Are we good to generate this?|Nice. Take a quick look at your details on the screen. Is it all correct?|Good to hear. Check the screen real quick—is all this information right?|Awesome. Look at the summary on your screen. Everything look good?|Perfect. Review your stats on the screen. Are we good to go?|Great. Take a glance at the screen. Did I get everything right?|Nice. Check the details on your screen. Is it all accurate?|Good to hear. Review the summary on your screen. Are we ready to generate?|Awesome. Look over the screen—does everything look perfectly accurate?|Perfect. Please confirm the details on your screen are right.|Great. Verify the data on your screen. Everything look correct?|Nice. Look at the summary. Is everything here looking good?|Good to hear. Check the details on your screen. Are they accurate?|Awesome. Review your final profile. Everything look correct?|Perfect. Look at the screen. Is this info completely accurate?|Great. Please validate the summary on your screen. Is it right?|Nice. Inspect the details. Is everything correct so we can proceed?|Good to hear. Look over your profile. Is it all accurate?", dependsOnField: "", dependsOnValue: "" },
  { stage: "INJURIES_DETAIL", saveField: "injuries", nextStage: "CONFIRMATION", replies: "What specifically is hurting? Like your lower back, or a tricky shoulder?|Tell me exactly what's injured so I don't aggravate it.|Which body parts are specifically giving you trouble?|What exact injuries are we working around here?|Name the specific body parts that are injured right now.|What exactly is hurting or feeling off?|Tell me the specific areas you're dealing with pain in.|What specific physical injuries do we need to avoid?|List the exact body parts that are currently injured.|Which specific joints or muscles are bothering you?|What exactly should I be careful with regarding your body?|Tell me the specific injuries you're nursing.|What exact body parts are we avoiding putting stress on?|Name the specific injuries you're dealing with.|What exactly are your physical injuries?|Tell me the precise body parts we need to be careful with.|Which specific areas are currently injured for you?|List the exact injuries you're working through.|What specific physical issues are we avoiding?|Tell me exactly what is injured right now.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "CONFIRMATION", saveField: "", nextStage: "DONE", replies: "Alright, I think I've got a pretty good picture here. Take a look at the screen—did I miss anything, or does everything look solid?|Check out the summary on your screen. Does everything look accurate to you?|Look over your profile on the screen. Are we good to generate this thing?|Take a quick look at your details on the screen. Is it all correct?|Check the screen real quick—is all this information looking right to you?|Take a glance at the summary on your screen. Everything look good?|Review your stats on the screen. Are we good to go?|Take a glance at the screen. Did I catch everything right?|Check the details on your screen. Is it all perfectly accurate?|Review the summary on your screen. Are we ready to generate the plan?|Look over the screen—does everything look perfectly accurate to you?|Please confirm the details on your screen are right before we move on.|Verify the data on your screen. Everything looking correct?|Look at the summary. Is everything here looking good to go?|Check the details on your screen. Are they accurate?|Review your final profile. Everything look correct?|Look at the screen. Is this info completely accurate?|Please validate the summary on your screen. Is it right?|Inspect the details. Is everything correct so we can proceed?|Look over your profile. Is it all one hundred percent accurate?", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" },
  { stage: "DONE", saveField: "", nextStage: "", replies: "Perfect. Give me just a second to put all this together for you.|Alright, let me think for a second while I build this routine.|Awesome. Give me a moment to crunch the numbers and get this plan ready.|Cool. I'm putting your custom plan together right now. Just a second.|Got it. Let me formulate this program for you real quick.|Alright, I'm building your specific workout and diet now. Hang tight.|Awesome. Let me run the calculations for your plan. Won't be long.|Cool. I'm writing your custom fitness plan right now. Give me a sec.|Got it. Let me process all this and build the routine.|Alright, I'm generating your routine immediately. Hold on.|Awesome. Let me structure your workout and diet right now.|Cool. I'm building your finalized program right now. Give me a moment.|Got it. Let me put together your tailored fitness plan.|Alright, I'm executing the creation of your plan right now.|Awesome. Building your regimen based on your data. Hang tight.|Cool. I'm generating your complete schedule right now.|Got it. Let me assemble your custom routine real quick.|Alright, I'm building your personalized profile and plan now.|Awesome. Generating your instructions right now. Stand by.|Cool. Let me finalize your plan. Just a second.", isConditional: false, nextStageIfNo: "", repliesIfNo: "", dependsOnField: "", dependsOnValue: "" }
];

// 🚀 ULTRA-REALISTIC CONVERSATIONAL ERRORS
const DEFAULT_ERRORS: ErrorRow[] = [
  { stage: "GREETING", text: "My bad, I didn't catch that. Just say 'yes' if you're ready to jump in.|Sorry, I missed that. Are you ready to start? Just say 'yes'.|I didn't quite hear you. Just let me know with a 'yes' if we're starting.|My fault, didn't catch that. Say 'yes' if you're good to go.|Sorry about that, missed what you said. Just say 'yes' if you're ready.|Didn't quite get that. Say 'yes' to kick this off.|My bad, can you repeat that? Just say 'yes' if we're starting.|Sorry, I missed your answer. Say 'yes' if you're ready to begin.|I didn't catch that one. Just confirm with a 'yes' if you're ready.|My fault, didn't hear you. Say 'yes' if we're good to start.|Sorry, missed that. Just say 'yes' if you want to get going.|Didn't quite catch that. Just reply 'yes' to start.|My bad, didn't get that. Say 'yes' to initiate things.|Sorry about that. Just confirm with 'yes' if you're ready.|I missed that. Say 'yes' if we are starting up.|My fault, didn't hear you clearly. Reply 'yes' to begin.|Sorry, didn't catch that. Just state 'yes' if you're ready.|Didn't quite get that. Say 'yes' to get this moving.|My bad. Just say 'yes' to unlock the session.|Sorry, missed that. Just say 'yes' to start." },
  { stage: "CONSENT", text: "Sorry, I really need a clear 'yes' or 'no' on the data stuff before we move on.|My bad, I didn't catch that. Just let me know 'yes' or 'no' on the consent.|I didn't quite hear you. Just say 'yes' or 'no' so I know you're cool with it.|My fault, missed that. Can you just say 'yes' or 'no' to the data question?|Sorry about that. I just need a simple 'yes' or 'no' to authorize this.|Didn't quite get that. Just say 'yes' or 'no' regarding your privacy.|My bad, can you repeat that? Just 'yes' or 'no' for the consent.|Sorry, I missed your answer. Say 'yes' or 'no' for the data collection.|I didn't catch that one. Just confirm 'yes' or 'no' so I can proceed.|My fault, didn't hear you. Say 'yes' or 'no' to the data question.|Sorry, missed that. Just state 'yes' or 'no' for the authorization.|Didn't quite catch that. Just reply 'yes' or 'no' to confirm consent.|My bad, didn't get that. Say 'yes' or 'no' regarding the privacy stuff.|Sorry about that. Just confirm with 'yes' or 'no' to specify data usage.|I missed that. Say 'yes' or 'no' to authorize the profile.|My fault, didn't hear you clearly. Reply 'yes' or 'no' for the agreement.|Sorry, didn't catch that. Just state 'yes' or 'no' to the requirement.|Didn't quite get that. Say 'yes' or 'no' regarding the data.|My bad. Just say 'yes' or 'no' to process your consent.|Sorry, missed that. Just say 'yes' or 'no' for the data stuff." },
  { stage: "INTRO", text: "My bad, I didn't catch the number. How old are you again?|Sorry, missed that. Can you just tell me the number for your age?|I didn't quite hear a number. How old are you?|My fault, didn't catch that. Just say your age as a number.|Sorry about that. I need a specific number for your age.|Didn't quite get that. Just tell me how old you are numerically.|My bad, can you repeat that? Just the number for your age.|Sorry, I missed your age. What's the number?|I didn't catch that one. Just state your age clearly as a number.|My fault, didn't hear you. Provide your age numerically.|Sorry, missed that. Just say your age as a specific number.|Didn't quite catch that. Just reply with the number of your age.|My bad, didn't get that. Say your exact age as a number.|Sorry about that. Just confirm your age with a distinct number.|I missed that. Tell me your exact age as a number.|My fault, didn't hear you clearly. State the number of your age.|Sorry, didn't catch that. Just state your exact age as a number.|Didn't quite get that. Say your age as a numeric value.|My bad. Just say the exact number of your age.|Sorry, missed that. Provide a numeric response for your age." },
  { stage: "AGE", text: "Sorry, I missed that. Make sure to give me a number and whether it's kilos or pounds.|My bad, didn't catch the weight. Try again with the number and unit.|I didn't quite hear that. Just say the number followed by pounds or kilos.|My fault, missed that. I need a specific number and unit for your weight.|Sorry about that. State your exact weight including pounds or kilos.|Didn't quite get that. Just tell me your weight clearly with the unit.|My bad, can you repeat that? Just the number and if it's kilos or pounds.|Sorry, I missed your weight. What's the number and unit?|I didn't catch that one. Just state your weight clearly with kilos or pounds.|My fault, didn't hear you. Provide your weight numerically with the unit.|Sorry, missed that. Just say your weight and specify the measurement.|Didn't quite catch that. Just reply with the specific numeric weight.|My bad, didn't get that. Say your exact weight with the unit.|Sorry about that. Just confirm your weight with the number and unit.|I missed that. Tell me your exact weight including pounds or kilos.|My fault, didn't hear you clearly. State the number and unit for your weight.|Sorry, didn't catch that. Just state your exact weight with the unit.|Didn't quite get that. Say your weight as a numeric value with the unit.|My bad. Just say the exact number and unit of your weight.|Sorry, missed that. Provide a numeric response with pounds or kilos." },
  { stage: "HEIGHT", text: "My bad, I didn't catch that. Try saying it like '170 centimeters' or '5 foot 10'.|Sorry, missed that. Can you just tell me your height with the units?|I didn't quite hear that. Just say your height in feet or centimeters.|My fault, didn't catch that. I need a specific measurement for your height.|Sorry about that. State your exact height including the unit.|Didn't quite get that. Just tell me your height clearly with specific units.|My bad, can you repeat that? Just your height with the measurement.|Sorry, I missed your height. What's the number and unit?|I didn't catch that one. Just state your height clearly with the units.|My fault, didn't hear you. Provide your height numerically with the unit.|Sorry, missed that. Just say your height and specify the measurement.|Didn't quite catch that. Just reply with the specific numeric height.|My bad, didn't get that. Say your exact height with the unit.|Sorry about that. Just confirm your height with the number and unit.|I missed that. Tell me your exact height including the measurement.|My fault, didn't hear you clearly. State the number and unit for your height.|Sorry, didn't catch that. Just state your exact height with the unit.|Didn't quite get that. Say your height as a numeric value with the unit.|My bad. Just say the exact number and unit of your height.|Sorry, missed that. Provide a clear response for your height." },
  { stage: "GOAL", text: "Sorry, I just need to know if we're aiming for Weight Loss, Muscle Gain, or General Fitness.|My bad, missed that. Just choose exactly: Weight Loss, Muscle Gain, or General Fitness.|I didn't quite hear you. Just say Weight Loss, Muscle Gain, or General Fitness.|My fault, didn't catch that. I need one of these: Weight Loss, Muscle Gain, or General Fitness.|Sorry about that. State exactly: Weight Loss, Muscle Gain, or General Fitness.|Didn't quite get that. Just tell me Weight Loss, Muscle Gain, or General Fitness.|My bad, can you repeat that? Pick one: Weight Loss, Muscle Gain, or General Fitness.|Sorry, I missed your goal. Is it Weight Loss, Muscle Gain, or General Fitness?|I didn't catch that one. Just choose specifically: Weight Loss, Muscle Gain, or General Fitness.|My fault, didn't hear you. State your preference: Weight Loss, Muscle Gain, or General Fitness.|Sorry, missed that. Just say Weight Loss, Muscle Gain, or General Fitness.|Didn't quite catch that. Just reply with Weight Loss, Muscle Gain, or General Fitness.|My bad, didn't get that. Choose Weight Loss, Muscle Gain, or General Fitness.|Sorry about that. Just confirm with Weight Loss, Muscle Gain, or General Fitness.|I missed that. Tell me if it's Weight Loss, Muscle Gain, or General Fitness.|My fault, didn't hear you clearly. State one: Weight Loss, Muscle Gain, or General Fitness.|Sorry, didn't catch that. Just state Weight Loss, Muscle Gain, or General Fitness.|Didn't quite get that. Say Weight Loss, Muscle Gain, or General Fitness.|My bad. Just say exactly Weight Loss, Muscle Gain, or General Fitness.|Sorry, missed that. Provide a choice: Weight Loss, Muscle Gain, or General Fitness." },
  { stage: "LEVEL", text: "Sorry, I missed that. Would you say you're a Beginner, Intermediate, or Advanced?|My bad, didn't catch that. Just choose exactly: Beginner, Intermediate, or Advanced.|I didn't quite hear you. Just say Beginner, Intermediate, or Advanced.|My fault, didn't catch that. I need one of these: Beginner, Intermediate, or Advanced.|Sorry about that. State exactly: Beginner, Intermediate, or Advanced.|Didn't quite get that. Just tell me Beginner, Intermediate, or Advanced.|My bad, can you repeat that? Pick one: Beginner, Intermediate, or Advanced.|Sorry, I missed your level. Is it Beginner, Intermediate, or Advanced?|I didn't catch that one. Just choose specifically: Beginner, Intermediate, or Advanced.|My fault, didn't hear you. State your level: Beginner, Intermediate, or Advanced.|Sorry, missed that. Just say Beginner, Intermediate, or Advanced.|Didn't quite catch that. Just reply with Beginner, Intermediate, or Advanced.|My bad, didn't get that. Choose Beginner, Intermediate, or Advanced.|Sorry about that. Just confirm with Beginner, Intermediate, or Advanced.|I missed that. Tell me if it's Beginner, Intermediate, or Advanced.|My fault, didn't hear you clearly. State one: Beginner, Intermediate, or Advanced.|Sorry, didn't catch that. Just state Beginner, Intermediate, or Advanced.|Didn't quite get that. Say Beginner, Intermediate, or Advanced.|My bad. Just say exactly Beginner, Intermediate, or Advanced.|Sorry, missed that. Provide a choice: Beginner, Intermediate, or Advanced." },
  { stage: "DAYS", text: "My bad, I need a specific number of days between 1 and 7.|Sorry, missed that. Just give me a number from 1 to 7.|I didn't quite hear a number. Just say a number between 1 and 7.|My fault, didn't catch that. I need an exact number of days from 1 to 7.|Sorry about that. State a numeric day count between 1 and 7.|Didn't quite get that. Just tell me the number of days numerically.|My bad, can you repeat that? Just a clear number of days.|Sorry, I missed the days. What's the specific number between 1 and 7?|I didn't catch that one. Just state your days numerically from 1 to 7.|My fault, didn't hear you. Provide the number of days numerically.|Sorry, missed that. Just say the exact number of days you can train.|Didn't quite catch that. Just reply with a specific numeric day count.|My bad, didn't get that. Say your exact day count numerically.|Sorry about that. Just confirm the number of days between 1 and 7.|I missed that. Tell me your exact day count between 1 and 7.|My fault, didn't hear you clearly. State a distinct number between 1 and 7.|Sorry, didn't catch that. Just state your exact number of days.|Didn't quite get that. Say your days as a numeric value from 1 to 7.|My bad. Just say the exact number of days between 1 and 7.|Sorry, missed that. Provide a numeric response for the days." },
  { stage: "EQUIPMENT", text: "Sorry, I didn't catch that setup. Just say Full Gym, Dumbbells, or Bodyweight.|My bad, missed that. Just choose exactly: Full Gym, Dumbbells, or Bodyweight.|I didn't quite hear you. Just say Full Gym, Dumbbells, or Bodyweight.|My fault, didn't catch that. I need one of these: Full Gym, Dumbbells, or Bodyweight.|Sorry about that. State exactly: Full Gym, Dumbbells, or Bodyweight.|Didn't quite get that. Just tell me Full Gym, Dumbbells, or Bodyweight.|My bad, can you repeat that? Pick one: Full Gym, Dumbbells, or Bodyweight.|Sorry, I missed your equipment. Is it Full Gym, Dumbbells, or Bodyweight?|I didn't catch that one. Just choose specifically: Full Gym, Dumbbells, or Bodyweight.|My fault, didn't hear you. State your equipment: Full Gym, Dumbbells, or Bodyweight.|Sorry, missed that. Just say Full Gym, Dumbbells, or Bodyweight.|Didn't quite catch that. Just reply with Full Gym, Dumbbells, or Bodyweight.|My bad, didn't get that. Choose Full Gym, Dumbbells, or Bodyweight.|Sorry about that. Just confirm with Full Gym, Dumbbells, or Bodyweight.|I missed that. Tell me if it's Full Gym, Dumbbells, or Bodyweight.|My fault, didn't hear you clearly. State one: Full Gym, Dumbbells, or Bodyweight.|Sorry, didn't catch that. Just state Full Gym, Dumbbells, or Bodyweight.|Didn't quite get that. Say Full Gym, Dumbbells, or Bodyweight.|My bad. Just say exactly Full Gym, Dumbbells, or Bodyweight.|Sorry, missed that. Provide a choice: Full Gym, Dumbbells, or Bodyweight." },
  { stage: "ALLERGIES_CHECK", text: "My bad, just a simple 'yes' or 'no' works here. Do you have any allergies?|Sorry, missed that. Just let me know 'yes' or 'no' on the allergies.|I didn't quite hear you. Just say 'yes' or 'no' regarding food allergies.|My fault, didn't catch that. I need a 'yes' or 'no' to proceed with allergies.|Sorry about that. Just say 'yes' or 'no' if you have dietary restrictions.|Didn't quite get that. Just reply with 'yes' or 'no' for food allergies.|My bad, can you repeat that? Just 'yes' or 'no' for the allergy check.|Sorry, I missed your answer. Say 'yes' or 'no' so I can register allergies.|I didn't catch that one. Just state 'yes' or 'no' regarding food allergies.|My fault, didn't hear you. Answer 'yes' or 'no' to the allergy question.|Sorry, missed that. Just say 'yes' or 'no' for dietary allergies.|Didn't quite catch that. Just reply 'yes' or 'no' to confirm food allergies.|My bad, didn't get that. Say 'yes' or 'no' regarding dietary issues.|Sorry about that. Just confirm with 'yes' or 'no' to specify allergies.|I missed that. Say 'yes' or 'no' to authorize allergy data.|My fault, didn't hear you clearly. Reply 'yes' or 'no' for the allergy check.|Sorry, didn't catch that. Just state 'yes' or 'no' to the allergy requirement.|Didn't quite get that. Say 'yes' or 'no' regarding dietary restrictions.|My bad. Just say 'yes' or 'no' to process your allergy status.|Sorry, missed that. Just say 'yes' or 'no' for the food allergies." },
  { stage: "ALLERGIES_DETAIL", text: "Sorry, I need you to name specific foods. Vagueness doesn't work here.|My bad, I didn't catch the foods. Just list them out for me, like 'dairy' or 'nuts'.|I didn't quite hear that. I require specific names of allergens. What exactly are they?|My fault, didn't catch that. If you have an allergy, you must name it explicitly.|Sorry about that. I need precise food items, not uncertainty. Name them.|Didn't quite get that. Do not guess. Name the specific foods you are allergic to.|My bad, can you repeat that? I require an exact list of allergic foods.|Sorry, I missed your answer. Please state the specific dietary items you are allergic to.|I didn't catch that one. State the exact foods to avoid.|My fault, didn't hear you. I require specific food names for your allergies.|Sorry, missed that. Please provide explicit foods you are allergic to.|Didn't quite catch that. Name the exact foods. If unsure, we cannot proceed safely.|My bad, didn't get that. I need a specific list of food allergens.|Sorry about that. State exactly what foods cause an allergic reaction.|I missed that. I require definitive food names for your allergies.|My fault, didn't hear you clearly. Please list the exact foods clearly.|Sorry, didn't catch that. Name the specific ingredients you are allergic to.|Didn't quite get that. I need explicit dietary allergens named right now.|My bad. Please state exact foods without uncertainty.|Sorry, missed that. I need precise food names. What are you allergic to?" },
  { stage: "INJURIES_CHECK", text: "My bad, just a simple 'yes' or 'no' works here. Any physical injuries?|Sorry, missed that. Just let me know 'yes' or 'no' on the injuries.|I didn't quite hear you. Just say 'yes' or 'no' regarding physical injuries.|My fault, didn't catch that. I need a 'yes' or 'no' to proceed with injuries.|Sorry about that. Just say 'yes' or 'no' if you have physical restrictions.|Didn't quite get that. Just reply with 'yes' or 'no' for physical injuries.|My bad, can you repeat that? Just 'yes' or 'no' for the injury check.|Sorry, I missed your answer. Say 'yes' or 'no' so I can register injuries.|I didn't catch that one. Just state 'yes' or 'no' regarding bodily injuries.|My fault, didn't hear you. Answer 'yes' or 'no' to the injury question.|Sorry, missed that. Just say 'yes' or 'no' for physical restrictions.|Didn't quite catch that. Just reply 'yes' or 'no' to confirm bodily injuries.|My bad, didn't get that. Say 'yes' or 'no' regarding physical issues.|Sorry about that. Just confirm with 'yes' or 'no' to specify injuries.|I missed that. Say 'yes' or 'no' to authorize injury data.|My fault, didn't hear you clearly. Reply 'yes' or 'no' for the injury check.|Sorry, didn't catch that. Just state 'yes' or 'no' to the injury requirement.|Didn't quite get that. Say 'yes' or 'no' regarding physical restrictions.|My bad. Just say 'yes' or 'no' to process your injury status.|Sorry, missed that. Just say 'yes' or 'no' for the physical injuries." },
  { stage: "INJURIES_DETAIL", text: "Sorry, I need specific injuries. 'I don't know' doesn't help us stay safe.|My bad, I missed that. Briefly tell me what's injured, like 'my lower back'.|I didn't quite hear that. I require specific names of injuries. What exactly is hurt?|My fault, didn't catch that. If you have an injury, you must name it explicitly.|Sorry about that. I need precise physical issues, not uncertainty. Name them.|Didn't quite get that. Do not guess. Name the specific body parts that are injured.|My bad, can you repeat that? I require an exact list of physical injuries.|Sorry, I missed your answer. Please state the specific joints or muscles that are injured.|I didn't catch that one. State the exact body parts to avoid.|My fault, didn't hear you. I require specific physical injuries for your profile.|Sorry, missed that. Please provide explicit injuries you are carrying.|Didn't quite catch that. Name the exact injuries. If unsure, we cannot proceed safely.|My bad, didn't get that. I need a specific list of bodily injuries.|Sorry about that. State exactly what body parts cause pain.|I missed that. I require definitive physical injuries named.|My fault, didn't hear you clearly. Please list the exact injuries clearly.|Sorry, didn't catch that. Name the specific body areas that are injured.|Didn't quite get that. I need explicit physical restrictions named right now.|My bad. Please state exact injuries without uncertainty.|Sorry, missed that. I need precise physical issues. What are you suffering from?" },
  { stage: "CONFIRMATION", text: "My bad, just say 'yes' to lock it in, or 'no' if we need to fix something.|Sorry, missed that. Please state 'yes' to confirm the summary.|I didn't quite hear you. Just say 'yes' if the screen is correct, or 'no' to fix it.|My fault, didn't catch that. I must have a 'yes' to proceed with generating.|Sorry about that. Answer 'yes' to validate the final profile.|Didn't quite get that. Just say 'yes' if the data is accurate.|My bad, can you repeat that? I require a 'yes' on the final confirmation.|Sorry, I missed your answer. Please reply with 'yes' to finalize.|I didn't catch that one. Say 'yes' so I can build your routine.|My fault, didn't hear you. I need a direct 'yes' to lock in the profile.|Sorry, missed that. Answer 'yes' to confirm the summary.|Didn't quite catch that. Just state 'yes' to authorize the generation.|My bad, didn't get that. Say 'yes' to confirm everything is accurate.|Sorry about that. Please provide a 'yes' to proceed to generation.|I missed that. I need you to specify 'yes' to confirm.|My fault, didn't hear you clearly. Say 'yes' to validate the final screen.|Sorry, didn't catch that. Confirm 'yes' for the final approval.|Didn't quite get that. Reply 'yes' to the generation prompt.|My bad. Just answer 'yes' to confirm the data.|Sorry, missed that. I must hear 'yes' to process your final plan." }
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
    recognition.onend = () => {
      if (callActiveRef.current && !isAiSpeakingRef.current && !processingRef.current) {
        try { recognition.start(); } catch(e) {}
      } else {
        setIsListening(false);
      }
    };
    
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
        
        // 🚀 THE FIX: Android strictly kills the mic after 3-4 seconds of silence.
        // If it throws a timeout/silence error, we instantly catch it and turn it back on!
        const isSilenceTimeout = errMsg.includes("no match") || errMsg.includes("no speech") || errMsg.includes("error 7") || errMsg.includes("error 6");
        
        // If it timed out, but the call is still active and the AI isn't speaking, restart it instantly!
        if (isSilenceTimeout && callActiveRef.current && !isAiSpeakingRef.current && !processingRef.current) {
          setTimeout(() => {
            startListening();
          }, 50);
          return; // Notice we DON'T set isListening to false here, so the UI doesn't flicker!
        }

        // If it was manually stopped or cancelled, shut it down normally
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
        speak("No problem at all. Let's backtrack real quick. " + prevConfig.replies.split('|')[0], startListening);
        return;
      }
    }

    if (stageRef.current === "GREETING" && (extractedFromDataset === "no" || textLower.match(/\b(no|nope|nah|not ready)\b/i))) {
      speak("No sweat. I'll be right here when you're ready to jump in.");
      setTimeout(() => toggleCall(), 4000); return;
    }
    if (stageRef.current === "CONSENT" && (extractedFromDataset === "no" || textLower.match(/\b(no|nope|nah|i don't agree)\b/i))) {
      speak("Totally understand. I do need that info to safely build this for you though, so we'll stop here for now. Come back when you're ready.");
      setTimeout(() => toggleCall(), 6000); return;
    }

    if (stageRef.current === "CONFIRMATION" && (extractedFromDataset === "no" || textLower.match(/\b(change|fix|no|wait|wrong|edit|incorrect)\b/i))) {
      speak("No worries at all. You can tap the pencil icon next to any field on your screen to edit it manually. Just say 'looks good' when you're done.", startListening); return; 
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
    let finalReply = replyOptions.length > 0 ? replyOptions[Math.floor(Math.random() * replyOptions.length)] : "Alright, putting this together now.";

    if (finalReply.includes("[Name]")) finalReply = finalReply.replace(/\[Name\]/g, userRef.current?.firstName || "there");

    // 🚀 ULTRA-NATURAL EMPATHY INJECTIONS 🚀
    if (currentConfig?.stage === "LEVEL") {
      const level = updatedData.level.toLowerCase();
      if (level.includes("beginner") || level.includes("new") || level.includes("start") || level.includes("novice")) {
        finalReply = "We all start somewhere. Don't even sweat it, we're going to build you up right. " + finalReply;
      } else if (level.includes("intermediate")) {
        finalReply = "Okay, so you know your way around. We'll definitely push the intensity up a bit. " + finalReply;
      } else if (level.includes("advanced") || level.includes("pro")) {
        finalReply = "Oh, you've been doing this a while. We'll skip the basics and really test your limits. " + finalReply;
      }
    }

    if (currentConfig?.stage === "ALLERGIES_DETAIL") {
      finalReply = "Food allergies are no joke. I'll make absolutely sure those are kept far away from your meal plan. " + finalReply;
    }

    if (targetStage === "CONFIRMATION") {
      finalReply = `Alright, let's take a look. You're ${updatedData.age} years old, weighing in at ${updatedData.weight}, and you're ${updatedData.height} tall. We're aiming to ${updatedData.goal}. You'll be using ${updatedData.equipment} for ${updatedData.days} days a week. Allergies: ${updatedData.allergies}. Injuries: ${updatedData.injuries}. How's that look on your end? Are we good to go?`;
      
      if (currentConfig?.stage === "INJURIES_DETAIL") {
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

      speak("Everything looks solid. Your plan is saved and ready. I'm going to send you to the dashboard now.");
      
      setTimeout(() => {
        router.push("/profile"); 
      }, 6500); 

    } catch (error: any) {
      console.error("Critical Error Generating Plan:", error);
      setIsThinking(false);
      toast.error(`Failed to generate: ${error.message}`); 
      speak("Looks like I hit a snag while saving the plan. Let's try doing that one more time.");
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