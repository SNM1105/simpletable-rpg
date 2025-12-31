export type OllamaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OllamaChatRequest = {
  model: string;
  messages: OllamaChatMessage[];
  stream: boolean;
  options?: Record<string, unknown>;
};

export type OllamaChatResponse = {
  model: string;
  created_at: string;
  message: { role: string; content: string };
  done: boolean;
};

export type OllamaStreamChunk = {
  model: string;
  created_at: string;
  message: { role: string; content: string };
  done: boolean;
};

export async function ollamaChat(
  baseUrl: string,
  request: OllamaChatRequest,
  timeoutMs: number
): Promise<OllamaChatResponse> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ollama HTTP ${res.status}: ${text.slice(0, 300)}`);
    }

    return (await res.json()) as OllamaChatResponse;
  } finally {
    clearTimeout(t);
  }
}

export async function ollamaChatStream(
  baseUrl: string,
  request: Omit<OllamaChatRequest, 'stream'>,
  timeoutMs: number
): Promise<ReadableStream<OllamaStreamChunk>> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...request, stream: true }),
    signal: controller.signal,
  });

  if (!res.ok) {
    clearTimeout(t);
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  if (!res.body) {
    clearTimeout(t);
    throw new Error("No response body");
  }

  // Clear timeout after successful connection
  clearTimeout(t);

  return res.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new TransformStream<string, OllamaStreamChunk>({
        transform(chunk, controller) {
          const lines = chunk.split('\n').filter(line => line.trim());
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line) as OllamaStreamChunk;
              controller.enqueue(parsed);
            } catch {
              // Skip invalid JSON lines
            }
          }
        },
      })
    );
}
