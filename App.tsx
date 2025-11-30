import React, { useState, useEffect, useRef } from 'react';
import { Settings, Chat, Message, Attachment } from './types';
import { streamResponse, generateChatTitle } from './services/ai';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsModal from './components/SettingsModal';
import { DeleteModal, RenameModal } from './components/ActionModals';

const defaultSettings: Settings = {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    geminiApiKeys: [],
    openrouterApiKeys: [],
    customProviders: [],
    customModels: [],
    customPrompt: '',
    apiKeyRetryStrategy: 'sequential',
    fontSize: 18,
    thinkingBudget: 1024,
    // Default Display Settings
    collapseLongMessages: true,
    collapseTarget: 'user', // Default to User only as requested
    maxCollapseLines: 4
};

const App: React.FC = () => {
    const [chats, setChats] = useState<Record<string, Chat>>({});
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    
    // مرجع للتحكم في إيقاف التوليد
    const abortControllerRef = useRef<AbortController | null>(null);

    // Modal States
    const [activeModal, setActiveModal] = useState<'delete' | 'rename' | null>(null);
    const [modalTargetId, setModalTargetId] = useState<string | null>(null);
    const [modalTargetTitle, setModalTargetTitle] = useState<string>('');
    
    useEffect(() => {
        try {
            const loadedChats = localStorage.getItem('zeusChats');
            const loadedSettings = localStorage.getItem('zeusSettings');
            
            if (loadedChats) setChats(JSON.parse(loadedChats));
            if (loadedSettings) setSettings({ ...defaultSettings, ...JSON.parse(loadedSettings) });
        } catch (e) {
            console.error("فشل في تحميل البيانات", e);
        }
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            localStorage.setItem('zeusChats', JSON.stringify(chats));
            localStorage.setItem('zeusSettings', JSON.stringify(settings));
            if (currentChatId) localStorage.setItem('zeusCurrentChatId', currentChatId);
        }, 1000); 

        return () => clearTimeout(handler);
    }, [chats, settings, currentChatId]);

    useEffect(() => {
        document.documentElement.style.setProperty('--message-font-size', `${settings.fontSize}px`);
    }, [settings.fontSize]);

    const createNewChat = () => {
        const id = Date.now().toString();
        const newChat: Chat = {
            id,
            title: 'محادثة جديدة',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            order: Date.now()
        };
        setChats(prev => ({ ...prev, [id]: newChat }));
        setCurrentChatId(id);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const requestDeleteChat = (id: string) => {
        setModalTargetId(id);
        setActiveModal('delete');
    };

    const confirmDeleteChat = () => {
        if (modalTargetId) {
            setChats(prev => {
                const next = { ...prev };
                delete next[modalTargetId];
                return next;
            });
            if (currentChatId === modalTargetId) setCurrentChatId(null);
            setActiveModal(null);
            setModalTargetId(null);
        }
    };

    const requestRenameChat = (id: string, currentTitle: string) => {
        setModalTargetId(id);
        setModalTargetTitle(currentTitle);
        setActiveModal('rename');
    };

    const confirmRenameChat = (newTitle: string) => {
        if (modalTargetId) {
            setChats(prev => ({
                ...prev,
                [modalTargetId]: { ...prev[modalTargetId], title: newTitle, updatedAt: Date.now() }
            }));
            setActiveModal(null);
            setModalTargetId(null);
        }
    };

    const updateChatTitleAuto = (id: string, title: string) => {
        setChats(prev => ({
            ...prev,
            [id]: { ...prev[id], title, updatedAt: Date.now() }
        }));
    };

    // دالة إيقاف التوليد
    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsStreaming(false);
        }
    };

    const handleSendMessage = async (content: string, attachments: Attachment[], forceThink: boolean = false) => {
        if (!content.trim() && attachments.length === 0) return;
        
        // إلغاء أي طلب سابق إذا وجد
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        // إنشاء متحكم جديد
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        let chatId = currentChatId;
        const isNewChat = !chatId || !chats[chatId] || chats[chatId].messages.length === 0;

        if (!chatId) {
            chatId = Date.now().toString();
            const newChat: Chat = {
                id: chatId,
                title: 'محادثة جديدة',
                messages: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                order: Date.now()
            };
            setChats(prev => ({ ...prev, [chatId!]: newChat }));
            setCurrentChatId(chatId);
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content,
            attachments,
            timestamp: Date.now()
        };

        setChats(prev => {
            const chat = prev[chatId!];
            return {
                ...prev,
                [chatId!]: {
                    ...chat,
                    messages: [...chat.messages, userMsg],
                    updatedAt: Date.now(),
                    order: Date.now()
                }
            };
        });

        if (isNewChat && content.trim()) {
            generateChatTitle(content, settings)
                .then(title => {
                    if (title) updateChatTitleAuto(chatId!, title);
                })
                .catch(err => console.error("Error generating title", err));
        }

        setIsStreaming(true);

        const assistantMsgId = (Date.now() + 1).toString();
        
        setChats(prev => {
            const chat = prev[chatId!];
            return {
                ...prev,
                [chatId!]: {
                    ...chat,
                    messages: [
                        ...chat.messages, 
                        {
                            id: assistantMsgId,
                            role: 'assistant',
                            content: '', 
                            timestamp: Date.now()
                        }
                    ]
                }
            };
        });

        try {
            const chat = chats[chatId!] || { messages: [] };
            const history = [...chat.messages, userMsg]; 

            let streamedContent = '';
            
            const runSettings = {
                ...settings,
                thinkingBudget: forceThink ? settings.thinkingBudget : 0
            };
            
            await streamResponse(
                history, 
                runSettings, 
                (chunk) => {
                    streamedContent += chunk;
                    
                    setChats(prev => {
                        const currentChat = prev[chatId!];
                        if (!currentChat) return prev;
                        
                        const msgs = [...currentChat.messages];
                        const lastMsgIndex = msgs.findIndex(m => m.id === assistantMsgId);
                        
                        if (lastMsgIndex !== -1) {
                            msgs[lastMsgIndex] = {
                                ...msgs[lastMsgIndex],
                                content: streamedContent
                            };
                        }
                        
                        return {
                            ...prev,
                            [chatId!]: { ...currentChat, messages: msgs }
                        };
                    });
                },
                abortController.signal // تمرير إشارة الإيقاف
            );

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Generation stopped by user');
            } else {
                setChats(prev => {
                    const currentChat = prev[chatId!];
                    const msgs = [...currentChat.messages];
                    const lastMsgIndex = msgs.findIndex(m => m.id === assistantMsgId);
                    
                    if (lastMsgIndex !== -1) {
                        msgs[lastMsgIndex] = {
                            ...msgs[lastMsgIndex],
                            content: msgs[lastMsgIndex].content + `\n\n⚠️ خطأ: ${error.message || 'حدث خطأ غير متوقع.'}`
                        };
                    }

                    return {
                        ...prev,
                        [chatId!]: { ...currentChat, messages: msgs }
                    };
                });
            }
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const handleReorder = (newChatsOrder: Chat[]) => {
        const newChatsMap: Record<string, Chat> = {};
        newChatsOrder.forEach((chat, index) => {
            chat.order = newChatsOrder.length - index;
            newChatsMap[chat.id] = chat;
        });
        setChats(newChatsMap);
    };

    return (
        <div className="relative flex flex-col h-[100dvh] w-full bg-zeus-base text-white font-sans overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" dir="rtl">
            
            {isSidebarOpen && (
                <div 
                    className="absolute inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="flex flex-1 overflow-hidden relative">
                <div className={`
                    absolute md:relative z-30 h-full transition-all duration-300 ease-in-out
                    ${isSidebarOpen ? 'translate-x-0 w-80' : 'translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden'}
                    right-0 border-l border-white/10 bg-zeus-surface shadow-xl
                    pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:pt-0 md:pb-0
                `}>
                    <Sidebar 
                        chats={chats}
                        currentChatId={currentChatId}
                        onSelectChat={(id) => {
                            setCurrentChatId(id);
                            if (window.innerWidth < 768) setIsSidebarOpen(false);
                        }}
                        onNewChat={createNewChat}
                        onRequestDelete={requestDeleteChat}
                        onRequestRename={requestRenameChat}
                        onClose={() => setIsSidebarOpen(false)}
                        onReorder={handleReorder}
                    />
                </div>

                <div className="flex-1 flex flex-col z-10 relative h-full max-w-full bg-black">
                    <header className="flex items-center justify-between p-4 border-b border-white/10 bg-zeus-surface shrink-0 relative z-50">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="p-2 text-zeus-gold hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <i className="fas fa-bars"></i>
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full border border-zeus-gold bg-black flex items-center justify-center text-zeus-gold font-bold animate-pulse-fast">
                                    <i className="fas fa-bolt"></i>
                                </div>
                                <div>
                                    <h1 className="font-bold text-lg text-white">
                                        زيوس <span className="text-xs font-normal text-gray-400">إله الرعد</span>
                                    </h1>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="hidden md:inline-block text-xs text-zeus-gold bg-zeus-gold/10 px-3 py-1 rounded-full border border-zeus-gold/20">
                                {settings.model}
                            </span>
                            <button 
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title="الإعدادات"
                            >
                                <i className="fas fa-cog fa-lg"></i>
                            </button>
                        </div>
                    </header>

                    <ChatWindow 
                        chat={currentChatId ? chats[currentChatId] : null}
                        onSendMessage={handleSendMessage}
                        isStreaming={isStreaming}
                        onNewChat={createNewChat} 
                        onStop={handleStopGeneration} 
                        settings={settings} // Pass settings to ChatWindow
                    />
                </div>
            </div>

            {isSettingsOpen && (
                <SettingsModal 
                    settings={settings}
                    onSave={setSettings}
                    onClose={() => setIsSettingsOpen(false)}
                />
            )}

            <DeleteModal 
                isOpen={activeModal === 'delete'} 
                chatTitle={modalTargetId ? chats[modalTargetId]?.title : ''}
                onClose={() => setActiveModal(null)}
                onConfirm={confirmDeleteChat}
            />

            <RenameModal
                isOpen={activeModal === 'rename'}
                initialTitle={modalTargetTitle}
                onClose={() => setActiveModal(null)}
                onRename={confirmRenameChat}
            />
        </div>
    );
};

export default App;