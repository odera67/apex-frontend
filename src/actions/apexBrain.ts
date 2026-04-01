"use server";

export async function askApex(userMessage: string) {
  try {
    console.log("🧠 [SERVER] Sending to LOCAL Apex model via Ngrok tunnel...");

    // Sending the request through your Ngrok tunnel to your computer's Ollama brain
    const response = await fetch("https://nonmelodiously-overrational-maliyah.ngrok-free.dev/api/generate", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "apex", // 👈 Your custom personality model
        prompt: userMessage,
        stream: false, 
      }),
    });

    if (!response.ok) {
      throw new Error(`Ngrok/Ollama server error: ${response.status}`);
    }

    const data = await response.json();
    console.log("🧠 [SERVER] Apex replied successfully!");
    
    return { 
      success: true, 
      reply: data.response 
    };

  } catch (error: any) {
    console.error("🚨 [SERVER] LOCAL AI CRASH:", error);
    
    return { 
      success: false, 
      reply: "My local servers are currently offline.",
      error: String(error)
    };
  }
}