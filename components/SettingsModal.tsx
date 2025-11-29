import React, { useState } from 'react';
import { Settings, ApiKey, CustomProvider, CustomModel } from '../types';
import { AI_MODELS } from '../services/ai';

interface Props {
    settings: Settings;
    onSave: (settings: Settings) => void;
    onClose: () => void;
}

const SettingsModal: React.FC<Props> = ({ settings, onSave, onClose }) => {
    const [localSettings, setLocalSettings] = useState<Settings>(settings);
    const [activeTab, setActiveTab] = useState<'general' | 'keys' | 'custom_providers' | 'custom_models'>('general');
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300); // Wait for animation to finish
    };

    const handleSave = () => {
        onSave(localSettings);
        handleClose();
    };

    const addKey = (provider: 'gemini' | 'openrouter') => {
        const keyType = provider === 'gemini' ? 'geminiApiKeys' : 'openrouterApiKeys';
        setLocalSettings(prev => ({
            ...prev,
            [keyType]: [...prev[keyType], { key: '', status: 'active' }]
        }));
    };

    const updateKey = (provider: 'gemini' | 'openrouter', index: number, val: string) => {
        const keyType = provider === 'gemini' ? 'geminiApiKeys' : 'openrouterApiKeys';
        const newKeys = [...localSettings[keyType]];
        newKeys[index].key = val;
        setLocalSettings(prev => ({ ...prev, [keyType]: newKeys }));
    };

    // --- Custom Provider Logic ---
    const addCustomProvider = () => {
        const newProvider: CustomProvider = {
            id: `custom_${Date.now()}`,
            name: 'مزود جديد',
            baseUrl: 'https://api.openai.com/v1',
            apiKeys: [{ key: '', status: 'active' }],
            models: []
        };
        setLocalSettings(prev => ({
            ...prev,
            customProviders: [...prev.customProviders, newProvider]
        }));
    };

    const updateCustomProvider = (index: number, field: keyof CustomProvider, value: any) => {
        const updated = [...localSettings.customProviders];
        updated[index] = { ...updated[index], [field]: value };
        setLocalSettings(prev => ({ ...prev, customProviders: updated }));
    };

    const updateCustomProviderKey = (pIndex: number, kIndex: number, value: string) => {
        const updated = [...localSettings.customProviders];
        updated[pIndex].apiKeys[kIndex].key = value;
        setLocalSettings(prev => ({ ...prev, customProviders: updated }));
    };

    const deleteCustomProvider = (index: number) => {
        const updated = [...localSettings.customProviders];
        updated.splice(index, 1);
        setLocalSettings(prev => ({ ...prev, customProviders: updated }));
    };

    // --- Custom Model Logic ---
    const addCustomModel = () => {
         const newModel: CustomModel = {
            id: '',
            name: 'نموذج جديد',
            provider: 'gemini',
            defaultTemperature: 0.7,
            description: ''
        };
        setLocalSettings(prev => ({
            ...prev,
            customModels: [...prev.customModels, newModel]
        }));
    };

    const updateCustomModel = (index: number, field: keyof CustomModel, value: any) => {
        const updated = [...localSettings.customModels];
        updated[index] = { ...updated[index], [field]: value };
        setLocalSettings(prev => ({ ...prev, customModels: updated }));
    };

    const deleteCustomModel = (index: number) => {
        const updated = [...localSettings.customModels];
        updated.splice(index, 1);
        setLocalSettings(prev => ({ ...prev, customModels: updated }));
    };

    return (
        <div 
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} 
            dir="rtl"
            onClick={handleClose}
        >
            <div 
                className={`bg-[#050505] border border-zeus-gold/20 w-full max-w-3xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden relative ${isClosing ? 'animate-scale-down' : 'animate-scale-up'}`}
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* زخرفة الخلفية */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-zeus-gold/5 rounded-full blur-3xl pointer-events-none"></div>

                {/* الهيدر */}
                <div className="p-6 border-b border-zeus-gold/10 flex justify-between items-center bg-gradient-to-l from-zeus-gold/5 to-transparent">
                    <h2 className="text-2xl font-bold text-zeus-gold flex items-center gap-3">
                        <i className="fas fa-sliders-h"></i> إعدادات زيوس
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* التبويبات */}
                <div className="flex border-b border-zeus-gold/10 px-6 bg-black/40 overflow-x-auto">
                    {[
                        {id: 'general', icon: 'fa-cog', label: 'عام'},
                        {id: 'keys', icon: 'fa-key', label: 'المفاتيح'},
                        {id: 'custom_providers', icon: 'fa-server', label: 'المزودون'},
                        {id: 'custom_models', icon: 'fa-brain', label: 'النماذج'}
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-4 text-sm font-bold transition-colors relative flex items-center gap-2 whitespace-nowrap ${
                                activeTab === tab.id ? 'text-zeus-gold' : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            <i className={`fas ${tab.icon}`}></i>
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-zeus-gold shadow-[0_0_10px_rgba(255,215,0,0.5)]"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* المحتوى */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-zeus-surface/50">
                    
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-300">المزود (Provider)</label>
                                    <select 
                                        value={localSettings.provider}
                                        onChange={(e) => setLocalSettings({...localSettings, provider: e.target.value})}
                                        className="w-full bg-black/60 border border-zeus-gold/20 rounded-lg p-3 text-white focus:border-zeus-gold focus:outline-none focus:shadow-[0_0_10px_rgba(255,215,0,0.1)] transition-all"
                                    >
                                        <option value="gemini">Google Gemini</option>
                                        <option value="openrouter">OpenRouter</option>
                                        {localSettings.customProviders.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-300">النموذج (Model)</label>
                                    <select 
                                        value={localSettings.model}
                                        onChange={(e) => setLocalSettings({...localSettings, model: e.target.value})}
                                        className="w-full bg-black/60 border border-zeus-gold/20 rounded-lg p-3 text-white focus:border-zeus-gold focus:outline-none transition-all"
                                    >
                                        {localSettings.provider === 'gemini' && AI_MODELS.gemini.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                        {localSettings.provider === 'openrouter' && AI_MODELS.openrouter.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                        {localSettings.customModels.filter(m => m.provider === localSettings.provider).map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-300 flex justify-between">
                                    <span>درجة الإبداع (Temperature)</span>
                                    <span className="text-zeus-gold">{localSettings.temperature}</span>
                                </label>
                                <input 
                                    type="range" min="0" max="1" step="0.1"
                                    value={localSettings.temperature}
                                    onChange={(e) => setLocalSettings({...localSettings, temperature: parseFloat(e.target.value)})}
                                    className="w-full accent-zeus-gold h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-300 flex justify-between">
                                    <span>حجم الخط</span>
                                    <span className="text-zeus-gold">{localSettings.fontSize}px</span>
                                </label>
                                <input 
                                    type="range" min="12" max="24" step="1"
                                    value={localSettings.fontSize}
                                    onChange={(e) => setLocalSettings({...localSettings, fontSize: parseInt(e.target.value)})}
                                    className="w-full accent-zeus-gold h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-300">تعليمات النظام (الشخصية)</label>
                                <textarea 
                                    value={localSettings.customPrompt}
                                    onChange={(e) => setLocalSettings({...localSettings, customPrompt: e.target.value})}
                                    className="w-full bg-black/60 border border-zeus-gold/20 rounded-lg p-3 text-white h-24 resize-none focus:border-zeus-gold focus:outline-none"
                                    placeholder="أنت زيوس، إله الرعد، تتحدث بحكمة وقوة..."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'keys' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Gemini Keys */}
                            <div className="space-y-3 p-4 border border-white/5 rounded-xl bg-black/20">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-gray-200 flex items-center gap-2">
                                        <i className="fab fa-google"></i> مفاتيح Gemini
                                    </label>
                                    <button onClick={() => addKey('gemini')} className="text-xs bg-zeus-gold/10 text-zeus-gold px-3 py-1.5 rounded hover:bg-zeus-gold/20 border border-zeus-gold/20 transition-colors">
                                        <i className="fas fa-plus"></i> إضافة
                                    </button>
                                </div>
                                {localSettings.geminiApiKeys.map((k, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input 
                                            type="password" 
                                            value={k.key}
                                            onChange={(e) => updateKey('gemini', i, e.target.value)}
                                            placeholder="AIzaSy..."
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-sm focus:border-zeus-gold focus:outline-none text-left ltr"
                                        />
                                        <button 
                                            onClick={() => {
                                                const newKeys = [...localSettings.geminiApiKeys];
                                                newKeys.splice(i, 1);
                                                setLocalSettings({...localSettings, geminiApiKeys: newKeys});
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* OpenRouter Keys */}
                            <div className="space-y-3 p-4 border border-white/5 rounded-xl bg-black/20">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-gray-200 flex items-center gap-2">
                                        <i className="fas fa-network-wired"></i> مفاتيح OpenRouter
                                    </label>
                                    <button onClick={() => addKey('openrouter')} className="text-xs bg-zeus-gold/10 text-zeus-gold px-3 py-1.5 rounded hover:bg-zeus-gold/20 border border-zeus-gold/20 transition-colors">
                                        <i className="fas fa-plus"></i> إضافة
                                    </button>
                                </div>
                                {localSettings.openrouterApiKeys.map((k, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input 
                                            type="password" 
                                            value={k.key}
                                            onChange={(e) => updateKey('openrouter', i, e.target.value)}
                                            placeholder="sk-or-..."
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-sm focus:border-zeus-gold focus:outline-none text-left ltr"
                                        />
                                        <button 
                                            onClick={() => {
                                                const newKeys = [...localSettings.openrouterApiKeys];
                                                newKeys.splice(i, 1);
                                                setLocalSettings({...localSettings, openrouterApiKeys: newKeys});
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'custom_providers' && (
                        <div className="space-y-6 animate-fade-in">
                            <button onClick={addCustomProvider} className="w-full py-3 bg-zeus-gold text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors shadow-lg shadow-zeus-gold/20">
                                <i className="fas fa-plus ml-2"></i> إضافة مزود جديد
                            </button>
                            
                            {localSettings.customProviders.map((provider, idx) => (
                                <div key={idx} className="p-4 border border-zeus-gold/20 rounded-xl bg-black/40 relative group">
                                    <button onClick={() => deleteCustomProvider(idx)} className="absolute top-4 left-4 text-red-500 hover:text-red-400">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-xs text-gray-400">اسم المزود</label>
                                            <input 
                                                type="text" 
                                                value={provider.name}
                                                onChange={(e) => updateCustomProvider(idx, 'name', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded p-2 text-sm focus:border-zeus-gold outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400">رابط API (Base URL)</label>
                                            <input 
                                                type="text" 
                                                value={provider.baseUrl}
                                                onChange={(e) => updateCustomProvider(idx, 'baseUrl', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded p-2 text-sm focus:border-zeus-gold outline-none text-left ltr"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400">مفتاح API</label>
                                        <input 
                                            type="password" 
                                            value={provider.apiKeys[0]?.key || ''}
                                            onChange={(e) => updateCustomProviderKey(idx, 0, e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded p-2 text-sm focus:border-zeus-gold outline-none text-left ltr"
                                            placeholder="sk-..."
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'custom_models' && (
                        <div className="space-y-6 animate-fade-in">
                             <button onClick={addCustomModel} className="w-full py-3 bg-zeus-gold/10 text-zeus-gold border border-zeus-gold/30 font-bold rounded-xl hover:bg-zeus-gold/20 transition-colors">
                                <i className="fas fa-plus ml-2"></i> إضافة نموذج مخصص
                            </button>

                            {localSettings.customModels.map((model, idx) => (
                                <div key={idx} className="p-4 border border-white/10 rounded-xl bg-black/40 relative">
                                    <button onClick={() => deleteCustomModel(idx)} className="absolute top-4 left-4 text-red-500 hover:text-red-400">
                                        <i className="fas fa-trash"></i>
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-400">اسم للعرض</label>
                                            <input 
                                                type="text" 
                                                value={model.name}
                                                onChange={(e) => updateCustomModel(idx, 'name', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded p-2 text-sm focus:border-zeus-gold outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400">معرف النموذج (Model ID)</label>
                                            <input 
                                                type="text" 
                                                value={model.id}
                                                onChange={(e) => updateCustomModel(idx, 'id', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded p-2 text-sm focus:border-zeus-gold outline-none text-left ltr"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400">المزود التابع له</label>
                                            <select 
                                                value={model.provider}
                                                onChange={(e) => updateCustomModel(idx, 'provider', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded p-2 text-sm focus:border-zeus-gold outline-none"
                                            >
                                                <option value="gemini">Gemini</option>
                                                <option value="openrouter">OpenRouter</option>
                                                {localSettings.customProviders.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* تذييل */}
                <div className="p-6 border-t border-zeus-gold/10 flex justify-end gap-4 bg-black/60">
                    <button 
                        onClick={handleClose}
                        className="px-6 py-2 rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
                    >
                        إلغاء
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-2 rounded-lg bg-zeus-gold text-black font-bold hover:bg-yellow-400 shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all hover:scale-105"
                    >
                        حفظ التغييرات
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;