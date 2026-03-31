"use server";

export async function askApex(userMessage: string) {
  try {
    console.log("🧠 [SERVER] Sending to LOCAL Apex model...");

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "apex", // 👈 We are now using your custom-trained model!
        prompt: userMessage,
        stream: false, 
      }),
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();
    
    return { success: true, reply: data.response };

  } catch (error: any) {
    return { success: false, reply: "My local servers are currently offline." };
  }
}