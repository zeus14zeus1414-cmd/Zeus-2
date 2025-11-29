import { Settings, Message, Attachment } from '../types';

export const AI_MODELS = {
    gemini: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-2.0-flash-lite-preview', name: 'Gemini 2.0 Flash Lite' },
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 pro' },
    ],
    openrouter: [
        { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (مجاني)' },
        { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (مجاني)' },
        { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (مجاني)' },
        { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder' },
    ]
};

export const streamResponse = async (
    messages: Message[], 
    settings: Settings, 
    onChunk: (chunk: string) => void
): Promise<string> => {
    const { provider, customProviders } = settings;
    
    // تحديد المنطق بناءً على المزود
    if (provider === 'gemini') {
        return streamGemini(messages, settings, onChunk);
    } else if (provider === 'openrouter') {
        return streamOpenRouter(messages, settings, onChunk);
    } else {
        // البحث في المزودين المخصصين
        const customProvider = customProviders.find(p => p.id === provider);
        if (customProvider) {
            return streamCustom(messages, settings, customProvider, onChunk);
        }
        throw new Error(`مزود غير معروف: ${provider}`);
    }
};

// دالة جديدة لتوليد العنوان
export const generateChatTitle = async (firstMessage: string, settings: Settings): Promise<string> => {
    try {
        // نستخدم نفس المزود الحالي للمستخدم ولكن نحاول طلب نموذج سريع ومختصر
        const prompt = `لخص الرسالة التالية في عنوان قصير جداً (3-5 كلمات كحد أقصى) للمحادثة. العنوان فقط بدون أي مقدمات أو علامات تنصيص.\nالرسالة: ${firstMessage}`;
        
        // إعدادات مؤقتة للعنوان
        const titleSettings = { ...settings, temperature: 0.5 };
        
        // إذا كان المزود هو Gemini، نستخدم Flash Lite للسرعة إذا كان متاحاً
        if (settings.provider === 'gemini') {
            titleSettings.model = 'gemini-2.0-flash-lite-preview-02-05'; // استخدام النموذج السريع للعناوين
            
            // محاولة استخدام المفتاح النشط
            const apiKey = getActiveKey(settings.geminiApiKeys);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${titleSettings.model}:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }]
                })
            });

            if(response.ok) {
                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "محادثة جديدة";
            }
        }
        
        // إذا لم ينجح Gemini الخاص أو كان المزود مختلف، نستخدم دالة الستريم العادية (لكن بدون ستريم فعلي، فقط نأخذ النتيجة)
        // سننشئ مصفوفة رسائل وهمية
        const dummyMessages: Message[] = [{
            id: 'title-gen', role: 'user', content: prompt, timestamp: Date.now()
        }];
        
        let title = "";
        await streamResponse(dummyMessages, settings, (chunk) => { title += chunk; });
        return title.trim().replace(/^["']|["']$/g, '') || "محادثة جديدة";

    } catch (e) {
        console.error("فشل توليد العنوان:", e);
        return firstMessage.slice(0, 30) || "محادثة جديدة";
    }
};

const getActiveKey = (keys: { key: string; status: string }[]) => {
    const active = keys.find(k => k.status === 'active');
    if (!active) throw new Error("لا يوجد مفتاح API نشط. يرجى التحقق من الإعدادات.");
    return active.key;
};

const streamGemini = async (messages: Message[], settings: Settings, onChunk: (chunk: string) => void): Promise<string> => {
    const apiKey = getActiveKey(settings.geminiApiKeys);
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

    if (settings.customPrompt) {
        contents.unshift({ role: 'user', parts: [{ text: settings.customPrompt }] });
        contents.unshift({ role: 'model', parts: [{ text: 'حسناً، فهمت التعليمات.' }] });
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents,
            generationConfig: {
                temperature: settings.temperature,
                maxOutputTokens: 8192
            }
        })
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
        
        // Use stream: true to handle multi-byte characters split across chunks
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        
        // Keep the last line in the buffer as it might be incomplete
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
                } catch (e) {
                    // تجاهل أخطاء التحليل الجزئية
                }
            }
        }
    }
    return fullText;
};

const streamOpenRouter = async (messages: Message[], settings: Settings, onChunk: (chunk: string) => void): Promise<string> => {
    const apiKey = getActiveKey(settings.openrouterApiKeys);
    
    const formattedMessages = messages.map(m => {
        let content = m.content;
        if(m.attachments?.length) {
            m.attachments.forEach(att => {
                if(att.dataType === 'text') content += `\n\n[ملف مرفق: ${att.name}]\n${att.content}`;
            });
        }
        return { role: m.role, content };
    });

    if (settings.customPrompt) {
        formattedMessages.unshift({ role: 'system', content: settings.customPrompt });
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
            stream: true
        })
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
                    const content = data.choices[0]?.delta?.content || '';
                    if(content) {
                        fullText += content;
                        onChunk(content);
                    }
                } catch(e) {}
            }
        }
    }
    return fullText;
};

const streamCustom = async (messages: Message[], settings: Settings, provider: any, onChunk: (chunk: string) => void): Promise<string> => {
    const apiKey = provider.apiKeys.find((k:any) => k.status === 'active')?.key;
    if(!apiKey) throw new Error("لا يوجد مفتاح نشط للمزود المخصص");

    // تحضير الرسائل بتنسيق OpenAI القياسي
    const formattedMessages = messages.map(m => {
        let content = m.content;
        if(m.attachments?.length) {
            m.attachments.forEach(att => {
                if(att.dataType === 'text') content += `\n\n[ملف: ${att.name}]\n${att.content}`;
            });
        }
        return { role: m.role, content };
    });

    if (settings.customPrompt) {
        formattedMessages.unshift({ role: 'system', content: settings.customPrompt });
    }

    // افتراض أن المزود المخصص يدعم واجهة OpenAI
    const url = `${provider.baseUrl}/chat/completions`.replace('//chat', '/chat'); // simple sanitization

    try {
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
                stream: false // للتبسيط في المزود المخصص في هذه النسخة، نستخدم الاستجابة الكاملة ثم نحاكي التدفق
            })
        });

        if (!response.ok) throw new Error(`Custom Provider Error: ${response.status}`);

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";
        
        // محاكاة التدفق لأننا لم نستخدم stream: true هنا لتجنب تعقيدات الـ parsing المختلفة
        const words = text.split(' ');
        for(let i=0; i<words.length; i++) {
            onChunk(words[i] + ' ');
            await new Promise(r => setTimeout(r, 20)); // تأخير بسيط للمحاكاة
        }
        return text;

    } catch (e: any) {
        throw new Error(`خطأ في المزود المخصص: ${e.message}`);
    }
};