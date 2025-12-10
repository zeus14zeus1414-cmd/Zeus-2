import React, { useState, useEffect, useRef } from 'react';
import { Settings, Chat, Message, Attachment } from './types';
import { streamResponse, generateChatTitle } from './services/ai';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsModal from './components/SettingsModal';
import LoginScreen from './components/LoginScreen'; // استيراد شاشة تسجيل الدخول الجديدة
import LogoutModal from './components/LogoutModal'; // استيراد مودال تسجيل الخروج
import { DeleteModal, RenameModal, DuplicateModal } from './components/ActionModals';

// استيراد أدوات فايربيس
import { 
    auth, 
    db, 
    signInWithGoogle, 
    logout, 
    onAuthStateChanged,
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy
} from './firebase';
import { User } from 'firebase/auth';

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
    collapseLongMessages: true,
    collapseTarget: 'user',
    maxCollapseLines: 4
};

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [chats, setChats] = useState<Record<string, Chat>>({});
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
    
    // حالة مودال تسجيل الخروج
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    
    const abortControllerRef = useRef<AbortController | null>(null);

    const [activeModal, setActiveModal] = useState<'delete' | 'rename' | 'duplicate' | null>(null);
    const [modalTargetId, setModalTargetId] = useState<string | null>(null);
    const [modalTargetTitle, setModalTargetTitle] = useState<string>('');

    // 1. مراقبة حالة تسجيل الدخول
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. تحميل المحادثات
    useEffect(() => {
        if (!user) {
            setChats({});
            setCurrentChatId(null);
            return;
        }

        const chatsRef = collection(db, 'users', user.uid, 'chats');
        const q = query(chatsRef, orderBy('updatedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedChats: Record<string, Chat> = {};
            snapshot.docs.forEach(doc => {
                loadedChats[doc.id] = doc.data() as Chat;
            });
            
            // حماية ضد الوميض: نحتفظ بالنسخة المحلية إذا كانت أحدث (بسبب الستريمنج)
            setChats(prev => {
                if (isStreaming && currentChatId && loadedChats[currentChatId] && prev[currentChatId]) {
                    const serverChat = loadedChats[currentChatId];
                    const localChat = prev[currentChatId];
                    
                    // إذا كان لدينا رسائل محلياً أكثر أو نص أطول، نتجاهل تحديث السيرفر القديم مؤقتاً
                    const localLen = localChat.messages[localChat.messages.length - 1]?.content.length || 0;
                    const serverLen = serverChat.messages[serverChat.messages.length - 1]?.content.length || 0;

                    if (localChat.messages.length >= serverChat.messages.length && localLen > serverLen) {
                        return { ...loadedChats, [currentChatId]: localChat };
                    }
                }
                return loadedChats;
            });
        });

        return () => unsubscribe();
    }, [user, isStreaming, currentChatId]);

    // 3. تحميل الإعدادات
    useEffect(() => {
        if (!user) return;
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'general');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const savedSettings = docSnap.data() as Settings;
                setSettings(prev => ({ ...defaultSettings, ...savedSettings }));
            }
            setIsSettingsLoaded(true);
        });
        return () => unsubscribe();
    }, [user]);

    // 4. حفظ الإعدادات
    useEffect(() => {
        if (!user || !isSettingsLoaded) return;
        const handler = setTimeout(async () => {
            try {
                const settingsRef = doc(db, 'users', user.uid, 'settings', 'general');
                await setDoc(settingsRef, settings, { merge: true });
            } catch (e) {
                console.error("Error saving settings:", e);
            }
        }, 1000);
        return () => clearTimeout(handler);
    }, [settings, user, isSettingsLoaded]);

    useEffect(() => {
        document.documentElement.style.setProperty('--message-font-size', `${settings.fontSize}px`);
    }, [settings.fontSize]);

    // --- دوال فايربيس ---

    const createChatInFirebase = async (chat: Chat) => {
        if (!user) return;
        try {
            const chatRef = doc(db, 'users', user.uid, 'chats', chat.id);
            await setDoc(chatRef, chat);
        } catch (e) {
            console.error("Error creating chat:", e);
        }
    };

    const updateChatFields = async (chatId: string, fields: Partial<Chat>) => {
        if (!user) return;
        try {
            const chatRef = doc(db, 'users', user.uid, 'chats', chatId);
            await updateDoc(chatRef, fields);
        } catch (e) {
            console.error("Error updating chat fields:", e);
        }
    };

    const deleteChatFromFirebase = async (chatId: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'chats', chatId));
        } catch (e) {
            console.error("Error deleting chat:", e);
        }
    };

    // --- دوال التطبيق ---

    const createNewChat = async () => {
        if (!user) return;
        const id = Date.now().toString();
        const newChat: Chat = {
            id,
            title: 'محادثة جديدة',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            order: Date.now()
        };
        
        await createChatInFirebase(newChat);
        setCurrentChatId(id);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const requestDeleteChat = (id: string) => {
        setModalTargetId(id);
        setActiveModal('delete');
    };

    const confirmDeleteChat = async () => {
        if (modalTargetId) {
            await deleteChatFromFirebase(modalTargetId);
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

    const confirmRenameChat = async (newTitle: string) => {
        if (modalTargetId) {
            await updateChatFields(modalTargetId, { 
                title: newTitle, 
                updatedAt: Date.now() 
            });
            setActiveModal(null);
            setModalTargetId(null);
        }
    };

    const requestDuplicateChat = (id: string) => {
        setModalTargetId(id);
        setActiveModal('duplicate');
    };

    const confirmDuplicateChat = async () => {
        if (modalTargetId && chats[modalTargetId]) {
            const originalChat = chats[modalTargetId];
            const newId = Date.now().toString();
            
            let baseTitle = originalChat.title;
            const match = baseTitle.match(/^(.*?)(\d+)$/);
            let namePart = baseTitle;
            let numberPart = 2;

            if (match) {
                namePart = match[1].trim();
                numberPart = parseInt(match[2]) + 1;
            }

            let newTitle = `${namePart} ${numberPart}`;
            while (Object.values(chats).some((c: Chat) => c.title === newTitle)) {
                numberPart++;
                newTitle = `${namePart} ${numberPart}`;
            }

            const newChat: Chat = {
                ...originalChat,
                id: newId,
                title: newTitle,
                messages: JSON.parse(JSON.stringify(originalChat.messages)),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                order: Date.now()
            };

            await createChatInFirebase(newChat);
            setActiveModal(null);
            setModalTargetId(null);
        }
    };

    const updateChatTitleAuto = async (id: string, title: string) => {
        await updateChatFields(id, { title });
    };

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsStreaming(false);
        }
    };

    const handleSendMessage = async (content: string, attachments: Attachment[], forceThink: boolean = false) => {
        if ((!content.trim() && attachments.length === 0) || !user) return;
        
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        let chatId = currentChatId;
        
        if (!chatId || !chats[chatId]) {
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
            await createChatInFirebase(newChat);
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content,
            attachments,
            timestamp: Date.now()
        };

        // إضافة رسالة المستخدم
        let currentChatObj = chats[chatId!] || { messages: [] };
        let updatedMessages = [...currentChatObj.messages, userMsg];
        
        setChats(prev => ({
            ...prev,
            [chatId!]: { ...prev[chatId!], messages: updatedMessages, updatedAt: Date.now() }
        }));

        // حفظ رسالة المستخدم فوراً
        await updateChatFields(chatId!, { 
            messages: updatedMessages, 
            updatedAt: Date.now() 
        });
        
        if (updatedMessages.length === 1 && content.trim()) {
            generateChatTitle(content, settings)
                .then(title => {
                    if (title) updateChatTitleAuto(chatId!, title);
                })
                .catch(err => console.error("Error generating title", err));
        }

        setIsStreaming(true);

        const assistantMsgId = (Date.now() + 1).toString();
        const assistantMsgPlaceholder: Message = {
            id: assistantMsgId,
            role: 'assistant',
            content: '', 
            timestamp: Date.now()
        };

        let messagesWithAssistant = [...updatedMessages, assistantMsgPlaceholder];
        
        setChats(prev => ({
            ...prev,
            [chatId!]: { ...prev[chatId!], messages: messagesWithAssistant }
        }));

        // حفظ الـ Placeholder فوراً
        await updateChatFields(chatId!, { messages: messagesWithAssistant });

        try {
            let streamedContent = '';
            let lastSaveTime = 0; 
            
            const runSettings = {
                ...settings,
                thinkingBudget: forceThink ? settings.thinkingBudget : 0
            };
            
            await streamResponse(
                updatedMessages, 
                runSettings, 
                (chunk) => {
                    streamedContent += chunk;
                    
                    // 1. تحديث الواجهة فوراً (سريع)
                    setChats(prev => {
                        const chat = prev[chatId!];
                        if (!chat) return prev;
                        
                        const newMsgs = [...chat.messages];
                        const lastIdx = newMsgs.findIndex(m => m.id === assistantMsgId);
                        if (lastIdx !== -1) {
                            newMsgs[lastIdx] = { ...newMsgs[lastIdx], content: streamedContent };
                        }
                        return { ...prev, [chatId!]: { ...chat, messages: newMsgs } };
                    });

                    // 2. الحفظ الدوري في السيرفر (كل 3 ثوانٍ)
                    const now = Date.now();
                    if (now - lastSaveTime > 3000) { 
                        lastSaveTime = now;
                        
                        const currentMessagesToSave = messagesWithAssistant.map(m => 
                            m.id === assistantMsgId ? { ...m, content: streamedContent } : m
                        );
                        
                        updateChatFields(chatId!, { 
                            messages: currentMessagesToSave,
                            updatedAt: Date.now() 
                        }).catch(err => console.warn("Background save failed:", err));
                    }
                },
                abortController.signal
            );

            // 3. الحفظ النهائي الأكيد عند الانتهاء
            const finalMessages = messagesWithAssistant.map(m => 
                m.id === assistantMsgId ? { ...m, content: streamedContent } : m
            );

            await updateChatFields(chatId!, {
                messages: finalMessages,
                updatedAt: Date.now()
            });

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                const errorMsg = `\n\n⚠️ خطأ: ${error.message || 'حدث خطأ غير متوقع.'}`;
                
                setChats(prev => {
                    const chat = prev[chatId!];
                    const newMsgs = [...chat.messages];
                    const lastIdx = newMsgs.findIndex(m => m.id === assistantMsgId);
                    if (lastIdx !== -1) {
                         newMsgs[lastIdx].content += errorMsg;
                    }
                    return { ...prev, [chatId!]: { ...chat, messages: newMsgs } };
                });

                // حفظ رسالة الخطأ
                const errorMessages = messagesWithAssistant.map(m => 
                    m.id === assistantMsgId ? { ...m, content: m.content + errorMsg } : m
                );
                await updateChatFields(chatId!, { messages: errorMessages });
            }
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const handleReorder = (newChatsOrder: Chat[]) => {
        newChatsOrder.forEach((chat, index) => {
            const newOrder = newChatsOrder.length - index;
            updateChatFields(chat.id, { order: newOrder });
        });
    };

    // معالجة تسجيل الخروج
    const handleLogoutConfirm = async () => {
        await logout();
        setIsLogoutModalOpen(false);
        setUser(null); // إعادة تعيين حالة المستخدم محلياً لضمان الانتقال السريع لشاشة الدخول
    };

    if (isAuthLoading) {
        return <div className="h-screen w-full bg-black flex items-center justify-center text-zeus-gold">جارٍ التحميل...</div>;
    }

    if (!user) {
        // تم استبدال الكود القديم بمكون LoginScreen
        return <LoginScreen onSignIn={signInWithGoogle} />;
    }

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
                        onRequestDuplicate={requestDuplicateChat}
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
                            <div 
                                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity select-none"
                                onClick={() => setCurrentChatId(null)}
                            >
                                <div className="w-8 h-8 rounded-full border border-zeus-gold bg-black flex items-center justify-center text-zeus-gold font-bold">
                                    <i className="fas fa-bolt"></i>
                                </div>
                                <div>
                                    <h1 className="font-bold text-lg text-white hidden md:block">
                                        زيوس <span className="text-xs font-normal text-gray-400">إله الرعد</span>
                                    </h1>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-full border border-white/5">
                                <img src={user.photoURL || ''} alt="User" className="w-6 h-6 rounded-full" />
                                <span className="text-xs max-w-[100px] truncate hidden md:block">{user.displayName}</span>
                            </div>

                            <button 
                                onClick={() => setIsLogoutModalOpen(true)} // فتح مودال الخروج بدلاً من الخروج المباشر
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="تسجيل الخروج"
                            >
                                <i className="fas fa-sign-out-alt"></i>
                            </button>

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
                        settings={settings}
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

            {/* مودال تسجيل الخروج */}
            <LogoutModal 
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogoutConfirm}
            />

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
            
            <DuplicateModal
                isOpen={activeModal === 'duplicate'}
                chatTitle={modalTargetId ? chats[modalTargetId]?.title : ''}
                onClose={() => setActiveModal(null)}
                onConfirm={confirmDuplicateChat}
            />
        </div>
    );
};

export default App;
