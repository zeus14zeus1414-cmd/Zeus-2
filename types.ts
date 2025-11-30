export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    attachments?: Attachment[];
}

export interface Attachment {
    name: string;
    type: string;
    size: number;
    content: string; // Base64 or Text content
    dataType: 'image' | 'text';
    mimeType?: string;
}

export interface Chat {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
    order: number;
}

export interface ApiKey {
    key: string;
    status: 'active' | 'inactive';
}

export interface CustomModel {
    id: string;
    name: string;
    provider: string; // 'gemini' | 'openrouter' | custom provider id
    defaultTemperature: number;
    description: string;
}

export interface CustomProvider {
    id: string;
    name: string;
    baseUrl: string;
    apiKeys: ApiKey[];
    models: { id: string; name: string }[];
}

export interface MessageCollapsingOptions {
    enabled: boolean;
    targets: 'user' | 'assistant' | 'both';
    thresholdLines: number;
}

export interface Settings {
    provider: 'gemini' | 'openrouter' | string;
    model: string;
    temperature: number;
    geminiApiKeys: ApiKey[];
    openrouterApiKeys: ApiKey[];
    customProviders: CustomProvider[]; // المزودون المخصصون
    customModels: CustomModel[]; // النماذج المخصصة
    customPrompt: string;
    apiKeyRetryStrategy: 'sequential' | 'round-robin';
    fontSize: number;
    thinkingBudget: number; // ميزانية التفكير
    messageCollapsing: MessageCollapsingOptions; // خيارات طي الرسائل
}