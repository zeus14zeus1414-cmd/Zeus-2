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

// تم تبسيط التعليمات لتكون مجرد "تنسيق" فقط دون التدخل في عملية التفكير العقلية
// هذا يمنع الموديل من الهلوسة بخصوص التعليمات
const FORMAT_ONLY_INSTRUCTION = `
IMPORTANT: You are in Deep Thinking Mode.
1. You MUST start your response with a <think> block.
2. Inside <think>, write your planning and reasoning steps (You can use English or Arabic here).
3. CLOSE the block with </think> BEFORE writing the final answer.
4. The final answer MUST be in the user's requested language.
Example:
<think>
Analysis: The user wants a story...
Plan: 1. Intro 2. Climax...
</think>
[Final Story Here]
`;

const NO_THINKING_INSTRUCTION = `
Answer directly without internal monologue tags.
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
            // نستخدم تعليمات تنسيق خفيفة جداً لضمان عمل الواجهة فقط
            // ولا نتدخل في طريقة تفكير الموديل
            systemInstructionText = `${FORMAT_ONLY_INSTRUCTION}\n\n${systemInstructionText}`;
            generationConfig.thinkingConfig = { thinkingBudget: settings.thinkingBudget };
        } else {
            // في حالة عدم التفكير، نطلب منه عدم استخدام الوسوم
            // systemInstructionText = `${NO_THINKING_INSTRUCTION}\n\n${systemInstructionText}`; // (اختياري، يمكن تركه للوضع الافتراضي)
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

        // التعامل الخاص مع DeepSeek R1 وموديلات التفكير الفطرية
        const isDeepSeekR1 = settings.model.includes('deepseek-r1') || settings.model.includes('thinking');
        
        let systemContent = settings.customPrompt || "";

        if (settings.thinkingBudget > 0) {
            if (isDeepSeekR1) {
                // هام جداً: لا نحقن أي تعليمات للموديلات التي تدعم التفكير فطرياً
                // DeepSeek R1 يقوم بإخراج وسوم <think> تلقائياً
                // إضافة تعليمات هنا تسبب تكرار الوسوم أو تشويش الموديل
            } else {
                systemContent = `${FORMAT_ONLY_INSTRUCTION}\n\n${systemContent}`;
            }
        } 

        if (systemContent.trim()) {
            formattedMessages.unshift({ role: 'system', content: systemContent });
        }

        const extraBody: any = {};
        // فقط نطلب التفكير من المزود، ولا نتدخل في الـ System Prompt
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
            systemContent = `${FORMAT_ONLY_INSTRUCTION}\n\n${systemContent}`;
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