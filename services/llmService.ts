import { Message, LLMModel, LLMProvider } from '../types';

// Simulate a streaming response
export const streamChatResponse = async (
  messages: Message[],
  model: LLMModel,
  provider: LLMProvider,
  onChunk: (chunk: string) => void
): Promise<void> => {
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const mockResponses = [
    "Beep boop! I am a high-precision pixel entity. 👾",
    "Analyzing your request within the 16x16 grid... result found!",
    "Here is a code block for you:\n```javascript\nconst pixel = 'art';\nconsole.log(pixel);\n```",
    "I am currently configured to use **" + model.name + "** via **" + provider.name + "**.",
    "Did you know? The *Konami Code* might trigger a special effect here."
  ];

  const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
  const chars = response.split('');
  
  // Simulate token streaming
  for (let i = 0; i < chars.length; i++) {
    // Variable speed typing to feel more "human" or "network-like"
    await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 20));
    onChunk(chars[i]);
  }
};
