import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const MODEL = 'gemini-3.1-flash-lite-preview';

function readBody(req: IncomingMessage): Promise<{ prompt: string }> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

async function streamGemini(
  ai: GoogleGenAI,
  res: ServerResponse,
  systemInstruction: string,
  contents: string,
  maxOutputTokens: number
) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
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

function geminiProxyPlugin(apiKey: string): Plugin {
  const ai = new GoogleGenAI({ apiKey });

  return {
    name: 'gemini-proxy',
    configureServer(server) {
      server.middlewares.use('/api/refine-goal', async (req, res, next) => {
        if (req.method !== 'POST') { next(); return; }
        try {
          const { prompt } = await readBody(req);
          await streamGemini(
            ai, res,
            'You are an expert court case manager. Your task is to refine rough notes into a single SMART goal. Return only the refined goal text. Do not use Markdown, lists, or styling. Keep the tone objective and the length minimal while retaining all key facts.',
            `Refine the following rough notes into a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound) for a court participant's case plan.\nNotes: "${prompt}"`,
            150
          );
        } catch { next(); }
      });

      server.middlewares.use('/api/refine-notes', async (req, res, next) => {
        if (req.method !== 'POST') { next(); return; }
        try {
          const { prompt } = await readBody(req);
          await streamGemini(
            ai, res,
            'You are an expert court case manager. Your task is to refine case note information. Rewrite these case notes into clear, professional plain language. The goal is a formal record that is easily understood by the defendant. Do not use Markdown, lists, or styling. Keep the tone objective and the length minimal while retaining all key facts.',
            prompt,
            300
          );
        } catch { next(); }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), geminiProxyPlugin(env.GEMINI_API_KEY)],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
