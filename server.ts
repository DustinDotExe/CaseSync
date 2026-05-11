import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '16kb' }));

const requestLog = new Map<string, number[]>();
function tooManyRequests(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const events = (requestLog.get(key) || []).filter(ts => now - ts < windowMs);
  events.push(now);
  requestLog.set(key, events);
  return events.length > limit;
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY is not configured. AI refinement endpoints will fail.');
}

const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
if (!firebaseApiKey) {
  console.warn('FIREBASE_API_KEY is not configured. AI endpoints will reject all requests.');
}

async function verifyFirebaseToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token || !firebaseApiKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const verify = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }
    );
    if (!verify.ok) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
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

app.post('/api/refine-goal', verifyFirebaseToken, (req, res) => {
  const { prompt } = req.body as { prompt: string };
  const key = `${req.ip}:${req.headers.authorization?.slice(-12) || 'anon'}`;
  if (tooManyRequests(key)) { res.status(429).json({ error: 'Rate limit exceeded' }); return; }
  if (typeof prompt !== 'string' || prompt.trim().length === 0 || prompt.length > 8000) { res.status(400).json({ error: 'Invalid prompt' }); return; }
  streamGemini(
    res,
    'You are an expert court case manager. Your task is to refine rough notes into a single SMART goal. Return only the refined goal text. Do not use Markdown, lists, or styling. Keep the tone objective and the length minimal while retaining all key facts.',
    `Refine the following rough notes into a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound) for a court participant's case plan.\nNotes: "${prompt}"`,
    150
  );
});

app.post('/api/refine-notes', verifyFirebaseToken, (req, res) => {
  const { prompt } = req.body as { prompt: string };
  const key = `${req.ip}:${req.headers.authorization?.slice(-12) || 'anon'}`;
  if (tooManyRequests(key)) { res.status(429).json({ error: 'Rate limit exceeded' }); return; }
  if (typeof prompt !== 'string' || prompt.trim().length === 0 || prompt.length > 12000) { res.status(400).json({ error: 'Invalid prompt' }); return; }
  streamGemini(
    res,
    'You are an expert court case manager. Using the participant case data provided for context, rewrite the case manager observations into clear, professional plain language. The result should reflect the participant\'s current situation, progress, and any concerns informed by their goals and treatment areas. Do not use Markdown, lists, or styling. Keep the tone objective and formal. Output only the refined observations text.',
    prompt,
    300
  );
});

app.post('/api/hearing-brief', verifyFirebaseToken, (req, res) => {
  const { prompt } = req.body as { prompt: string };
  const key = `${req.ip}:${req.headers.authorization?.slice(-12) || 'anon'}`;
  if (tooManyRequests(key)) { res.status(429).json({ error: 'Rate limit exceeded' }); return; }
  if (typeof prompt !== 'string' || prompt.trim().length === 0 || prompt.length > 12000) { res.status(400).json({ error: 'Invalid prompt' }); return; }
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
