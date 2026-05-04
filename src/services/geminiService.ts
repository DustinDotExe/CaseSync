async function* streamSSE(url: string, prompt: string): AsyncGenerator<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        try {
          const parsed = JSON.parse(data);
          if (typeof parsed === 'string') yield parsed;
        } catch { /* skip malformed chunks */ }
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
