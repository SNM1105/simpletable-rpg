export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GroqChatRequest = {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
  stream: boolean;
};

export async function groqChatStream(
  apiKey: string,
  request: GroqChatRequest
): Promise<ReadableStream> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  if (!response.body) {
    throw new Error("No response body from Groq");
  }

  // Transform SSE stream to our format
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      try {
        let buffer = "";
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            controller.close();
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              
              if (data === "[DONE]") {
                controller.enqueue({
                  model: request.model,
                  created_at: new Date().toISOString(),
                  message: { role: "assistant", content: "" },
                  done: true,
                });
                continue;
              }
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || "";
                
                if (content) {
                  controller.enqueue({
                    model: request.model,
                    created_at: new Date().toISOString(),
                    message: { role: "assistant", content },
                    done: false,
                  });
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function groqChat(
  apiKey: string,
  model: string,
  messages: GroqMessage[],
  temperature?: number,
  maxTokens?: number
): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature || 0.7,
      max_tokens: maxTokens || 2000,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
