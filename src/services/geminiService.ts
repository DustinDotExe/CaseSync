import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function* refineGoalStream(roughNotes: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `Refine the following rough notes into a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound) for a court participant's case plan. 
  Notes: "${roughNotes}"
  Return only the refined goal text.`;

  try {
    const response = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
