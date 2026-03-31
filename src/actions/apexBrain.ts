"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

// ⚠️ IMPORTANT: You need to put NEXT_PUBLIC_GEMINI_API_KEY="your_key" in your .env.local file!
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export async function askApex(userText: string) {
  try {
    // 1. Set up the AI model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Give Apex a personality (System Prompt)
    const prompt = `You are Apex, an elite AI fitness coach. 
    Keep your answers extremely short, punchy, and motivating (1 to 2 sentences max). 
    The user just said: "${userText}"`;

    // 3. Get the response
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    return { success: true, reply: text };
  } catch (error: any) {
    console.error("Apex Brain Error:", error);
    return { success: false, reply: "Sorry, I lost my connection. Let's try that again." };
  }
}