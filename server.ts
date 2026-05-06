import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY is not configured. AI refinement endpoints will fail.');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isRetryableGeminiError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('429') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('rate') ||
    message.includes('timeout') ||
    message.includes('unavailable')
  );
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function streamGemini(
  res: express.Response,
  systemInstruction: string,
  contents: string,
  maxOutputTokens: number
) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!apiKey) {
    res.write('data: {"error":"Gemini API key is not configured"}\n\n');
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const stream = await ai.models.generateContentStream({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          maxOutputTokens,
          temperature: 0,
        },
      });
      for await (const chunk of stream) {
        if (chunk.text) res.write(`data: ${JSON.stringify(chunk.text)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    } catch (error) {
      console.error(`Gemini stream failed with ${MODEL} on attempt ${attempt}:`, error);
      if (attempt === 1 && isRetryableGeminiError(error)) {
        await wait(750);
        continue;
      }
      res.write(`data: ${JSON.stringify({ error: `Generation failed: ${getErrorMessage(error)}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
  }

  res.end();
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

app.post('/api/hearing-brief', (req, res) => {
  const { prompt } = req.body as { prompt: string };
  streamGemini(
    res,
    'You are an experienced court case manager preparing a history summary for a judge. Based on the participant data provided, write 3 to 5 sentences covering overall progress, key achievements, any outstanding concerns or compliance gaps, and a phase recommendation. Use professional, objective language suitable for a courtroom. Do not use Markdown, headers, bullet points, or numbered lists. Write in clear paragraph form only.',
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
