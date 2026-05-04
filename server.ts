import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = 'gemini-3.1-flash-lite-preview';

async function streamGemini(
  res: express.Response,
  systemInstruction: string,
  contents: string,
  maxOutputTokens: number
) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        maxOutputTokens,
        temperature: 0,
      },
    });
    for await (const chunk of stream) {
      if (chunk.text) res.write(`data: ${JSON.stringify(chunk.text)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch {
    res.write('data: {"error":"Generation failed"}\n\n');
  } finally {
    res.end();
  }
}

app.post('/api/refine-goal', (req, res) => {
  const { prompt } = req.body as { prompt: string };
  streamGemini(
    res,
    'You are an expert court case manager. Your task is to refine rough notes into a single SMART goal. Return only the refined goal text. Do not use Markdown, lists, or styling. Keep the tone objective and the length minimal while retaining all key facts.',
    `Refine the following rough notes into a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound) for a court participant's case plan.\nNotes: "${prompt}"`,
    150
  );
});

app.post('/api/refine-notes', (req, res) => {
  const { prompt } = req.body as { prompt: string };
  streamGemini(
    res,
    'You are an expert court case manager. Your task is to refine case note information. Rewrite these case notes into clear, professional plain language. The goal is a formal record that is easily understood by the defendant. Do not use Markdown, lists, or styling. Keep the tone objective and the length minimal while retaining all key facts.',
    prompt,
    300
  );
});

// Serve compiled frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Gemini proxy running on :${PORT}`));
