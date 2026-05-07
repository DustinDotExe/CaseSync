import { auth } from '../firebase';

async function* streamSSE(url: string, prompt: string): AsyncGenerator<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  const token = await auth.currentUser?.getIdToken().catch(() => null);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }
        if (typeof parsed === 'string') yield parsed;
        if (parsed && typeof parsed === 'object' && 'error' in parsed) {
          throw new Error(String(parsed.error));
        }
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function* refineGoalStream(roughNotes: string) {
  yield* streamSSE('/api/refine-goal', roughNotes);
}

export async function* refineNotesStream(notes: string) {
  yield* streamSSE('/api/refine-notes', notes);
}

export async function* hearingBriefStream(prompt: string) {
  yield* streamSSE('/api/hearing-brief', prompt);
}
