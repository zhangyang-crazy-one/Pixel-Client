
import { Message, LLMModel, LLMProvider } from '../types';
import { API_BASE_URL, API_KEY } from '../constants';

export const streamChatResponse = async (
  messages: Message[],
  model: LLMModel,
  provider: LLMProvider,
  onChunk: (chunk: string) => void
): Promise<void> => {
  
  const messagesPayload = messages.map(m => ({
      role: m.role,
      content: m.content
  }));

  // Construct request body based on API docs
  const payload = {
      messages: messagesPayload,
      model: model.modelId, // The model Key (e.g., gpt-4)
      stream: true,
      temperature: model.temperature || 0.7,
      agent_id: 'pixel-verse-agent', // Default Agent ID
      conversation_id: 'pixel-session-1' // Simple session isolation for demo
  };

  try {
      const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify(payload)
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
              
              if (dataStr === '[DONE]') return;

              try {
                  const json = JSON.parse(dataStr);
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                      onChunk(content);
                  }
              } catch (e) {
                  console.warn('Error parsing stream chunk', e);
              }
          }
      }

  } catch (error) {
      console.error('Stream Error:', error);
      onChunk(`\n[Connection Error: ${error instanceof Error ? error.message : 'Unknown'}]`);
      // If API fails, we might want to fallback to mock for demo purposes? 
      // But the requirement is to implement interface calls.
  }
};
