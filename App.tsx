import React, { useState, useEffect, useRef } from 'react';
import { Settings, Chat, Message, Attachment } from './types';
import { streamResponse, generateChatTitle } from './services/ai';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsModal from './components/SettingsModal';
import { DeleteModal, RenameModal, DuplicateModal } from './components/ActionModals';

// استيراد أدوات فايربيس (من الملف المجاور)
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
    // حالة المستخدم (هل هو مسجل دخول أم لا)
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    const [chats, setChats] = useState<Record<string, Chat>>({});
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    
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

    // 2. تحميل المحادثات من فايربيس (فقط عند تسجيل الدخول)
    useEffect(() => {
        if (!user) {
            setChats({});
            setCurrentChatId(null);
            return;
        }

        // مسار البيانات: users -> [USER_ID] -> chats
        const chatsRef = collection(db, 'users', user.uid, 'chats');
        const q = query(chatsRef, orderBy('updatedAt', 'desc')); // ترتيب حسب الأحدث

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedChats: Record<string, Chat> = {};
            snapshot.docs.forEach(doc => {
                loadedChats[doc.id] = doc.data() as Chat;
            });
            setChats(loadedChats);
        });

        return () => unsubscribe();
    }, [user]);

    // تحميل الإعدادات من LocalStorage (الإعدادات تبقى محلية لكل جهاز لسهولة الاستخدام)
    useEffect(() => {
        try {
            const loadedSettings = localStorage.getItem('zeusSettings');
            if (loadedSettings) setSettings({ ...defaultSettings, ...JSON.parse(loadedSettings) });
        } catch (e) {
            console.error("فشل في تحميل الإعدادات", e);
        }
    }, []);

    // حفظ الإعدادات عند التغيير
    useEffect(() => {
        const handler = setTimeout(() => {
            localStorage.setItem('zeusSettings', JSON.stringify(settings));
        }, 1000); 
        return () => clearTimeout(handler);
    }, [settings]);

    useEffect(() => {
        document.documentElement.style.setProperty('--message-font-size', `${settings.fontSize}px`);
    }, [settings.fontSize]);


    // --- دوال التعامل مع فايربيس ---

    const saveChatToFirebase = async (chat: Chat) => {
        if (!user) return;
        try {
            const chatRef = doc(db, 'users', user.uid, 'chats', chat.id);
            await setDoc(chatRef, chat, { merge: true });
        } catch (e) {
            console.error("Error saving chat:", e);
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


    // --- دوال التطبيق الأساسية (معدلة لتعمل مع فايربيس) ---

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
        
        // حفظ فوري في فايربيس
        await saveChatToFirebase(newChat);
        
        setCurrentChatId(id);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const requestDeleteChat = (id: string) => {
        setModalTargetId(id);
        setActiveModal('delete');
    };

    const confirmDeleteChat = async () => {
        if (modalTargetId) {
            await deleteChatFromFirebase(modalTargetId); // حذف من السحابة
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
        if (modalTargetId && chats[modalTargetId]) {
            const updatedChat = { 
                ...chats[modalTargetId], 
                title: newTitle, 
                updatedAt: Date.now() 
            };
            await saveChatToFirebase(updatedChat); // تحديث في السحابة
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

            await saveChatToFirebase(newChat); // حفظ النسخة في السحابة
            setActiveModal(null);
            setModalTargetId(null);
        }
    };

    const updateChatTitleAuto = async (id: string, title: string) => {
        if (chats[id]) {
            const updatedChat = { ...chats[id], title, updatedAt: Date.now() };
            await saveChatToFirebase(updatedChat);
        }
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
        
        // إنشاء محادثة جديدة إذا لم تكن موجودة
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
            // سنستخدم التحديث المحلي المؤقت للشعور بالسرعة، لكن الاعتماد الأساسي على الـ Snapshot
            setChats(prev => ({ ...prev, [chatId!]: newChat })); 
            setCurrentChatId(chatId);
            await saveChatToFirebase(newChat); // الحفظ الأول
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content,
            attachments,
            timestamp: Date.now()
        };

        // تحديث محلي سريع + حفظ في السحابة
        let currentChatObj = chats[chatId!] || { messages: [] };
        let updatedMessages = [...currentChatObj.messages, userMsg];
        
        // تحديث الواجهة فوراً
        setChats(prev => ({
            ...prev,
            [chatId!]: { ...prev[chatId!], messages: updatedMessages, updatedAt: Date.now() }
        }));
        
        // توليد العنوان
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

        // إضافة رسالة المساعد الفارغة
        updatedMessages = [...updatedMessages, assistantMsgPlaceholder];
        
        setChats(prev => ({
            ...prev,
            [chatId!]: { ...prev[chatId!], messages: updatedMessages }
        }));

        try {
            let streamedContent = '';
            
            const runSettings = {
                ...settings,
                thinkingBudget: forceThink ? settings.thinkingBudget : 0
            };
            
            await streamResponse(
                updatedMessages.slice(0, -1), // إرسال التاريخ بدون رسالة المساعد الفارغة الحالية
                runSettings, 
                (chunk) => {
                    streamedContent += chunk;
                    
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
                },
                abortController.signal
            );

            // بعد اكتمال الرد، نحفظ المحادثة كاملة في فايربيس مرة واحدة
            const finalChatState = {
                ...chats[chatId!], // قد تكون تغيرت (مثل العنوان) لذا نأخذ الأحدث
                id: chatId!,
                messages: updatedMessages.map(m => 
                    m.id === assistantMsgId ? { ...m, content: streamedContent } : m
                ),
                updatedAt: Date.now()
            };
            
            await saveChatToFirebase(finalChatState);

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                const errorMsg = `\n\n⚠️ خطأ: ${error.message || 'حدث خطأ غير متوقع.'}`;
                
                // تحديث الواجهة بالخطأ
                setChats(prev => {
                    const chat = prev[chatId!];
                    const newMsgs = [...chat.messages];
                    const lastIdx = newMsgs.findIndex(m => m.id === assistantMsgId);
                    if (lastIdx !== -1) {
                         newMsgs[lastIdx].content += errorMsg;
                    }
                    return { ...prev, [chatId!]: { ...chat, messages: newMsgs } };
                });
            }
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const handleReorder = (newChatsOrder: Chat[]) => {
        // في فايربيس الترتيب يعتمد على createdAt أو order
        // هنا نقوم بتحديث حقل order لكل محادثة في السحابة
        newChatsOrder.forEach((chat, index) => {
            const newOrder = newChatsOrder.length - index;
            updateDoc(doc(db, 'users', user!.uid, 'chats', chat.id), { order: newOrder });
        });
    };

    // واجهة تسجيل الدخول إذا لم يكن المستخدم مسجلاً
    if (isAuthLoading) {
        return <div className="h-screen w-full bg-black flex items-center justify-center text-zeus-gold">جارٍ التحميل...</div>;
    }

    if (!user) {
        return (
            <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white relative overflow-hidden" dir="rtl">
                <div className="absolute inset-0 bg-zeus-gold/5 animate-pulse"></div>
                
                <div className="z-10 bg-zeus-surface p-10 rounded-3xl border border-zeus-gold/20 shadow-[0_0_50px_rgba(255,215,0,0.1)] text-center max-w-md w-full mx-4">
                    <div className="w-24 h-24 rounded-full bg-black border-2 border-zeus-gold mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.3)] animate-float">
                        <i className="fas fa-bolt text-5xl text-zeus-gold"></i>
                    </div>
                    
                    <h1 className="text-3xl font-bold mb-2">مرحباً بك في زيوس</h1>
                    <p className="text-gray-400 mb-8">سجل الدخول لحفظ محادثاتك والوصول إليها من أي مكان.</p>
                    
                    <button 
                        onClick={signInWithGoogle}
                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3 shadow-lg"
                    >
                        <i className="fab fa-google text-xl"></i>
                        تسجيل الدخول باستخدام Google
                    </button>

                    <p className="mt-6 text-xs text-gray-600 font-mono">
                        Powered by Google Gemini & Firebase
                    </p>
                </div>
            </div>
        );
    }

    // واجهة التطبيق الرئيسية (للمستخدم المسجل)
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
                            {/* معلومات المستخدم */}
                            <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-full border border-white/5">
                                <img src={user.photoURL || ''} alt="User" className="w-6 h-6 rounded-full" />
                                <span className="text-xs max-w-[100px] truncate hidden md:block">{user.displayName}</span>
                            </div>

                            <button 
                                onClick={logout}
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