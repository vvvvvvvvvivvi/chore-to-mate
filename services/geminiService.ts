
import { GoogleGenAI } from "@google/genai";
import { FlatEvent, Flatmate, TaskStatus } from "../types";

export const generateAISummary = async (events: FlatEvent[], flatmates: Flatmate[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const eventLogs = events.map(e => ({
    title: e.title,
    owner: flatmates.find(f => f.id === e.ownerId)?.name,
    status: e.status,
    type: e.type
  }));

  const prompt = `
    Generate a corporate-style "Fortnightly Operating Review" for a shared flat based on the following task data:
    
    Data: ${JSON.stringify(eventLogs)}
    
    Guidelines:
    - Tone: Neutral, deadpan, corporate, observational.
    - No humor, no judgement, no advice.
    - Focus on facts: completion rates, delays, and verification patterns.
    - Example: "Alex is reliable with bills and bins, but tends to delay kitchen cleaning. Jordan has a high verification rate."
    - Keep it under 150 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "Report generation failed. System timeout.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
