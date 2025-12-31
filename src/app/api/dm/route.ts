import { groqChatStream } from "@/lib/aiDm/groqClient";
import {
  dmSystemPrompt,
  dmUserPrompt,
  parseDmJson,
  type DmRequestPayload,
} from "@/lib/aiDm/dmPrompt";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let payload: DmRequestPayload;
  try {
    payload = (await req.json()) as DmRequestPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { 
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured" }), { 
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  try {
    const stream = await groqChatStream(
      apiKey,
      {
        model,
        messages: [
          { role: "system", content: dmSystemPrompt() },
          { role: "user", content: dmUserPrompt(payload) },
        ],
        temperature: 0.8,
        max_tokens: 1024,
        stream: true,
      }
    );

    // Create a transform stream to send chunks to the client
    const encoder = new TextEncoder();
    const transformedStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = stream.getReader();
          let fullContent = "";
          let sentNarrativeChars = 0;
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Send final parsed result
              try {
                const parsed = parseDmJson(fullContent);
                const narrativeText = parsed.lines.join('\n\n');
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, text: narrativeText, lines: parsed.lines })}\n\n`));
              } catch {
                // If JSON parsing fails, send the raw content
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, text: fullContent, lines: [fullContent] })}\n\n`));
              }
              controller.close();
              break;
            }
            
            if (value.message?.content) {
              fullContent += value.message.content;
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(transformedStream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        "connection": "keep-alive",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: "Groq API call failed", detail: msg }), { 
      status: 502,
      headers: { "content-type": "application/json" }
    });
  }
}
