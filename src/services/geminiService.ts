import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function refineGoal(roughNotes: string): Promise<string> {
  const model = "gemini-3-flash-preview";
  const prompt = `Refine the following rough notes into a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound) for a court participant's case plan. 
  Notes: "${roughNotes}"
  Return only the refined goal text.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Failed to refine goal.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error refining goal. Please try again.";
  }
}
