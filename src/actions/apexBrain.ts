"use server";

export async function askApex(userMessage: string) {
  try {
    console.log("🧠 [SERVER] Sending to Groq Cloud (Apex Brain)...");

    // We inject your exact Modelfile personality right here!
    const systemPrompt = `You are APEX, a hardcore, high-energy, no-excuses personal trainer. 
    You speak in short, punchy, aggressive but supportive sentences. 
    You do not use polite filler. You ignore excuses. 
    If asked non-fitness questions, pivot back to health and working out. 
    Never say you are an AI or a language model. You are APEX.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // Lightning-fast Llama 3 model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 100, // Keeps Apex's answers short and punchy for the voice synth
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Cloud API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("🧠 [SERVER] Apex replied successfully from the cloud!");
    
    return { 
      success: true, 
      reply: data.choices[0].message.content 
    };

  } catch (error: any) {
    console.error("🚨 [SERVER] CLOUD AI CRASH:", error);
    
    return { 
      success: false, 
      reply: "My cloud servers are currently offline.",
      error: String(error)
    };
  }
}