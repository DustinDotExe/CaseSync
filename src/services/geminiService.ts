import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function* refineGoalStream(roughNotes: string) {
  const model = "gemini-3.1-flash-lite-preview";
  const prompt = `Refine the following rough notes into a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound) for a court participant's case plan. 
  Notes: "${roughNotes}"`;

  try {
    const response = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert court case manager. Your task is to refine rough notes into a single SMART goal. Return only the refined goal text. Do not use Markdown, lists, or styling. Keep the tone objective and the length minimal while retaining all key facts.",
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
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

export async function* refineNotesStream(notes: string) {
  const model = "gemini-3.1-flash-lite-preview";
  const prompt = notes;

  try {
    const response = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert court case manager. Your task is to refine case note information. Rewrite these case notes into clear, professional plain language. The goal is a formal record that is easily understood by the defendant. Do not use Markdown, lists, or styling. Keep the tone objective and the length minimal while retaining all key facts.",
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
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
