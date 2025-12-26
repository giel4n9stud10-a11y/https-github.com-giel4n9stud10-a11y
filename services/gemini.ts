
import { GoogleGenAI, Type } from "@google/genai";

export async function askAiAssistant(query: string, context: any) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const contextString = JSON.stringify(context);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are the Dream OS Neural Assistant for SIF Al Fikri.
      Current App State/Data: ${contextString}
      User Question: "${query}"
      
      Instructions:
      1. Answer concisely and professionally in Indonesian.
      2. Use the provided data to answer specific questions about bookings, K3 reports, or inventory.
      3. If the user wants to do something (like report a problem), guide them to the right menu.
      4. Stay warm, inspiring, and islamic.
      
      Response should be text only, no JSON.`,
    });

    return response.text || "Maaf, saya sedang melakukan sinkronisasi neural. Bisa ulangi?";
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "Maaf, koneksi neural terputus. Silakan coba sesaat lagi.";
  }
}

export async function analyzeSystemBug(errorMessage: string, stack?: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `System Error Detected: "${errorMessage}"
      Stack Trace: ${stack || 'No stack provided'}
      
      Task: Provide a "Smart Maintenance" suggestion.
      1. Explain why this happened in simple terms.
      2. Provide a 1-sentence code fix or architectural suggestion.
      Respond in Indonesian, concise.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cause: { type: Type.STRING },
            solution: { type: Type.STRING }
          },
          required: ["cause", "solution"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return null;
  }
}

export async function generateNeuralForecast(bookings: any[], inventory: any[]) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const bookingContext = bookings.map(b => `${b.sarana} on ${b.tanggal}`).join(', ');
    const inventoryContext = inventory.map(i => `${i.nama}: ${i.stokSekarang}/${i.stokAwal}`).join(', ');

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze current school operational data:
      Bookings: ${bookingContext}
      Inventory: ${inventoryContext}
      
      Task: Provide a "Neural Forecast" for the next 30 days.
      1. Predicted busiest days for facilities.
      2. Predicted stock depletion dates for critical items.
      3. One proactive operational tip.
      
      Respond in professional Indonesian, very concise.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictedBusyDays: { type: Type.STRING },
            stockAlerts: { type: Type.STRING },
            proactiveTip: { type: Type.STRING }
          },
          required: ["predictedBusyDays", "stockAlerts", "proactiveTip"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return null;
  }
}

export async function analyzeK3Report(problem: string, imageBase64?: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = [
      { text: `Analyze this safety/facility report for a school: "${problem}". 
      
      Task:
      1. Assign a Priority Level: 'Biasa', 'Sedang', or 'Penting'.
      2. Categorize the issue: Maintenance, Security, or CS.
      3. Provide a technical suggestion.
      Response must be in JSON.` }
    ];

    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            priority: { type: Type.STRING },
            suggestion: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["priority", "suggestion", "category"],
        },
      },
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return null;
  }
}

export async function auditInventory(items: any[]) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const summaryStr = items.map(i => `${i.nama} (${i.stokSekarang}/${i.stokAwal})`).join('\n');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Audit inventory: ${summaryStr}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            criticalItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendation: { type: Type.STRING }
          },
          required: ["healthScore", "summary", "criticalItems", "recommendation"],
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return null;
  }
}

export async function generateWelcomeMessage() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a short inspiring greeting for SIF Al Fikri school system. Max 8 words. Indonesian.",
    });
    return response.text || "Selamat Datang di Dream OS Neural";
  } catch (error) {
    return "Selamat Datang di Dream OS";
  }
}
