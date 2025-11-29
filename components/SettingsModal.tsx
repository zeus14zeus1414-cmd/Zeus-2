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
    
    // حالة للإضافة المتعددة للمفاتيح
    const [bulkAddTarget, setBulkAddTarget] = useState<string | null>(null);
    const [bulkText, setBulkText] = useState('');

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

    // --- Unified Key Management Logic ---

    // الحصول على المفاتيح بناءً على معرف المزود
    const getProviderKeys = (providerId: string): ApiKey[] => {
        if (providerId === 'gemini') return localSettings.geminiApiKeys;
        if (providerId === 'openrouter') return localSettings.openrouterApiKeys;
        const custom = localSettings.customProviders.find(p => p.id === providerId);
        return custom ? custom.apiKeys : [];
    };

    // تحديث المفاتيح لمزود معين
    const updateProviderKeys = (providerId: string, newKeys: ApiKey[]) => {
        if (providerId === 'gemini') {
            setLocalSettings(prev => ({ ...prev, geminiApiKeys: newKeys }));
        } else if (providerId === 'openrouter') {
            setLocalSettings(prev => ({ ...prev, openrouterApiKeys: newKeys }));
        } else {
            setLocalSettings(prev => ({
                ...prev,
                customProviders: prev.customProviders.map(p => 
                    p.id === providerId ? { ...p, apiKeys: newKeys } : p
                )
            }));
        }
    };

    const addSingleKey = (providerId: string) => {
        const currentKeys = getProviderKeys(providerId);
        updateProviderKeys(providerId, [...currentKeys, { key: '', status: 'active' }]);
    };

    const handleBulkAddSubmit = (providerId: string) => {
        if (!bulkText.trim()) {
            setBulkAddTarget(null);
            return;
        }

        // تقسيم النص إلى أسطر وتنظيف الفراغات
        const newKeysRaw = bulkText.split('\n').map(k => k.trim()).filter(k => k.length > 0);
        const newApiKeys: ApiKey[] = newKeysRaw.map(k => ({ key: k, status: 'active' }));
        
        const currentKeys = getProviderKeys(providerId);
        updateProviderKeys(providerId, [...currentKeys, ...newApiKeys]);
        
        setBulkText('');
        setBulkAddTarget(null);
    };

    const deleteKey = (providerId: string, index: number) => {
        const currentKeys = [...getProviderKeys(providerId)];
        currentKeys.splice(index, 1);
        updateProviderKeys(providerId, currentKeys);
    };

    const updateKeyValue = (providerId: string, index: number, value: string) => {
        const currentKeys = [...getProviderKeys(providerId)];
        currentKeys[index].key = value;
        updateProviderKeys(providerId, currentKeys);
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

    // Helper to render key section
    const renderKeySection = (id: string, name: string, icon: string) => {
        const keys = getProviderKeys(id);
        const isBulkMode = bulkAddTarget === id;

        return (
            <div className="space-y-3 p-4 border border-white/5 rounded-xl bg-black/20" key={id}>
                <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-200 flex items-center gap-2">
                        <i className={`fas ${icon}`}></i> مفاتيح {name}
                    </label>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => {
                                if (isBulkMode) {
                                    setBulkAddTarget(null);
                                    setBulkText('');
                                } else {
                                    setBulkAddTarget(id);
                                }
                            }} 
                            className={`text-xs px-3 py-1.5 rounded border transition-colors ${isBulkMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'}`}
                        >
                            <i className={`fas ${isBulkMode ? 'fa-times' : 'fa-list'}`}></i> {isBulkMode ? 'إلغاء' : 'إضافة متعددة'}
                        </button>
                        {!isBulkMode && (
                            <button onClick={() => addSingleKey(id)} className="text-xs bg-zeus-gold/10 text-zeus-gold px-3 py-1.5 rounded hover:bg-zeus-gold/20 border border-zeus-gold/20 transition-colors">
                                <i className="fas fa-plus"></i> إضافة
                            </button>
                        )}
                    </div>
                </div>

                {isBulkMode ? (
                    <div className="animate-fade-in space-y-2">
                        <textarea
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            placeholder={`ضع المفاتيح هنا..\nمفتاح 1\nمفتاح 2\nمفتاح 3`}
                            className="w-full h-32 bg-black/40 border border-zeus-gold/30 rounded-lg p-3 text-sm focus:border-zeus-gold focus:outline-none text-left ltr font-mono resize-none"
                        />
                        <button 
                            onClick={() => handleBulkAddSubmit(id)}
                            className="w-full py-2 bg-zeus-gold text-black font-bold rounded-lg hover:bg-yellow-400"
                        >
                            تأكيد وإضافة
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {keys.length === 0 && <p className="text-xs text-gray-500 text-center py-2">لا يوجد مفاتيح مضافة.</p>}
                        {keys.map((k, i) => (
                            <div key={i} className="flex gap-2">
                                <input 
                                    type="password" 
                                    value={k.key}
                                    onChange={(e) => updateKeyValue(id, i, e.target.value)}
                                    placeholder={`${name} API Key...`}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-sm focus:border-zeus-gold focus:outline-none text-left ltr font-mono"
                                />
                                <button 
                                    onClick={() => deleteKey(id, i)}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/20 transition-all"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
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

                            <div className="space-y-2 border-t border-white/5 pt-4">
                                <label className="text-sm font-bold text-gray-300 flex justify-between items-center mb-1">
                                    <span className="flex items-center gap-2">
                                        <i className="fas fa-brain text-zeus-gold"></i>
                                        ميزانية التفكير (Thinking Budget)
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded border ${localSettings.thinkingBudget > 0 ? 'bg-zeus-gold/10 text-zeus-gold border-zeus-gold/30' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                                        {localSettings.thinkingBudget} Tokens
                                    </span>
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    يحدد هذا الرقم عمق التفكير عند تفعيل زر "المخ" (Deep Think) في المحادثة. كلما زاد الرقم، زاد عمق التفكير.
                                </p>
                                <input 
                                    type="range" min="0" max="64000" step="1024"
                                    value={localSettings.thinkingBudget || 0}
                                    onChange={(e) => setLocalSettings({...localSettings, thinkingBudget: parseInt(e.target.value)})}
                                    className="w-full accent-zeus-gold h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-gray-600 font-mono mt-1">
                                    <span>0</span>
                                    <span>16k</span>
                                    <span>32k</span>
                                    <span>48k</span>
                                    <span>64k</span>
                                </div>
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
                            {renderKeySection('gemini', 'Gemini', 'fa-google')}
                            {renderKeySection('openrouter', 'OpenRouter', 'fa-network-wired')}
                            
                            {/* عرض المزودين المخصصين أيضاً في قائمة المفاتيح */}
                            {localSettings.customProviders.map(provider => (
                                renderKeySection(provider.id, provider.name, 'fa-server')
                            ))}
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
                                    
                                    {/* تم نقل إدارة المفاتيح إلى تبويب المفاتيح، لكن يمكن إبقاء المفتاح الأول هنا للتسهيل */}
                                    <div className="space-y-2 opacity-50">
                                        <label className="text-xs text-gray-400">لإدارة المفاتيح، انتقل لتبويب "المفاتيح"</label>
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