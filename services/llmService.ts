
import { Message, LLMModel, LLMProvider } from '../types';
import { API_BASE_URL, API_KEY } from '../constants';

export const streamChatResponse = async (
  messages: Message[],
  model: LLMModel,
  provider: LLMProvider,
  onChunk: (chunk: string) => void,
  onRequestId?: (id: string) => void,
  conversationId?: string,
  signal?: AbortSignal,
  deepThinkingEnabled: boolean = false
): Promise<void> => {
  
  // Transform messages payload
  const messagesPayload = messages.map(m => {
      // If it's a multimodal model and the message has images, construct the structured content
      if (model.type === 'multimodal' && m.attachments && m.attachments.length > 0 && m.role === 'user') {
          const contentParts: any[] = [
              { type: 'text', text: m.content }
          ];
          
          m.attachments.forEach(url => {
              contentParts.push({
                  type: 'image_url',
                  image_url: { url: url }
              });
          });

          return {
              role: m.role,
              content: contentParts
          };
      }
      
      // Default text-only content
      return {
          role: m.role,
          content: m.content
      };
  });

  // Construct request body based on API docs
  const payload = {
      messages: messagesPayload,
      model: model.modelId, // The model Key (e.g., gpt-4)
      provider: provider.type, // Include provider type (e.g. openai, deepseek)
      stream: true,
      temperature: model.temperature || 0.7,
      agent_id: 'pixel-verse-agent', // Default Agent ID
      conversation_id: conversationId || 'pixel-session-1',
      user_id: 'pixel-user',
      selfThinking: deepThinkingEnabled ? {
          enabled: true,
          includeThoughtsInResponse: true, // Server should return thoughts
          enableStreamThoughts: true
      } : undefined
  };

  try {
      const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify(payload),
          signal: signal
      });

      if (!response.ok) {
          const err = await response.text();
          onChunk(`\n[Error: ${response.status} - ${err}]`);
          return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let firstChunkProcessed = false;
      let isThinking = false; // State to track if we are currently outputting thought tags

      while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          // Keep the last line if it's incomplete
          buffer = lines.pop() || '';

          for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;
              
              const dataStr = trimmed.substring(6); // Remove "data: "
              
              if (dataStr === '[DONE]') {
                  if (isThinking) {
                      onChunk('</thinking>'); // Close tag if stream ends while thinking
                  }
                  return;
              }

              try {
                  const json = JSON.parse(dataStr);
                  
                  // Extract Request ID from the first valid chunk
                  if (!firstChunkProcessed && json.id && onRequestId) {
                      onRequestId(json.id);
                      firstChunkProcessed = true;
                  }

                  const delta = json.choices?.[0]?.delta || json;
                  
                  // --- CRITICAL FIX FOR NESTED JSON STREAMING ---
                  // The backend might send the delta as: { content: "{\"reasoning_content\":\"...\"}" }
                  // We need to parse this stringified JSON to extract the actual fields.
                  
                  let reasoning = delta.reasoning_content;
                  let content = delta.content;

                  if (typeof content === 'string' && content.trim().startsWith('{')) {
                      try {
                          const nested = JSON.parse(content);
                          // Check if the parsed object has the expected fields
                          if (nested.reasoning_content !== undefined || nested.content !== undefined) {
                              reasoning = nested.reasoning_content;
                              // If 'content' in nested JSON is null/undefined, use that. 
                              // Otherwise we would output the raw JSON string as content!
                              content = nested.content; 
                          }
                      } catch (e) {
                          // Not valid JSON. 
                          // SAFETY: If it starts with { but fails parsing, it might be a split JSON chunk or raw JSON that wasn't meant to be seen.
                          // To avoid showing "{"reasoning_content":..." to the user, we can aggressively suppress it if it looks like specific schema
                          if (content.includes('"reasoning_content"')) {
                              content = null; // Suppress likely raw JSON
                          }
                      }
                  }

                  // Handle Reasoning Content
                  if (reasoning) {
                      if (!isThinking) {
                          onChunk('<thinking>');
                          isThinking = true;
                      }
                      onChunk(reasoning);
                  }

                  // Handle Normal Content
                  if (content) {
                      if (isThinking) {
                          onChunk('</thinking>');
                          isThinking = false;
                      }
                      onChunk(content);
                  }

              } catch (e) {
                  // If it's not JSON, it might be raw text (rare in SSE but possible)
                  // or just a malformed chunk. Ignore or log.
                  // console.warn('Error parsing stream chunk', e);
              }
          }
      }
      
      // Cleanup
      if (isThinking) {
          onChunk('</thinking>');
      }

  } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
          // Client aborted, stop normally
          return;
      }
      console.error('Stream Error:', error);
      onChunk(`\n[Connection Error: ${error instanceof Error ? error.message : 'Unknown'}]`);
  }
};

// New service for Mascot commentary using simple-stream
export const fetchMascotComment = async (
  messages: Message[],
  modelId: string,
  systemPrompt?: string
): Promise<string> => {
    // Take last 20 messages
    const recentMessages = messages.slice(-20).map(m => ({
        role: m.role,
        content: m.content
    }));

    // Prepend system prompt if provided
    if (systemPrompt) {
        recentMessages.unshift({
            role: 'system',
            content: systemPrompt
        });
    }

    try {
        const response = await fetch(`${API_BASE_URL}/v1/chat/simple-stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                messages: recentMessages,
                model: modelId,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            console.warn("Mascot comment fetch failed:", response.status);
            return "";
        }

        const reader = response.body?.getReader();
        if (!reader) return "";

        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data: ')) continue;
                const dataStr = trimmed.substring(6);
                if (dataStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(dataStr);
                    let content = json.choices?.[0]?.delta?.content;
                    
                    // --- NESTED JSON FIX FOR MASCOT ---
                    if (typeof content === 'string' && content.trim().startsWith('{')) {
                        try {
                            const nested = JSON.parse(content);
                            // We only care about the actual content for the mascot, not the reasoning
                            if (nested.content !== undefined) {
                                content = nested.content;
                            } else if (nested.reasoning_content) {
                                // If it's pure reasoning chunk, ignore it for mascot speech
                                content = '';
                            }
                        } catch(e) {
                            // If parsing fails but it looks like JSON, ignore it to prevent raw JSON speech
                            if (content.includes('"reasoning_content"') || content.includes('"content"')) {
                                content = '';
                            }
                        }
                    }

                    if (content) fullText += content;
                } catch (e) {
                    // Ignore parse errors for mascot stream
                }
            }
        }
        return fullText;

    } catch (e) {
        console.error("Error fetching mascot comment", e);
        return "";
    }
};
