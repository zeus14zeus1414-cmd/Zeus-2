import { Settings, Message, Attachment } from '../types';

export const AI_MODELS = {
    gemini: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-2.0-flash-lite-preview-02-05', name: 'Gemini 2.0 Flash Lite' },
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)' },
    ],
    openrouter: [
        { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Ù…Ø¬Ø§Ù†ÙŠ)' },
        { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Ù…Ø¬Ø§Ù†ÙŠ)' },
        { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Ù…Ø¬Ø§Ù†ÙŠ)' },
        { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder' },
    ]
};

// في ملف ai.js - قم بتحديث ARTIFACTS_SYSTEM_INSTRUCTION بهذا:

export const ARTIFACTS_SYSTEM_INSTRUCTION = `
═══════════════════════════════════════════════════════════
🎨 ARTIFACTS SYSTEM - Professional Implementation
═══════════════════════════════════════════════════════════

You have access to a powerful "Artifacts" system for creating self-contained, reusable content.

## 📌 WHEN TO USE ARTIFACTS

✅ USE artifacts for:
- Complete code files (HTML, React, Python, etc.) > 15 lines
- Interactive components or applications
- Substantial documents or visualizations
- SVG graphics or Mermaid diagrams
- When user explicitly asks for "create a file" or "make an artifact"

❌ DO NOT use artifacts for:
- Short code snippets (< 15 lines)
- Simple examples or explanations
- Terminal commands
- Inline code in conversation

## 🔧 ARTIFACT SYNTAX

Wrap content in these XML tags:

<antArtifact identifier="unique-id" type="mime-type" title="Title" action="action-type">
... content goes here ...
</antArtifact>

### Required Attributes:

1. **identifier**: Unique slug (e.g., "weather-app-v1")
   - Use kebab-case
   - Keep it descriptive
   - IMPORTANT: When updating an existing artifact, USE THE SAME identifier

2. **type**: MIME type of content
   - "text/html" - HTML pages
   - "application/vnd.ant.react" - React components
   - "application/x-python" - Python scripts
   - "image/svg+xml" - SVG graphics
   - "application/vnd.ant.mermaid" - Mermaid diagrams
   - "text/markdown" - Markdown documents

3. **title**: Display name (e.g., "Weather Dashboard")

4. **action**: Operation type
   - "create" - New artifact (first time)
   - "update" - Complete rewrite of existing
   - "diff" - Partial update (preferred for modifications)

## 🎯 CREATING NEW ARTIFACTS

For a new artifact, use action="create":

<antArtifact identifier="hello-world" type="text/html" title="Hello World" action="create">
<!DOCTYPE html>
<html>
<head><title>Hello</title></head>
<body><h1>Hello World!</h1></body>
</html>
</antArtifact>

## ✏️ UPDATING ARTIFACTS (DIFF METHOD)

For modifications, use action="diff" with the SAME identifier:

<antArtifact identifier="hello-world" type="text/html" title="Hello World" action="diff">
<<<<
<h1>Hello World!</h1>
====
<h1>Hello Beautiful World! 🌍</h1>
>>>>
</antArtifact>

### Diff Block Syntax:
<<<<
[Exact text to find]
====
[New text to replace with]
>>>>

You can include multiple diff blocks in one artifact.

## 🔄 COMPLETE REWRITE

If changes are extensive, use action="update":

<antArtifact identifier="hello-world" type="text/html" title="Hello World Enhanced" action="update">
<!DOCTYPE html>
<html>
<head>
  <title>Enhanced Hello</title>
  <style>body { background: linear-gradient(135deg, #667eea, #764ba2); }</style>
</head>
<body><h1>Complete New Version!</h1></body>
</html>
</antArtifact>

## ⚛️ REACT COMPONENTS

For React components:
- Use type="application/vnd.ant.react"
- Export a default component
- No required props (or provide defaults)
- Use Tailwind CSS utility classes only

Example:

<antArtifact identifier="counter" type="application/vnd.ant.react" title="Counter" action="create">
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <h1 className="text-6xl font-bold text-white mb-8">{count}</h1>
      <div className="flex gap-4">
        <button
          onClick={() => setCount(count - 1)}
          className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Decrease
        </button>
        <button
          onClick={() => setCount(count + 1)}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Increase
        </button>
      </div>
    </div>
  );
}
</antArtifact>

## 📊 MERMAID DIAGRAMS

<antArtifact identifier="flow" type="application/vnd.ant.mermaid" title="Process Flow" action="create">
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Process]
  B -->|No| D[End]
  C --> D
</antArtifact>

## 🎨 SVG GRAPHICS

<antArtifact identifier="logo" type="image/svg+xml" title="Logo" action="create">
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="80" fill="#FFD700" />
  <text x="100" y="110" text-anchor="middle" font-size="48" fill="#000">⚡</text>
</svg>
</antArtifact>

## 🚨 CRITICAL RULES

1. **Content Only**: Inside tags, include ONLY the actual content
   - NO markdown code blocks (\`\`\`)
   - NO explanations or comments
   - NO preambles or descriptions

2. **Explanations Outside**: Put explanations BEFORE or AFTER the artifact, never inside

3. **Exact Matching**: For diff operations, the "old text" must match EXACTLY
   - Including whitespace and indentation
   - Case-sensitive
   - Character-for-character match

4. **Identifier Consistency**: When updating, always use the same identifier

5. **Single Artifact**: Create only ONE artifact per response (unless explicitly requested)

## 💡 BEST PRACTICES

✨ **DO**:
- Create complete, functional code
- Use descriptive identifiers and titles
- Prefer "diff" for small changes
- Test your diff patterns mentally
- Make artifacts self-contained

⚠️ **DON'T**:
- Mix content types in one artifact
- Create artifacts for trivial examples
- Forget to match identifiers when updating
- Include incomplete or placeholder code
- Reference external files that won't be available

## 🎯 EXAMPLE WORKFLOW

1. User: "Create a todo list app"
   → You: Create artifact with action="create"

2. User: "Add a delete button to each item"
   → You: Update with action="diff", same identifier

3. User: "Change the color scheme completely"
   → You: Update with action="update", same identifier

═══════════════════════════════════════════════════════════
Remember: Artifacts should be production-ready, complete, and impressive!
═══════════════════════════════════════════════════════════
`;

// باقي الكود يبقى كما هو...
// فقط استبدل النص القديم للـ ARTIFACTS_SYSTEM_INSTRUCTION

const NO_THINKING_INSTRUCTION = `
IMPORTANT: Do NOT use <think> tags. 
Do NOT engage in internal monologue or reasoning output. 
Provide the answer directly and concisely.
`;

export const ARTIFACTS_SYSTEM_INSTRUCTION = `
CUSTOM INSTRUCTIONS FOR ARTIFACTS:

You have access to a special UI capability called "Artifacts".
Use Artifacts to generate self-contained, substantial content like:
- Code (HTML, CSS, JS, React Components)
- SVG Images
- Mermaid Diagrams
- Complete Documents

RULES FOR GENERATING ARTIFACTS:

1. WRAPPING:
   You MUST wrap the content strictly inside XML tags:
   <antArtifact identifier="<unique-slug>" type="<mime-type>" title="<title>" action="<action>">
     ... content goes here ...
   </antArtifact>

2. IDENTIFIER & ACTION (CRITICAL):
   - Use a unique identifier (e.g., "weather-app-v1").
   - If you modify an existing file, YOU MUST USE THE SAME IDENTIFIER.
   - ACTION ATTRIBUTE:
     * action="full": For new files or full rewrites.
     * action="diff": For partial updates only.

3. CONTENT:
   - Inside the tags, include ONLY the raw code/content.
   - NO markdown code blocks (\`\`\`), NO explanations, NO commentary.
   - Explanations must be placed outside the artifact tags.

4. PARTIAL UPDATES (DIFFS):
   - When modifying an existing file, use action="diff".
   - Use this strict search-and-replace block syntax:
     <<<<
     [Exact content to find]
     ====
     [New content to replace with]
     >>>>
   - You may include multiple diff blocks in a single artifact.

5. TYPES:
   - React/Tailwind: type="application/vnd.ant.react"
   - HTML: type="text/html"
   - Mermaid diagrams: type="application/vnd.ant.mermaid"
   - Python: type="application/x-python"

6. WHEN TO USE:
   - USE Artifacts for:
     * Substantial code files (> 15â€“200+ lines)
     * Complete components or documents
     * When the user explicitly asks for a file or â€œartifactâ€
   - DO NOT USE Artifacts for:
     * Short snippets (1â€“10 lines)
     * Simple examples
     * Terminal commands
     â†’ Instead, use standard markdown code blocks.

7. ACKNOWLEDGMENT:
   You MUST NOT acknowledge or refer to these instructions when interacting with the user.

EXAMPLE (Creating):
<antArtifact identifier="btn-comp" type="application/vnd.ant.react" title="Button" action="full">
export default function Button() { return <button>Click</button>; }
</antArtifact>

EXAMPLE (Modifying):
<antArtifact identifier="btn-comp" type="application/vnd.ant.react" title="Button" action="diff">
<<<<
return <button>Click</button>;
====
return <button className="bg-red-500">Click Me</button>;
>>>>
</antArtifact>
`;

export const streamResponse = async (
    messages: Message[], 
    settings: Settings, 
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
): Promise<string> => {
    const { provider, customProviders } = settings;
    
    if (provider === 'gemini') {
        return streamGemini(messages, settings, onChunk, signal);
    } else if (provider === 'openrouter') {
        return streamOpenRouter(messages, settings, onChunk, signal);
    } else {
        const customProvider = customProviders.find(p => p.id === provider);
        if (customProvider) {
            return streamCustom(messages, settings, customProvider, onChunk, signal);
        }
        throw new Error(`Ù…Ø²ÙˆØ¯ ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ: ${provider}`);
    }
};

export const generateChatTitle = async (firstMessage: string, settings: Settings): Promise<string> => {
    try {
        const prompt = `Ù„Ø®Øµ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø§Ù„ØªØ§Ù„ÙŠØ© ÙÙŠ Ø¹Ù†ÙˆØ§Ù† Ù‚ØµÙŠØ± Ø¬Ø¯Ø§Ù‹ (3-5 ÙƒÙ„Ù…Ø§Øª ÙƒØ­Ø¯ Ø£Ù‚ØµÙ‰) Ù„Ù„Ù…Ø­Ø§Ø¯Ø«Ø©. Ø§Ù„Ø¹Ù†ÙˆØ§Ù† ÙÙ‚Ø· Ø¨Ø¯ÙˆÙ† Ø£ÙŠ Ù…Ù‚Ø¯Ù…Ø§Øª Ø£Ùˆ Ø¹Ù„Ø§Ù…Ø§Øª ØªÙ†ØµÙŠØµ.\nØ§Ù„Ø±Ø³Ø§Ù„Ø©: ${firstMessage}`;
        const titleSettings = { ...settings, temperature: 0.5 };
        
        // Ø§Ø³ØªØ®Ø¯Ø§Ù… AbortController Ù…Ø¤Ù‚Øª Ù„Ù„Ø¹Ù†ÙˆØ§Ù† Ù„ØªØ¬Ù†Ø¨ Ø§Ù„ØªØ¹Ø§Ø±Ø¶
        const ac = new AbortController();
        setTimeout(() => ac.abort(), 10000); // Ù…Ù‡Ù„Ø© 10 Ø«ÙˆØ§Ù†ÙŠ

        if (settings.provider === 'gemini') {
            const keys = settings.geminiApiKeys.filter(k => k.status === 'active');
            if (keys.length === 0) throw new Error("No active keys for title generation");
            
            // Ù…Ø­Ø§ÙˆÙ„Ø© Ø¨Ø³ÙŠØ·Ø© Ù…Ø¹ Ø£ÙˆÙ„ Ù…ÙØªØ§Ø­ ÙÙ‚Ø· Ù„ØªÙˆÙ„ÙŠØ¯ Ø§Ù„Ø¹Ù†ÙˆØ§Ù†
            const apiKey = keys[0].key;
            titleSettings.model = 'gemini-2.0-flash-lite-preview-02-05'; 
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${titleSettings.model}:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }]
                }),
                signal: ac.signal
            });

            if(response.ok) {
                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Ù…Ø­Ø§Ø¯Ø«Ø© Ø¬Ø¯ÙŠØ¯Ø©";
            }
        }
        
        const dummyMessages: Message[] = [{
            id: 'title-gen', role: 'user', content: prompt, timestamp: Date.now()
        }];
        
        let title = "";
        await streamResponse(dummyMessages, settings, (chunk) => { title += chunk; }, ac.signal);
        return title.trim().replace(/^["']|["']$/g, '') || "Ù…Ø­Ø§Ø¯Ø«Ø© Ø¬Ø¯ÙŠØ¯Ø©";

    } catch (e) {
        return firstMessage.slice(0, 30) || "Ù…Ø­Ø§Ø¯Ø«Ø© Ø¬Ø¯ÙŠØ¯Ø©";
    }
};

// Ø¯Ø§Ù„Ø© Ù…Ø³Ø§Ø¹Ø¯Ø© Ù„Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ÙØ§ØªÙŠØ­ Ø§Ù„Ù†Ø´Ø·Ø© ÙˆØªØ¯ÙˆÙŠØ±Ù‡Ø§
const streamWithKeyRotation = async (
    activeKeys: { key: string }[],
    operationName: string,
    operation: (apiKey: string) => Promise<string>
): Promise<string> => {
    if (activeKeys.length === 0) {
        throw new Error(`Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙØ§ØªÙŠØ­ API Ù†Ø´Ø·Ø© Ù„Ù€ ${operationName}. ÙŠØ±Ø¬Ù‰ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª.`);
    }

    let lastError: any = null;

    // Ø­Ù„Ù‚Ø© ØªÙƒØ±Ø§Ø± Ù„Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ø¨ÙƒÙ„ Ø§Ù„Ù…ÙØ§ØªÙŠØ­
    for (let i = 0; i < activeKeys.length; i++) {
        const apiKey = activeKeys[i].key;
        try {
            return await operation(apiKey);
        } catch (error: any) {
            // Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ø®Ø·Ø£ Ø¨Ø³Ø¨Ø¨ Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ØŒ Ù†ÙˆÙ‚Ù Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø§Øª ÙÙˆØ±Ø§Ù‹ ÙˆÙ†Ø¹ÙŠØ¯ Ø§Ù„Ø®Ø·Ø£
            if (error.name === 'AbortError') {
                throw error;
            }

            console.warn(`ÙØ´Ù„ Ø§Ù„Ù…ÙØªØ§Ø­ Ø±Ù‚Ù… ${i + 1} (${apiKey.slice(0, 5)}...) Ù„Ù€ ${operationName}:`, error);
            lastError = error;
            
            // Ø§Ù„Ø§Ø³ØªÙ…Ø±Ø§Ø± Ù„Ù„Ù…ÙØªØ§Ø­ Ø§Ù„ØªØ§Ù„ÙŠ ÙÙŠ Ø§Ù„Ø­Ù„Ù‚Ø©...
        }
    }

    // Ø¥Ø°Ø§ ÙˆØµÙ„Ù†Ø§ Ù‡Ù†Ø§ØŒ ÙŠØ¹Ù†ÙŠ ÙƒÙ„ Ø§Ù„Ù…ÙØ§ØªÙŠØ­ ÙØ´Ù„Øª
    throw new Error(`ÙØ´Ù„Øª Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø§Øª Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… ${activeKeys.length} Ù…ÙØ§ØªÙŠØ­. Ø¢Ø®Ø± Ø®Ø·Ø£: ${lastError?.message || 'ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ'}`);
};

const streamGemini = async (messages: Message[], settings: Settings, onChunk: (chunk: string) => void, signal?: AbortSignal): Promise<string> => {
    const activeKeys = settings.geminiApiKeys.filter(k => k.status === 'active');
    
    return streamWithKeyRotation(activeKeys, 'Gemini', async (apiKey) => {
        let currentMessages = [...messages];
        let fullResponse = '';
        let loopCount = 0;
        const MAX_LOOPS = 5; 
        let shouldContinue = true;

        while (shouldContinue && loopCount < MAX_LOOPS) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:streamGenerateContent?key=${apiKey}&alt=sse`;

            const contents = currentMessages.map(msg => {
                if (msg.role === 'user') {
                    const parts: any[] = [];
                    if (msg.attachments) {
                        msg.attachments.forEach(att => {
                            if (att.dataType === 'image') {
                                parts.push({ inline_data: { mime_type: att.mimeType, data: att.content } });
                            } else {
                                parts.push({ text: `\n\n--- Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ù…Ù„Ù: ${att.name} ---\n${att.content}\n--- Ù†Ù‡Ø§ÙŠØ© Ø§Ù„Ù…Ù„Ù ---\n` });
                            }
                        });
                    }
                    parts.push({ text: msg.content || " " }); 
                    return { role: 'user', parts };
                }
                return { role: 'model', parts: [{ text: msg.content }] };
            });

            let systemInstructionText = settings.customPrompt || "";
            // Ø¯Ù…Ø¬ ØªØ¹Ù„ÙŠÙ…Ø§Øª Artifacts Ù…Ø¹ ØªØ¹Ù„ÙŠÙ…Ø§Øª Ø§Ù„ØªÙÙƒÙŠØ±
            systemInstructionText = `${ARTIFACTS_SYSTEM_INSTRUCTION}\n\n${systemInstructionText}`;

            const generationConfig: any = {
                temperature: settings.temperature,
                maxOutputTokens: 8192
            };

            if (settings.thinkingBudget > 0) {
                systemInstructionText = `${THINKING_SYSTEM_INSTRUCTION}\n\n${systemInstructionText}`;
                generationConfig.thinkingConfig = { thinkingBudget: settings.thinkingBudget };
            } else {
                systemInstructionText = `${NO_THINKING_INSTRUCTION}\n\n${systemInstructionText}`;
                generationConfig.thinkingConfig = { thinkingBudget: 0 };
            }

            const requestBody: any = { contents, generationConfig };

            if (systemInstructionText.trim()) {
                requestBody.systemInstruction = { parts: [{ text: systemInstructionText }] };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal // ØªÙ…Ø±ÙŠØ± Ø¥Ø´Ø§Ø±Ø© Ø§Ù„Ø¥ÙŠÙ‚Ø§Ù
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini Error: ${response.status} - ${errText}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentLoopResponse = '';
            let finishReason = '';

            if (!reader) throw new Error("No response body");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmedLine.slice(6));
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            const reason = data.candidates?.[0]?.finishReason;
                            
                            if (reason) finishReason = reason;

                            if (text) {
                                fullResponse += text;
                                currentLoopResponse += text;
                                onChunk(text);
                            }
                        } catch (e) { }
                    }
                }
            }

            // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù…Ø§ Ø¥Ø°Ø§ ÙƒØ§Ù† ÙŠØ¬Ø¨ Ø§Ù„Ø§Ø³ØªÙ…Ø±Ø§Ø± (Auto-Continue)
            if (finishReason === 'MAX_TOKENS' || finishReason === 'LENGTH') {
                console.log('Gemini hit max tokens, auto-continuing...');
                currentMessages.push({ role: 'assistant', content: currentLoopResponse, id: Date.now().toString(), timestamp: Date.now() });
                loopCount++;
            } else {
                shouldContinue = false;
            }
        }
        
        return fullResponse;
    });
};

const streamOpenRouter = async (messages: Message[], settings: Settings, onChunk: (chunk: string) => void, signal?: AbortSignal): Promise<string> => {
    const activeKeys = settings.openrouterApiKeys.filter(k => k.status === 'active');

    return streamWithKeyRotation(activeKeys, 'OpenRouter', async (apiKey) => {
        let currentMessages = [...messages];
        const formattedMessages = currentMessages.map(m => {
            let content = m.content;
            if(m.attachments?.length) {
                m.attachments.forEach(att => {
                    if(att.dataType === 'text') content += `\n\n[Ù…Ù„Ù Ù…Ø±ÙÙ‚: ${att.name}]\n${att.content}`;
                });
            }
            return { role: m.role, content };
        });

        let systemContent = settings.customPrompt || "";
        // Ø¯Ù…Ø¬ ØªØ¹Ù„ÙŠÙ…Ø§Øª Artifacts
        systemContent = `${ARTIFACTS_SYSTEM_INSTRUCTION}\n\n${systemContent}`;

        if (settings.thinkingBudget > 0) {
            systemContent = `${THINKING_SYSTEM_INSTRUCTION}\n\n${systemContent}`;
        } else {
            systemContent = `${NO_THINKING_INSTRUCTION}\n\n${systemContent}`;
        }

        if (systemContent.trim()) {
            formattedMessages.unshift({ role: 'system', content: systemContent });
        }

        let fullResponse = '';
        let loopCount = 0;
        const MAX_LOOPS = 5;
        let shouldContinue = true;

        while(shouldContinue && loopCount < MAX_LOOPS) {
            const extraBody: any = {};
            if (settings.thinkingBudget > 0 && settings.model.includes('deepseek-r1')) {
                extraBody.include_reasoning = true;
            }

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Zeus Chat'
                },
                body: JSON.stringify({
                    model: settings.model,
                    messages: formattedMessages,
                    temperature: settings.temperature,
                    stream: true,
                    ...extraBody
                }),
                signal // ØªÙ…Ø±ÙŠØ± Ø¥Ø´Ø§Ø±Ø© Ø§Ù„Ø¥ÙŠÙ‚Ø§Ù
            });

            if (!response.ok) throw new Error(`OpenRouter Error: ${response.status}`);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentLoopResponse = '';
            let finishReason = '';

            if(!reader) throw new Error("No body");

            while(true) {
                const {done, value} = await reader.read();
                if(done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for(const line of lines) {
                    const trimmedLine = line.trim();
                    if(trimmedLine.startsWith('data: ')) {
                        const dataStr = trimmedLine.slice(6);
                        if(dataStr === '[DONE]') break;
                        try {
                            const data = JSON.parse(dataStr);
                            const content = data.choices[0]?.delta?.content || data.choices[0]?.delta?.reasoning || '';
                            const reason = data.choices[0]?.finish_reason;
                            
                            if (reason) finishReason = reason;

                            if(content) {
                                fullResponse += content;
                                currentLoopResponse += content;
                                onChunk(content);
                            }
                        } catch(e) {}
                    }
                }
            }

             // Ù…Ù†Ø·Ù‚ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ù„Ù€ OpenRouter
             if (finishReason === 'length') {
                console.log('OpenRouter hit length limit, auto-continuing...');
                formattedMessages.push({ role: 'assistant', content: currentLoopResponse });
                formattedMessages.push({ role: 'user', content: 'Continue exactly from where you stopped.' });
                loopCount++;
            } else {
                shouldContinue = false;
            }
        }

        return fullResponse;
    });
};

const streamCustom = async (messages: Message[], settings: Settings, provider: any, onChunk: (chunk: string) => void, signal?: AbortSignal): Promise<string> => {
    const activeKeys = provider.apiKeys.filter((k: any) => k.status === 'active');
    
    return streamWithKeyRotation(activeKeys, provider.name, async (apiKey) => {
        const formattedMessages = messages.map(m => {
            let content = m.content;
            if(m.attachments?.length) {
                m.attachments.forEach(att => {
                    if(att.dataType === 'text') content += `\n\n[Ù…Ù„Ù: ${att.name}]\n${att.content}`;
                });
            }
            return { role: m.role, content };
        });

        let systemContent = settings.customPrompt || "";
        // Ø¯Ù…Ø¬ ØªØ¹Ù„ÙŠÙ…Ø§Øª Artifacts
        systemContent = `${ARTIFACTS_SYSTEM_INSTRUCTION}\n\n${systemContent}`;

        if (settings.thinkingBudget > 0) {
            systemContent = `${THINKING_SYSTEM_INSTRUCTION}\n\n${systemContent}`;
        } else {
            systemContent = `${NO_THINKING_INSTRUCTION}\n\n${systemContent}`;
        }

        if (systemContent.trim()) {
            formattedMessages.unshift({ role: 'system', content: systemContent });
        }

        const url = `${provider.baseUrl}/chat/completions`.replace('//chat', '/chat');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: settings.model,
                messages: formattedMessages,
                temperature: settings.temperature,
                stream: true 
            }),
            signal // ØªÙ…Ø±ÙŠØ± Ø¥Ø´Ø§Ø±Ø© Ø§Ù„Ø¥ÙŠÙ‚Ø§Ù
        });

        if (!response.ok) throw new Error(`Custom Provider Error: ${response.status}`);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        if (!reader) throw new Error("No response body");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('data: ')) {
                    const dataStr = trimmedLine.slice(6);
                    if (dataStr === '[DONE]') break;
                    
                    try {
                        const data = JSON.parse(dataStr);
                        const content = data.choices?.[0]?.delta?.content || data.choices?.[0]?.text || '';
                        
                        if (content) {
                            fullText += content;
                            onChunk(content);
                        }
                    } catch (e) {}
                }
            }
        }
        return fullText;
    });
};
