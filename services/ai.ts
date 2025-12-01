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


‏export const ARTIFACTS_SYSTEM_INSTRUCTION = `
‏You have access to create and update artifacts - self-contained pieces of content displayed in a side panel.

‏WHEN TO USE ARTIFACTS:
‏- Substantial code (>15 lines)
‏- Complete documents or creative writing
‏- React components, HTML pages, or visualizations
‏- Mermaid diagrams or SVG graphics
‏- Content meant to be saved/reused

‏DO NOT use artifacts for:
‏- Short code snippets (<15 lines) - use markdown code blocks instead
‏- Conversational responses or explanations

‏ARTIFACT FORMAT:
‏Use this exact XML format:

‏<antArtifact identifier="unique-id" type="mime-type" title="Title">
‏[content here]
‏</antArtifact>

‏TYPES:
‏- application/vnd.ant.code - Code with language attribute
‏- application/vnd.ant.react - React components
‏- text/html - HTML with CSS/JS
‏- image/svg+xml - SVG graphics
‏- application/vnd.ant.mermaid - Mermaid diagrams
‏- text/markdown - Markdown documents

‏UPDATING ARTIFACTS:
‏When user asks to modify existing artifact, you have TWO options:

‏1. SMALL CHANGES (update method):
‏   - Use when changing <20 lines in <5 locations
‏   - Call multiple times for different changes
‏   - Maximum 4 update calls per response
   
‏   Format:
‏   <antArtifact identifier="same-id" type="same-type" title="same-title" action="update">
‏   <old_str>
‏   [EXACT text to find - must match PERFECTLY including whitespace]
‏   </old_str>
‏   <new_str>
‏   [replacement text]
‏   </new_str>
‏   </antArtifact>

‏2. LARGE CHANGES (rewrite method):
‏   - Use when changes exceed update thresholds
‏   - Use for structural changes
‏   - Provide complete new version
   
‏   Format:
‏   <antArtifact identifier="same-id" type="same-type" title="Updated Title" action="rewrite">
‏   [complete new content]
‏   </antArtifact>

‏CRITICAL RULES FOR UPDATE:
‏- old_str MUST appear EXACTLY ONCE in current content
‏- old_str must match PERFECTLY (whitespace, indentation, everything)
‏- If uncertain about exact match, use rewrite instead
‏- You can make multiple update calls (max 4) in one response

‏IDENTIFIER RULES:
‏- Use descriptive slugs: "weather-app", "todo-list", "data-viz"
‏- ALWAYS use the SAME identifier when updating existing artifact
‏- Never create new identifier for updates

‏EXAMPLES:

‏Creating new artifact:
‏<antArtifact identifier="button-component" type="application/vnd.ant.react" title="Blue Button">
‏export default function Button() {
‏  return <button className="bg-blue-500 text-white px-4 py-2 rounded">Click Me</button>;
}
‏</antArtifact>

‏Updating (small change):
‏<antArtifact identifier="button-component" type="application/vnd.ant.react" title="Blue Button" action="update">
‏<old_str>bg-blue-500</old_str>
‏<new_str>bg-red-500</new_str>
‏</antArtifact>

‏Multiple updates:
‏<antArtifact identifier="button-component" type="application/vnd.ant.react" title="Blue Button" action="update">
‏<old_str>bg-blue-500</old_str>
‏<new_str>bg-green-500</new_str>
‏</antArtifact>

‏<antArtifact identifier="button-component" type="application/vnd.ant.react" title="Green Button" action="update">
‏<old_str>Click Me</old_str>
‏<new_str>Press Here</new_str>
‏</antArtifact>

‏Rewriting (major change):
‏<antArtifact identifier="button-component" type="application/vnd.ant.react" title="Animated Button" action="rewrite">
‏export default function Button() {
‏  return (
‏    <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:scale-105 transition-transform">
‏      ✨ Click Me ✨
‏    </button>
  );
}
‏</antArtifact>

IMPORTANT:
‏- Place explanations OUTSIDE artifact tags
‏- Include ONLY the code/content inside tags
‏- No markdown fences (```) inside artifacts
‏Be precise with update old_str it must match exactly
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
            // دمج تعليمات Artifacts مع تعليمات التفكير
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
                signal // تمرير إشارة الإيقاف
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

            // التحقق مما إذا كان يجب الاستمرار (Auto-Continue)
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
                    if(att.dataType === 'text') content += `\n\n[ملف مرفق: ${att.name}]\n${att.content}`;
                });
            }
            return { role: m.role, content };
        });

        let systemContent = settings.customPrompt || "";
        // دمج تعليمات Artifacts
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
                signal // تمرير إشارة الإيقاف
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

             // منطق المتابعة لـ OpenRouter
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
                    if(att.dataType === 'text') content += `\n\n[ملف: ${att.name}]\n${att.content}`;
                });
            }
            return { role: m.role, content };
        });

        let systemContent = settings.customPrompt || "";
        // دمج تعليمات Artifacts
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
            signal // تمرير إشارة الإيقاف
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