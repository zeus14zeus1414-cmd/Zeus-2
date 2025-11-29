import { GoogleGenAI } from "@google/genai";
// Fixed: Import correct types from ../types
import { Settings, Attachment, Message } from "../types";

// Initialize the client with the environment variable
// CRITICAL: process.env.API_KEY is assumed to be available
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Creates a chat session and sends a message, handling streaming responses.
 */
// Fixed: Update function signature to use Message and Settings types
export async function streamChatResponse(
  history: Message[],
  newMessage: string,
  attachments: Attachment[],
  config: Settings,
  onChunk: (text: string) => void
): Promise<string> {
  
  // 1. Prepare the model configuration
  const modelName = config.model || 'gemini-2.5-flash';
  
  const generationConfig: any = {
    temperature: config.temperature,
    // Add safety settings if needed, defaults are usually fine for general use
  };

  // 2. Initialize the chat
  // We recreate the chat context each time to ensure system instructions and history 
  // match the current UI state perfectly.
  // Fixed: Map history correctly using Message type properties
  const historyParts = history
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => {
      const parts: any[] = [];
      
      if (msg.content) {
          parts.push({ text: msg.content });
      }

      // Add existing attachments from history
      // Fixed: Use msg.attachments instead of msg.images
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
            if (att.dataType === 'image') {
                parts.push({
                    inlineData: {
                        mimeType: att.mimeType || 'image/jpeg',
                        // Fixed: Use att.content (base64) instead of att.base64
                        data: att.content 
                    }
                });
            } else {
                parts.push({ text: `\n\n[File: ${att.name}]\n${att.content}` });
            }
        });
      }

      return {
        // Fixed: Map 'assistant' role to 'model'
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: parts
      };
    });

  const chat = ai.chats.create({
    model: modelName,
    config: {
      // Fixed: Use customPrompt for systemInstruction
      systemInstruction: config.customPrompt,
      ...generationConfig
    },
    history: historyParts
  });

  // 3. Prepare the new message parts
  const parts: any[] = [{ text: newMessage }];

  // Add attachments if any
  if (attachments.length > 0) {
    attachments.forEach(att => {
      if (att.dataType === 'image') {
        parts.push({
            inlineData: {
            mimeType: att.mimeType || 'image/jpeg',
            // Fixed: Use att.content (base64) instead of att.base64
            data: att.content 
            }
        });
      } else {
        parts.push({
            text: `\n\n[File: ${att.name}]\n${att.content}`
        });
      }
    });
  }

  // 4. Send message and handle stream
  let fullResponse = "";
  
  try {
    const result = await chat.sendMessageStream({ message: { parts } });

    for await (const chunk of result) {
      const text = chunk.text; // Access text property directly
      if (text) {
        fullResponse += text;
        onChunk(text);
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }

  return fullResponse;
}

/**
 * Helper to convert File to Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};