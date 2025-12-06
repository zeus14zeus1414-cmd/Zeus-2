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
        { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (مجاني)' },
        { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (مجاني)' },
        { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (مجاني)' },
        { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder' },
    ]
};

const THINKING_SYSTEM_INSTRUCTION = `
IMPORTANT: You are currently in "Deep Thinking Mode".
1. Before answering, you MUST engage in a comprehensive, step-by-step reasoning process.
2. You MUST enclose your internal monologue and reasoning process strictly within <think> and </think> tags.
3. CRITICAL: Your internal reasoning (inside <think> tags) MUST BE IN ARABIC LANGUAGE only. Do not think in English.
4. CRITICAL: You MUST use the exact tags <think> and </think>. Do NOT translate the tags themselves into Arabic (e.g., do NOT use <فكّر>).
5. The content inside <think> tags will be displayed to the user as your "thought process".
6. After the closing </think> tag, provide your final, polished answer to the user.
7. Do NOT be lazy. Analyze the request deeply.
Format your response exactly like this:
<think>
[خطوات التفكير والتحليل العميق يجب أن تكون باللغة العربية هنا...]
</think>
[إجابتك النهائية هنا]
`;

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
        throw new Error(`مزود غير معروف: ${provider}`);
    }
};

export const generateChatTitle = async (firstMessage: string, settings: Settings): Promise<string> => {
    try {
        const prompt = `لخص الرسالة التالية في عنوان قصير جداً (3-5 كلمات كحد أقصى) للمحادثة. العنوان فقط بدون أي مقدمات أو علامات تنصيص.\nالرسالة: ${firstMessage}`;
        const titleSettings = { ...settings, temperature: 0.5 };
        
        // استخدام AbortController مؤقت للعنوان لتجنب التعارض
        const ac = new AbortController();
        setTimeout(() => ac.abort(), 10000); // مهلة 10 ثواني

        if (settings.provider === 'gemini') {
            const keys = settings.geminiApiKeys.filter(k => k.status === 'active');
            if (keys.length === 0) throw new Error("No active keys for title generation");
            
            // محاولة بسيطة مع أول مفتاح فقط لتوليد العنوان
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
                return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "محادثة جديدة";
            }
        }
        
        const dummyMessages: Message[] = [{
            id: 'title-gen', role: 'user', content: prompt, timestamp: Date.now()
        }];
        
        let title = "";
        await streamResponse(dummyMessages, settings, (chunk) => { title += chunk; }, ac.signal);
        return title.trim().replace(/^["']|["']$/g, '') || "محادثة جديدة";

    } catch (e) {
        return firstMessage.slice(0, 30) || "محادثة جديدة";
    }
};

// دالة مساعدة للحصول على جميع المفاتيح النشطة وتدويرها
const streamWithKeyRotation = async (
    activeKeys: { key: string }[],
    operationName: string,
    operation: (apiKey: string) => Promise<string>
): Promise<string> => {
    if (activeKeys.length === 0) {
        throw new Error(`لا يوجد مفاتيح API نشطة لـ ${operationName}. يرجى التحقق من الإعدادات.`);
    }

    let lastError: any = null;

    // حلقة تكرار للمحاولة بكل المفاتيح
    for (let i = 0; i < activeKeys.length; i++) {
        const apiKey = activeKeys[i].key;
        try {
            return await operation(apiKey);
        } catch (error: any) {
            // إذا كان الخطأ بسبب إيقاف المستخدم، نوقف المحاولات فوراً ونعيد الخطأ
            if (error.name === 'AbortError') {
                throw error;
            }

            console.warn(`فشل المفتاح رقم ${i + 1} (${apiKey.slice(0, 5)}...) لـ ${operationName}:`, error);
            lastError = error;
            
            // الاستمرار للمفتاح التالي في الحلقة...
        }
    }

    // إذا وصلنا هنا، يعني كل المفاتيح فشلت
    throw new Error(`فشلت جميع المحاولات باستخدام ${activeKeys.length} مفاتيح. آخر خطأ: ${lastError?.message || 'غير معروف'}`);
};

const streamGemini = async (messages: Message[], settings: Settings, onChunk: (chunk: string) => void, signal?: AbortSignal): Promise<string> => {
    const activeKeys = settings.geminiApiKeys.filter(k => k.status === 'active');
    
    return streamWithKeyRotation(activeKeys, 'Gemini', async (apiKey) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:streamGenerateContent?key=${apiKey}&alt=sse`;

        const contents = messages.map(msg => {
            if (msg.role === 'user') {
                const parts: any[] = [];
                if (msg.attachments) {
                    msg.attachments.forEach(att => {
                        if (att.dataType === 'image') {
                            parts.push({ inline_data: { mime_type: att.mimeType, data: att.content } });
                        } else {
                            parts.push({ text: `\n\n--- محتوى الملف: ${att.name} ---\n${att.content}\n--- نهاية الملف ---\n` });
                        }
                    });
                }
                parts.push({ text: msg.content || " " }); 
                return { role: 'user', parts };
            }
            return { role: 'model', parts: [{ text: msg.content }] };
        });

        let systemInstructionText = settings.customPrompt || "";
        const generationConfig: any = {
            temperature: settings.temperature,
            maxOutputTokens: 8192
        };

        if (settings.thinkingBudget > 0) {
            systemInstructionText = `${THINKING_SYSTEM_INSTRUCTION}\n\n${systemInstructionText}`;
            generationConfig.thinkingConfig = { thinkingBudget: settings.thinkingBudget };
        } else {
            // Explicitly force disable thinking to prevent model defaulting to auto
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
            signal // تمرير إشارة الإيقاف
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini Error: ${response.status} - ${errText}`);
        }

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
                    try {
                        const data = JSON.parse(trimmedLine.slice(6));
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        if (text) {
                            fullText += text;
                            onChunk(text);
                        }
                    } catch (e) { }
                }
            }
        }
        return fullText;
    });
};

const streamOpenRouter = async (messages: Message[], settings: Settings, onChunk: (chunk: string) => void, signal?: AbortSignal): Promise<string> => {
    const activeKeys = settings.openrouterApiKeys.filter(k => k.status === 'active');

    return streamWithKeyRotation(activeKeys, 'OpenRouter', async (apiKey) => {
        const formattedMessages = messages.map(m => {
            let content = m.content;
            if(m.attachments?.length) {
                m.attachments.forEach(att => {
                    if(att.dataType === 'text') content += `\n\n[ملف مرفق: ${att.name}]\n${att.content}`;
                });
            }
            return { role: m.role, content };
        });

        let systemContent = settings.customPrompt || "";
        if (settings.thinkingBudget > 0) {
            systemContent = `${THINKING_SYSTEM_INSTRUCTION}\n\n${systemContent}`;
        } else {
            systemContent = `${NO_THINKING_INSTRUCTION}\n\n${systemContent}`;
        }

        if (systemContent.trim()) {
            formattedMessages.unshift({ role: 'system', content: systemContent });
        }

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
            signal // تمرير إشارة الإيقاف
        });

        if (!response.ok) throw new Error(`OpenRouter Error: ${response.status}`);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

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
                        if(content) {
                            fullText += content;
                            onChunk(content);
                        }
                    } catch(e) {}
                }
            }
        }
        return fullText;
    });
};

const streamCustom = async (messages: Message[], settings: Settings, provider: any, onChunk: (chunk: string) => void, signal?: AbortSignal): Promise<string> => {
    const activeKeys = provider.apiKeys.filter((k: any) => k.status === 'active');
    
    return streamWithKeyRotation(activeKeys, provider.name, async (apiKey) => {
        const formattedMessages = messages.map(m => {
            let content = m.content;
            if(m.attachments?.length) {
                m.attachments.forEach(att => {
                    if(att.dataType === 'text') content += `\n\n[ملف: ${att.name}]\n${att.content}`;
                });
            }
            return { role: m.role, content };
        });

        let systemContent = settings.customPrompt || "";
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
                stream: true // تفعيل الستريمنج الحقيقي
            }),
            signal // تمرير إشارة الإيقاف
        });

        if (!response.ok) throw new Error(`Custom Provider Error: ${response.status}`);

        // استخدام الـ Reader لقراءة التدفق الحقيقي
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
                // معالجة صيغة SSE القياسية (data: {...})
                if (trimmedLine.startsWith('data: ')) {
                    const dataStr = trimmedLine.slice(6);
                    if (dataStr === '[DONE]') break;
                    
                    try {
                        const data = JSON.parse(dataStr);
                        // دعم معظم المزودين المتوافقين مع OpenAI
                        const content = data.choices?.[0]?.delta?.content || data.choices?.[0]?.text || '';
                        
                        if (content) {
                            fullText += content;
                            onChunk(content);
                        }
                    } catch (e) {
                        // تجاهل أخطاء البارسنج للسطور غير المكتملة
                    }
                }
            }
        }
        return fullText;
    });
};
