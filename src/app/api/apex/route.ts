import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    // Pulls your API key securely from your Vercel Environment Variables
    const API_KEY = process.env.GROK_API_KEY; 

    if (!API_KEY) {
      console.error("Missing API Key in Vercel!");
      return NextResponse.json(
        { error: "Brain disconnected. API key is missing." },
        { status: 500 }
      );
    }

 
    const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        // IF YOU MEANT GROQ: Change model to 'llama3-8b-8192' or 'mixtral-8x7b-32768'
        model: 'grok-beta', 
        messages: [
          {
            role: "system",
            content: "You are Apex, the elite AI fitness assistant for Amara Fitness. Keep your answers extremely concise, motivating, and conversational. Do not use formatting like bolding or bullet points because your response will be read aloud via text-to-speech."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Provider Error:", errorText);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the AI's spoken reply
    const apexReply = data.choices[0].message.content;

    return NextResponse.json({ reply: apexReply });

  } catch (error) {
    console.error("Apex API Error:", error);
    return NextResponse.json(
      { error: "Failed to connect to the Apex brain." },
      { status: 500 }
    );
  }
}