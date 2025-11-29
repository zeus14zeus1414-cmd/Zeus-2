import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { Chat, Attachment, Message } from '../types';
import { marked } from 'marked';
import hljs from 'highlight.js';

interface Props {
    chat: Chat | null;
    onSendMessage: (text: string, files: Attachment[]) => void;
    isStreaming: boolean;
    onNewChat: () => void;
}

// إعدادات الحد الأقصى للعرض والتحميل
const MAX_COLLAPSED_LENGTH = 350; // عدد الحروف للطي
const MAX_COLLAPSED_LINES = 6;    // عدد الأسطر للطي
const MESSAGES_BATCH_SIZE = 50;   // عدد الرسائل التي يتم تحميلها في كل دفعة

// --- مكون الرسالة المنفصل (تحسين الأداء) ---
const MessageItem = React.memo(({ msg, isLast, isStreaming }: { msg: Message, isLast: boolean, isStreaming: boolean }) => {
    const isUser = msg.role === 'user';
    const [isExpanded, setIsExpanded] = useState(false);
    
    // حساب ما إذا كانت الرسالة طويلة جداً وتستحق الطي
    const shouldCollapse = useMemo(() => {
        if (isLast && isStreaming && !isUser) return false;

        const content = msg.content || '';
        const lines = content.split('\n').length;
        
        return content.length > MAX_COLLAPSED_LENGTH || lines > MAX_COLLAPSED_LINES;
    }, [msg.content, isLast, isStreaming, isUser]);

    const htmlContent = useMemo(() => {
        let content = msg.content || ' ';
        
        if (shouldCollapse && !isExpanded) {
            const snippet = content.slice(0, MAX_COLLAPSED_LENGTH);
            return marked.parse(snippet + '...') as string;
        }

        if (!isUser && isLast && isStreaming) {
            content += ' <span class="zeus-cursor-inline"></span>';
        }
        
        return marked.parse(content) as string;
    }, [msg.content, isLast, isStreaming, isUser, shouldCollapse, isExpanded]);

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group animate-fade-in`}>
            <div className={`
                w-fit max-w-[95%] md:max-w-[85%] rounded-2xl p-4 md:p-5 relative transition-all duration-300 flex flex-col min-w-[50px]
                ${isUser 
                    ? 'bg-gradient-to-br from-zeus-surface to-gray-900 border border-zeus-gold/20 text-white rounded-tl-sm' 
                    : 'bg-black/60 border border-zeus-gold/30 text-gray-100 rounded-tr-sm shadow-[0_0_20px_rgba(255,215,0,0.05)]'
                }
            `}>
                <div className="text-xs mb-3 opacity-70 flex items-center gap-2 border-b border-white/5 pb-2">
                    <i className={`fas ${isUser ? 'fa-user text-blue-400' : 'fa-bolt text-zeus-gold'}`}></i>
                    <span className="font-bold text-zeus-goldDim">{isUser ? 'أنت' : 'زيوس'}</span>
                </div>

                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 justify-end">
                        {msg.attachments.map((att, i) => (
                            <div key={i} className="bg-black/60 rounded-lg p-2 flex items-center gap-2 border border-zeus-gold/20 hover:border-zeus-gold/50 transition-colors max-w-full">
                                {att.dataType === 'image' ? (
                                        <div className="w-20 h-20 rounded overflow-hidden relative group/img cursor-pointer">
                                            <img src={`data:${att.mimeType};base64,${att.content}`} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" alt={att.name} />
                                        </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm text-zeus-electric overflow-hidden">
                                        <i className="fas fa-file-code flex-shrink-0"></i>
                                        <span className="truncate" dir="ltr">{att.name}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div 
                    className={`markdown-body leading-relaxed min-w-0 break-words ${shouldCollapse && !isExpanded ? 'mask-bottom' : ''}`}
                    style={{ fontSize: 'var(--message-font-size)' }}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />

                {shouldCollapse && (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full mt-2 py-2 text-xs font-bold text-zeus-gold bg-zeus-gold/5 hover:bg-zeus-gold/10 border border-zeus-gold/20 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        {isExpanded ? (
                            <>
                                <i className="fas fa-chevron-up"></i> طي الرسالة
                            </>
                        ) : (
                            <>
                                <i className="fas fa-chevron-down"></i> إظهار باقي الرسالة ({msg.content.length.toLocaleString()} حرف)
                            </>
                        )}
                    </button>
                )}
                
                {/* تذييل الرسالة: الوقت وزر النسخ */}
                <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center gap-2 select-none">
                     {/* الوقت: يظهر عند التحويم على الديسك توب، ويظهر دائماً في الموبايل. إنجليزي وبدون ثواني */}
                    <span className="text-[9px] md:text-[11px] text-gray-600 font-mono opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300" dir="ltr">
                        {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                    
                    {/* زر النسخ: ظاهر دائماً */}
                    {msg.content && (
                        <button 
                            onClick={() => navigator.clipboard.writeText(msg.content)}
                            className="text-gray-500 hover:text-zeus-gold transition-colors p-1 opacity-70 hover:opacity-100"
                            title="Copy"
                        >
                            <i className="fas fa-copy text-[10px] md:text-xs"></i>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.msg.content === nextProps.msg.content &&
        prevProps.isLast === nextProps.isLast &&
        prevProps.isStreaming === nextProps.isStreaming
    );
});

const ChatWindow: React.FC<Props> = ({ chat, onSendMessage, isStreaming, onNewChat }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [textDirection, setTextDirection] = useState<'rtl' | 'ltr'>('rtl'); // الحالة الافتراضية RTL
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    
    // مرجع لتتبع ما إذا كان المستخدم في الأسفل حالياً
    const isAtBottomRef = useRef(true);

    // --- منطق التحميل الكسول (Lazy Loading) ---
    const [visibleCount, setVisibleCount] = useState(MESSAGES_BATCH_SIZE);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const prevScrollHeightRef = useRef<number>(0);

    // دالة مساعدة للتمرير للأسفل
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: behavior
            });
            // نؤكد أننا في الأسفل بعد التمرير القسري
            isAtBottomRef.current = true;
            setShowScrollButton(false);
        }
    };

    // إعادة تعيين العداد عند تغيير المحادثة + التمرير للأسفل فوراً
    useEffect(() => {
        setVisibleCount(MESSAGES_BATCH_SIZE);
        setIsLoadingHistory(false);
        setShowScrollButton(false);
        isAtBottomRef.current = true; // إعادة تعيين الحالة للأسفل
        
        // إجبار التمرير للأسفل فوراً عند فتح محادثة جديدة
        // استخدام setTimeout لضمان اكتمال الـ render
        setTimeout(() => {
            scrollToBottom('instant');
        }, 50); 
    }, [chat?.id]);

    // زيادة عدد الرسائل المعروضة عند وصول رسالة جديدة
    useEffect(() => {
        if (chat?.messages.length) {
            setVisibleCount(prev => prev + 1);
        }
    }, [chat?.messages.length]);

    // الرسائل التي سيتم عرضها فعلياً
    const displayedMessages = useMemo(() => {
        if (!chat) return [];
        const start = Math.max(0, chat.messages.length - visibleCount);
        return chat.messages.slice(start);
    }, [chat, visibleCount]);

    const hasMoreHistory = chat ? chat.messages.length > visibleCount : false;

    // معالجة التمرير لتحميل التاريخ وتحديد موقع المستخدم
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        
        // حساب المسافة عن الأسفل
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        // إذا كانت المسافة أقل من 100 بكسل، نعتبر أن المستخدم في الأسفل ويريد التمرير التلقائي
        const isAtBottom = distanceFromBottom < 100;
        isAtBottomRef.current = isAtBottom;
        
        // زر العودة يظهر فقط إذا ابتعد المستخدم كثيراً (300 بكسل)
        setShowScrollButton(distanceFromBottom > 300);

        // إذا وصلنا للأعلى وهناك المزيد من الرسائل (منطق التحميل الكسول)
        if (scrollTop === 0 && hasMoreHistory && !isLoadingHistory) {
            setIsLoadingHistory(true);
            prevScrollHeightRef.current = scrollHeight;
            
            setTimeout(() => {
                setVisibleCount(prev => Math.min(prev + MESSAGES_BATCH_SIZE, chat!.messages.length));
                setIsLoadingHistory(false);
            }, 300);
        }
    };

    // استعادة موضع التمرير بعد تحميل الرسائل القديمة
    useLayoutEffect(() => {
        if (containerRef.current && prevScrollHeightRef.current > 0) {
            const newScrollHeight = containerRef.current.scrollHeight;
            const heightDifference = newScrollHeight - prevScrollHeightRef.current;
            containerRef.current.scrollTop = heightDifference;
            prevScrollHeightRef.current = 0;
        }
    }, [visibleCount]);

    // التمرير التلقائي الذكي أثناء البث
    // نعتمد على طول محتوى آخر رسالة لتفعيل التمرير مع كل حرف جديد
    const lastMessage = displayedMessages[displayedMessages.length - 1];
    const lastMessageContentLength = lastMessage?.content?.length || 0;

    useEffect(() => {
        // نمرر للأسفل فقط إذا:
        // 1. نحن في وضع البث (أو رسالة جديدة وصلت للتو)
        // 2. لم نكن نحمل التاريخ القديم
        // 3. المستخدم كان بالفعل في أسفل الصفحة (لم يصعد للأعلى للقراءة)
        if (!isLoadingHistory && isAtBottomRef.current) {
             scrollToBottom('smooth');
        }
    }, [lastMessageContentLength, isStreaming, isLoadingHistory, displayedMessages.length]);

    // تحديد ما إذا كنا ننتظر الرد الأول
    const isWaitingForFirstChunk = isStreaming && chat && chat.messages.length > 0 && chat.messages[chat.messages.length - 1].role === 'user';

    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; 
            const maxHeight = 200;
            const newHeight = Math.min(textarea.scrollHeight, maxHeight);
            textarea.style.height = `${newHeight}px`;
            textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [inputValue]);

    useEffect(() => {
        const renderer = new marked.Renderer();
        
        renderer.code = ({ text, lang }) => {
            const language = lang || 'text';
            const validLang = hljs.getLanguage(language) ? language : 'plaintext';
            const highlighted = hljs.highlight(text, { language: validLang }).value;
            const encodedCode = text.replace(/`/g, '\\`').replace(/"/g, '&quot;');

            return `
                <div class="code-block-wrapper">
                    <div class="code-block-header">
                        <span class="font-bold text-xs uppercase tracking-wider">${language}</span>
                        <button onclick="window.copyCode(this, \`${encodedCode}\`)" class="hover:text-white focus:outline-none">
                            <i class="fas fa-copy"></i> نسخ
                        </button>
                    </div>
                    <pre><code class="hljs language-${validLang}">${highlighted}</code></pre>
                </div>
            `;
        };

        renderer.link = ({ href, title, text }) => {
            return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer" class="text-zeus-gold hover:underline">${text}</a>`;
        };

        marked.setOptions({
            renderer: renderer,
            gfm: true,
            breaks: true,
        });

    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            const newAttachments: Attachment[] = [];
            
            for (const file of files) {
                const isImage = file.type.startsWith('image/');
                const content = await readFile(file);
                
                newAttachments.push({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content: content as string,
                    dataType: isImage ? 'image' : 'text',
                    mimeType: file.type
                });
            }
            setAttachments(prev => [...prev, ...newAttachments]);
        }
    };

    const readFile = (file: File) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            if (file.type.startsWith('image/')) {
                reader.readAsDataURL(file); 
            } else {
                reader.readAsText(file);
            }
            reader.onload = () => {
                let res = reader.result as string;
                if (file.type.startsWith('image/')) {
                    const base64 = res.split(',')[1];
                    resolve(base64);
                } else {
                    resolve(res);
                }
            };
            reader.onerror = reject;
        });
    };

    // معالجة تغير النص
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInputValue(val);

        // التحقق من الحرف الأول لتحديد الاتجاه
        // إذا كان يبدأ بحرف إنجليزي -> يسار، عدا ذلك -> يمين (افتراضي)
        if (val.trim().length > 0) {
            const firstChar = val.trim().charAt(0);
            if (/^[A-Za-z]/.test(firstChar)) {
                setTextDirection('ltr');
            } else {
                setTextDirection('rtl');
            }
        } else {
            setTextDirection('rtl'); // عودة للأصل إذا كان فارغاً
        }
    };

    const handleSubmit = () => {
        if (!inputValue.trim() && attachments.length === 0) return;
        if (isStreaming) return;
        
        onSendMessage(inputValue, attachments);
        setInputValue('');
        setTextDirection('rtl'); // إعادة الاتجاه لليمين بعد الإرسال
        setAttachments([]);
        
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        
        // عند الإرسال، نجبر الشاشة على النزول للأسفل وتفعيل المتابعة التلقائية
        isAtBottomRef.current = true;
        setTimeout(() => scrollToBottom('smooth'), 100);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    if (!chat) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-80 animate-fade-in relative">
                <div className="w-32 h-32 rounded-full border-2 border-zeus-gold bg-black/50 flex items-center justify-center mb-6 animate-float shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                    <i className="fas fa-bolt text-5xl text-zeus-gold"></i>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white drop-shadow-lg font-sans">مرحباً بك في عرش زيوس</h2>
                <p className="text-zeus-gold/80 max-w-lg text-base md:text-lg mb-8 leading-relaxed">إله الرعد والحكمة في خدمتك. اختر نموذجاً، أرفق ملفاتك، واسأل عما تشاء.</p>
                
                <button 
                    onClick={onNewChat}
                    className="mb-8 px-8 py-4 bg-zeus-gold text-black font-bold text-lg rounded-xl hover:bg-yellow-400 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,215,0,0.4)] flex items-center gap-3"
                >
                    <i className="fas fa-plus"></i>
                    بدء محادثة جديدة
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full px-4">
                    {['تحليل الأكواد البرمجية', 'شرح الصور المعقدة', 'الترجمة الاحترافية', 'حل المشكلات التقنية'].map(hint => (
                        <div key={hint} className="glass-gold p-4 rounded-xl text-sm hover:bg-zeus-gold/10 cursor-pointer transition-all border border-transparent hover:border-zeus-gold text-gray-300 flex items-center gap-2">
                            <i className="fas fa-star text-xs text-zeus-gold"></i>
                            <span>{hint}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden mx-2 md:mx-4 mb-4 glass-gold rounded-2xl border border-zeus-gold/20 shadow-2xl relative">
            
            {/* منطقة الرسائل */}
            <div 
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-6 md:space-y-8 custom-scrollbar scroll-smooth"
            >
                {/* مؤشر تحميل التاريخ القديم */}
                {isLoadingHistory && (
                    <div className="flex justify-center py-2">
                        <div className="w-6 h-6 border-2 border-zeus-gold border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                
                {/* رسالة توضيحية عند وجود تاريخ مخفي */}
                {hasMoreHistory && !isLoadingHistory && (
                    <div className="text-center py-2 opacity-50 text-xs text-gray-500 cursor-pointer hover:text-zeus-gold" onClick={() => {
                        const fakeEvent = { currentTarget: containerRef.current } as any;
                        fakeEvent.currentTarget.scrollTop = 0;
                        handleScroll(fakeEvent);
                    }}>
                        <i className="fas fa-arrow-up mb-1"></i> اسحب للأعلى لتحميل المزيد
                    </div>
                )}

                {displayedMessages.map((msg, idx) => (
                    <MessageItem 
                        key={msg.id || idx} 
                        msg={msg} 
                        isLast={idx === displayedMessages.length - 1} 
                        isStreaming={isStreaming} 
                    />
                ))}

                {/* رسالة وهمية للمؤشر تظهر فوراً قبل وصول البيانات */}
                {isWaitingForFirstChunk && (
                    <MessageItem
                        msg={{
                            id: 'temp-loading-indicator',
                            role: 'assistant',
                            content: '',
                            timestamp: Date.now()
                        }}
                        isLast={true}
                        isStreaming={true}
                    />
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* منطقة الإدخال */}
            <div className="p-4 bg-black/40 backdrop-blur-md border-t border-zeus-gold/20 z-10 relative">
                
                 {/* زر العودة للأسفل - متمركز فوق الإدخال تماماً ومتجاوب */}
                {showScrollButton && (
                    <button 
                        onClick={() => scrollToBottom('smooth')}
                        className="absolute bottom-full right-4 md:right-8 mb-4 z-20 w-8 h-8 md:w-12 md:h-12 bg-black/70 backdrop-blur-md border border-zeus-gold/50 rounded-full flex items-center justify-center text-zeus-gold shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:scale-110 hover:bg-zeus-gold hover:text-black transition-all duration-300 animate-bounce group"
                        title="الذهاب للأحدث"
                    >
                        <i className="fas fa-arrow-down text-xs md:text-lg group-hover:animate-pulse"></i>
                    </button>
                )}

                {attachments.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                        {attachments.map((att, i) => (
                            <div key={i} className="relative bg-zeus-surface border border-zeus-gold/30 rounded-lg p-2 flex items-center gap-2 group min-w-[120px]">
                                <button 
                                    onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                                    className="absolute -top-2 -left-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                                <i className={`fas ${att.dataType === 'image' ? 'fa-image text-purple-400' : 'fa-file-alt text-blue-400'} text-lg`}></i>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs text-white truncate w-full" dir="ltr">{att.name}</span>
                                    <span className="text-[10px] text-gray-400">{(att.size / 1024).toFixed(1)} KB</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* شريط الإدخال المتجاوب الجديد - تم إعادة الحدود للشفافية الذهبية */}
                <div className="relative flex items-end bg-black/60 border border-zeus-gold/30 rounded-2xl shadow-[0_0_15px_rgba(255,215,0,0.05)] transition-all focus-within:shadow-[0_0_20px_rgba(255,215,0,0.1)] overflow-hidden">
                    
                    {/* زر المرفقات */}
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-11 w-11 md:h-14 md:w-14 text-gray-400 hover:text-zeus-gold hover:bg-white/5 transition-colors flex-shrink-0 flex items-center justify-center border-l border-zeus-gold/30"
                        title="أرفق ملفاً"
                    >
                        <i className="fas fa-paperclip text-lg md:text-xl"></i>
                    </button>
                    <input 
                        type="file" 
                        multiple 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileSelect}
                    />

                    {/* حقل النص */}
                    <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="اسأل أي شيء..."
                        dir={textDirection}
                        className="flex-1 bg-transparent border-none outline-none text-white resize-none py-3 px-3 md:py-4 md:px-4 placeholder-gray-500 font-sans text-sm md:text-lg scrollbar-thin"
                        style={{ height: 'auto', maxHeight: '200px', overflowY: 'hidden' }}
                        rows={1}
                    />

                    {/* زر الإرسال */}
                    <button 
                        onClick={handleSubmit}
                        disabled={(!inputValue.trim() && attachments.length === 0) || isStreaming}
                        className={`
                            h-11 w-11 md:h-14 md:w-14 transition-all duration-300 flex-shrink-0 flex items-center justify-center border-r border-zeus-gold/30
                            ${(!inputValue.trim() && attachments.length === 0) || isStreaming 
                                ? 'text-gray-600 cursor-not-allowed' 
                                : 'text-zeus-gold hover:bg-zeus-gold/10 hover:text-yellow-400'
                            }
                        `}
                    >
                        <i className={`fas ${isStreaming ? 'fa-stop animate-pulse' : 'fa-paper-plane'} text-lg md:text-xl transform ${!isStreaming ? '-rotate-0' : ''}`}></i>
                    </button>
                </div>
                
                <div className="text-center mt-2 text-[10px] text-gray-500 font-sans">
                    زيوس قد يخطئ، راجع المعلومات المهمة.
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;