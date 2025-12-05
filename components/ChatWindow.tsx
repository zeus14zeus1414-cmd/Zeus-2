import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { Chat, Attachment, Message, Settings } from '../types';
import { marked } from 'marked';
import hljs from 'highlight.js';
import AttachmentModal from './AttachmentModal';

interface Props {
    chat: Chat | null;
    onSendMessage: (text: string, files: Attachment[], forceThink: boolean) => void;
    isStreaming: boolean;
    onNewChat: () => void;
    onStop?: () => void; // إضافة خاصية الإيقاف
    settings: Settings; // استقبال الإعدادات
}

const MAX_COLLAPSED_LENGTH_CHARS = 350; // Fallback value

const MessageItem = React.memo(({ msg, isLast, isStreaming, forceThinkEnabled, settings, onAttachmentClick }: { 
    msg: Message, 
    isLast: boolean, 
    isStreaming: boolean, 
    forceThinkEnabled: boolean, 
    settings: Settings,
    onAttachmentClick: (att: Attachment) => void 
}) => {
    const isUser = msg.role === 'user';
    const [isExpanded, setIsExpanded] = useState(false);
    
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
    
    const parsedContent = useMemo(() => {
        let text = msg.content || '';
        let thinkContent = '';
        
        // 1. التعامل مع الكتل المكتملة (التي لها بداية ونهاية)
        // نستخدم تعبير نمطي للبحث عن كل الكتل المغلقة <think>...</think> بغض النظر عن محتواها
        const completeThinkRegex = /<(?:think|فكّر|تفكير)>([\s\S]*?)<\/(?:think|فكّر|تفكير)>/gi;
        
        // استخراج جميع كتل التفكير المكتملة وتجميعها
        let match;
        // نستخدم while loop لضمان جمع كل كتل التفكير إذا كان هناك أكثر من واحدة
        while ((match = completeThinkRegex.exec(text)) !== null) {
            thinkContent += (thinkContent ? '\n\n---\n\n' : '') + match[1].trim();
        }
        
        // حذف الكتل المكتملة من النص الأصلي للحصول على الرد الفعلي المبدئي
        let finalAnswer = text.replace(completeThinkRegex, '').trim();
        
        // 2. التعامل مع الكتل غير المكتملة (أثناء الـ Streaming)
        // بما أننا حذفنا الكتل المكتملة، فإن وجود أي وسم فتح متبقي يعني أنه بداية لتفكير لم ينته بعد
        const openTagRegex = /<(?:think|فكّر|تفكير)>/i;
        const openMatch = finalAnswer.match(openTagRegex);
        
        if (openMatch) {
            // كل ما بعد وسم الفتح هو تفكير جاري
            const pendingThink = finalAnswer.slice(openMatch.index! + openMatch[0].length);
            thinkContent += (thinkContent ? '\n' : '') + pendingThink;
            
            // الرد الفعلي هو ما قبل وسم الفتح
            finalAnswer = finalAnswer.slice(0, openMatch.index).trim();
        }

        // تنظيف النتائج
        thinkContent = thinkContent.trim();
        
        // حالة خاصة: إذا كان الرد فارغاً تماماً ونحن في وضع الستريمنج
        // قد يكون الموديل قد وضع وسم الفتح للتو، تم التعامل معها أعلاه، لكن للتأكيد
        if (isLast && isStreaming && !isUser && finalAnswer.length === 0 && thinkContent.length === 0) {
             // force logic checks outside
        }

        return { thinkContent, finalAnswer };
    }, [msg.content, isLast, isStreaming, isUser]);

    const { thinkContent, finalAnswer } = parsedContent;

    const isWaitingForFirstToken = !isUser && isLast && isStreaming && finalAnswer.length === 0 && thinkContent.length === 0;

    const isDeepThinkMode = thinkContent.length > 0 || (isWaitingForFirstToken && forceThinkEnabled);

    const loadingText = isDeepThinkMode ? 'جاري التفكير العميق...' : 'لحظة من فضلك...';

    const showHeader = isDeepThinkMode || isWaitingForFirstToken;

    const hasContent = finalAnswer.length > 0 || thinkContent.length > 0;
    const showBody = isUser || hasContent;

    // منطق الطي المحسن بناءً على الإعدادات
    const shouldCollapse = useMemo(() => {
        // إذا كان الطي معطلاً بالكامل
        if (!settings.collapseLongMessages) return false;

        // التحقق من الهدف المحدد للطي
        if (isUser && settings.collapseTarget === 'assistant') return false;
        if (!isUser && settings.collapseTarget === 'user') return false;

        // لا نقوم بالطي أثناء الستريمنج للنموذج لتجنب القفزات المزعجة
        if (isLast && isStreaming && !isUser) return false;

        const lines = finalAnswer.split('\n').length;
        // استخدام القيمة من الإعدادات
        return finalAnswer.length > MAX_COLLAPSED_LENGTH_CHARS || lines > settings.maxCollapseLines;
    }, [finalAnswer, isLast, isStreaming, isUser, settings]);

    const htmlContent = useMemo(() => {
        let content = finalAnswer || ' '; 
        if (shouldCollapse && !isExpanded) {
            // قص المحتوى للعرض المختصر
            const lines = content.split('\n');
            const snippet = lines.slice(0, settings.maxCollapseLines).join('\n').slice(0, MAX_COLLAPSED_LENGTH_CHARS);
            return marked.parse(snippet + '...') as string;
        }
        if (!isUser && isLast && isStreaming) {
            content += ' <span class="zeus-cursor-inline"></span>';
        }
        return marked.parse(content) as string;
    }, [finalAnswer, isLast, isStreaming, isUser, shouldCollapse, isExpanded, settings]);

    const thinkHtmlContent = useMemo(() => {
        if (!thinkContent) return '';
        return marked.parse(thinkContent) as string;
    }, [thinkContent]);

    const isProcessing = !isUser && isLast && isStreaming;

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group animate-fade-in px-1`}>
            <div className={`
                relative transition-all duration-500 ease-out flex flex-col min-w-[50px] overflow-hidden max-w-[95%] md:max-w-[85%]
                ${isUser 
                    ? 'bg-gradient-to-br from-zeus-surface to-gray-900 border border-zeus-gold/20 text-white rounded-2xl rounded-tl-sm p-4 md:p-5' 
                    : `bg-black/60 border border-zeus-gold/30 text-gray-100 shadow-[0_0_20px_rgba(255,215,0,0.05)]
                       ${isWaitingForFirstToken 
                            ? 'rounded-[2rem] py-2 px-5 items-center justify-center' 
                            : 'rounded-2xl rounded-tr-sm p-4 md:p-5' 
                       }`
                }
            `}>
                {!isUser && (
                    <>
                        {showHeader && (
                            <div 
                                className={`flex items-center gap-3 transition-all duration-300
                                    ${!isProcessing && isDeepThinkMode ? 'cursor-pointer hover:bg-white/5 rounded-lg -mx-2 px-2 py-1' : ''}
                                    ${isWaitingForFirstToken ? 'mb-0' : 'mb-3'}
                                `}
                                onClick={() => (!isProcessing && isDeepThinkMode) && setIsThinkingExpanded(!isThinkingExpanded)}
                            >
                                <div className="relative w-6 h-6 flex items-center justify-center flex-shrink-0">
                                    {isProcessing ? (
                                        <svg className="absolute inset-0 w-full h-full text-zeus-gold" viewBox="0 0 50 50">
                                            <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="animate-dash-flow" strokeDasharray="28 6 28 6 28 30" />
                                        </svg>
                                    ) : (
                                        <div className="w-full h-full rounded-full border-2 border-zeus-gold shadow-[0_0_10px_rgba(255,215,0,0.5)]"></div>
                                    )}
                                    <i className="fas fa-bolt text-[10px] text-zeus-gold absolute"></i>
                                </div>

                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold transition-all whitespace-nowrap ${isProcessing ? 'text-zeus-gold animate-pulse' : 'text-gray-300'}`}>
                                        {isProcessing 
                                            ? loadingText
                                            : (isDeepThinkMode ? 'عرض طريقة التفكير' : '')
                                        }
                                    </span>
                                </div>

                                {!isProcessing && isDeepThinkMode && (
                                    <i className={`fas fa-chevron-down text-xs text-gray-500 mr-auto transition-transform duration-300 ${isThinkingExpanded ? 'rotate-180' : ''}`}></i>
                                )}
                            </div>
                        )}

                        {isDeepThinkMode && !isWaitingForFirstToken && (
                             <div className={`h-px w-full bg-zeus-gold/20 mb-4 transition-all duration-500 ${isWaitingForFirstToken ? 'opacity-0' : 'opacity-100'}`}></div>
                        )}

                        {isDeepThinkMode && isThinkingExpanded && thinkContent && (
                            <div className="mb-4 pl-4 border-r-2 border-zeus-gold/20 animate-slide-up">
                                <div 
                                    className="markdown-body text-gray-300 leading-relaxed opacity-90"
                                    style={{ fontSize: '0.9em' }} 
                                    dangerouslySetInnerHTML={{ __html: thinkHtmlContent }}
                                />
                            </div>
                        )}
                    </>
                )}

                {isUser && (
                    <div className="text-xs mb-3 opacity-70 flex items-center gap-2 border-b border-white/5 pb-2">
                        <i className="fas fa-user text-blue-400"></i>
                        <span className="font-bold text-zeus-goldDim">أنت</span>
                    </div>
                )}

                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-5 justify-end w-full">
                        {msg.attachments.map((att, i) => (
                            <div key={i} className="animate-scale-up" style={{animationDelay: `${i * 100}ms`}}>
                                {att.dataType === 'image' ? (
                                    <div 
                                        onClick={() => onAttachmentClick(att)}
                                        className="relative w-32 h-32 md:w-48 md:h-48 rounded-2xl overflow-hidden group/img cursor-pointer border border-white/10 shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,215,0,0.15)] bg-black/50"
                                    >
                                        <img src={`data:${att.mimeType};base64,${att.content}`} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" alt={att.name} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                                            <div className="flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full border border-white/10 text-xs text-white">
                                                <i className="fas fa-eye text-zeus-gold"></i>
                                                <span>عرض</span>
                                            </div>
                                        </div>
                                        {/* Badge Type */}
                                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/10">
                                            <i className="fas fa-image text-[10px] text-zeus-gold"></i>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => onAttachmentClick(att)}
                                        className="group/file cursor-pointer flex items-center gap-3 bg-[#111] hover:bg-zeus-gold/5 border border-white/10 hover:border-zeus-gold/30 rounded-2xl p-3 md:p-4 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,215,0,0.05)] hover:-translate-y-1 min-w-[200px] md:min-w-[240px] max-w-full"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-zeus-electric border border-white/5 group-hover/file:border-zeus-gold/20 group-hover/file:scale-110 transition-all duration-300 shadow-inner">
                                            <i className="fas fa-file-code text-2xl group-hover/file:text-zeus-gold transition-colors"></i>
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-sm font-bold text-gray-200 truncate w-full" dir="ltr">{att.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full font-mono">{(att.size / 1024).toFixed(1)} KB</span>
                                                <span className="text-[10px] text-zeus-gold opacity-0 group-hover/file:opacity-100 transition-opacity duration-300 flex items-center gap-1">
                                                    <i className="fas fa-external-link-alt text-[8px]"></i> فتح
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {showBody && (
                    <div 
                        className={`markdown-body leading-relaxed min-w-0 break-words ${shouldCollapse && !isExpanded ? 'mask-bottom' : ''} animate-fade-in`}
                        style={{ fontSize: 'var(--message-font-size)' }}
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                )}

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
                                <i className="fas fa-chevron-down"></i> إظهار باقي الرسالة ({finalAnswer.length.toLocaleString()} حرف)
                            </>
                        )}
                    </button>
                )}
                
                {(isUser || hasContent) && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center gap-2 select-none">
                        <span className="text-[9px] md:text-[11px] text-gray-600 font-mono opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300" dir="ltr">
                            {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                        
                        {finalAnswer && (
                            <button 
                                onClick={() => navigator.clipboard.writeText(finalAnswer)}
                                className="text-gray-500 hover:text-zeus-gold transition-colors p-1 opacity-70 hover:opacity-100"
                                title="Copy"
                            >
                                <i className="fas fa-copy text-[10px] md:text-xs"></i>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.msg.content === nextProps.msg.content &&
        prevProps.isLast === nextProps.isLast &&
        prevProps.isStreaming === nextProps.isStreaming &&
        prevProps.forceThinkEnabled === nextProps.forceThinkEnabled &&
        prevProps.settings.collapseLongMessages === nextProps.settings.collapseLongMessages &&
        prevProps.settings.collapseTarget === nextProps.settings.collapseTarget &&
        prevProps.settings.maxCollapseLines === nextProps.settings.maxCollapseLines &&
        prevProps.settings.fontSize === nextProps.settings.fontSize
    );
});

const ChatWindow: React.FC<Props> = ({ chat, onSendMessage, isStreaming, onNewChat, onStop, settings }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [textDirection, setTextDirection] = useState<'rtl' | 'ltr'>('rtl');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    
    // State for viewing attachments
    const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(null);

    // مرجع للتحقق مما إذا كان المستخدم في أسفل الصفحة
    const isAtBottomRef = useRef(true);

    const [visibleCount, setVisibleCount] = useState(50);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const prevScrollHeightRef = useRef<number>(0);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (containerRef.current) {
            // نستخدم scrollTo بدلاً من scrollIntoView للتحكم أفضل في السلوك
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: behavior
            });
            // تحديث الحالة يدوياً لأن onScroll قد يتأخر
            isAtBottomRef.current = true;
            setShowScrollButton(false);
        }
    };

    useEffect(() => {
        setVisibleCount(50);
        setIsLoadingHistory(false);
        setShowScrollButton(false);
        isAtBottomRef.current = true;
        setTimeout(() => {
            scrollToBottom('instant');
        }, 50); 
    }, [chat?.id]);

    useEffect(() => {
        if (chat?.messages.length) {
            setVisibleCount(prev => prev + 1);
        }
    }, [chat?.messages.length]);

    const displayedMessages = useMemo(() => {
        if (!chat) return [];
        const start = Math.max(0, chat.messages.length - visibleCount);
        return chat.messages.slice(start);
    }, [chat, visibleCount]);

    const hasMoreHistory = chat ? chat.messages.length > visibleCount : false;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        // زيادة حد التسامح قليلاً (100px) لضمان دقة الكشف
        const isAtBottom = distanceFromBottom < 100;
        isAtBottomRef.current = isAtBottom;
        
        // إظهار زر النزول إذا ابتعدنا كثيراً عن الأسفل
        setShowScrollButton(distanceFromBottom > 300);

        if (scrollTop === 0 && hasMoreHistory && !isLoadingHistory) {
            setIsLoadingHistory(true);
            prevScrollHeightRef.current = scrollHeight;
            setTimeout(() => {
                setVisibleCount(prev => Math.min(prev + 50, chat!.messages.length));
                setIsLoadingHistory(false);
            }, 300);
        }
    };

    useLayoutEffect(() => {
        if (containerRef.current && prevScrollHeightRef.current > 0) {
            const newScrollHeight = containerRef.current.scrollHeight;
            const heightDifference = newScrollHeight - prevScrollHeightRef.current;
            containerRef.current.scrollTop = heightDifference;
            prevScrollHeightRef.current = 0;
        }
    }, [visibleCount]);

    const lastMessage = displayedMessages[displayedMessages.length - 1];
    const lastMessageContentLength = lastMessage?.content?.length || 0;

    // التأثير المسؤول عن التمرير التلقائي أثناء الكتابة أو البث
    useEffect(() => {
        if (chat && chat.messages.length > 0) {
            // إذا كنا في وضع البث وكان المستخدم في الأسفل، استخدم تمرير فوري (auto/instant)
            // التمرير الفوري يمنع التذبذب الذي يحدث مع التمرير السلس أثناء التحديثات السريعة
            if (isStreaming) {
                if (isAtBottomRef.current) {
                    scrollToBottom('auto'); 
                }
            } else if (isAtBottomRef.current) {
                // إذا لم يكن بثاً (رسالة جديدة كاملة) وكان المستخدم في الأسفل، استخدم تمرير سلس
                scrollToBottom('smooth');
            }
        }
    }, [lastMessageContentLength, isStreaming, displayedMessages.length]);

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
        renderer.link = ({ href, title, text }) => `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer" class="text-zeus-gold hover:underline">${text}</a>`;
        marked.setOptions({ renderer: renderer, gfm: true, breaks: true });
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            const newAttachments: Attachment[] = [];
            for (const file of files) {
                const isImage = file.type.startsWith('image/');
                const content = await readFile(file);
                newAttachments.push({
                    name: file.name, type: file.type, size: file.size,
                    content: content as string, dataType: isImage ? 'image' : 'text', mimeType: file.type
                });
            }
            setAttachments(prev => [...prev, ...newAttachments]);
        }
    };

    const readFile = (file: File) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            if (file.type.startsWith('image/')) reader.readAsDataURL(file); 
            else reader.readAsText(file);
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

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInputValue(val);
        if (val.trim().length > 0) {
            const firstChar = val.trim().charAt(0);
            setTextDirection(/^[A-Za-z]/.test(firstChar) ? 'ltr' : 'rtl');
        } else {
            setTextDirection('rtl');
        }
    };

    const handleSubmit = () => {
        if (!inputValue.trim() && attachments.length === 0) return;
        if (isStreaming) return;
        
        onSendMessage(inputValue, attachments, isThinkingEnabled);
        setInputValue('');
        setTextDirection('rtl');
        setAttachments([]);
        
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
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
            <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <div className="w-32 h-32 rounded-full border-2 border-zeus-gold bg-black/50 flex items-center justify-center mb-6 animate-float shadow-[0_0_30px_rgba(255,215,0,0.2)] overflow-hidden">
                    <img src="/logo.png" alt="Zeus Logo" className="w-full h-full object-cover" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white drop-shadow-lg font-sans">مرحباً بك في عرش زيوس</h2>
                <p className="text-zeus-gold/80 max-w-lg text-base md:text-lg mb-8 leading-relaxed">إله الرعد والحكمة في خدمتك. اختر نموذجاً، أرفق ملفاتك، واسأل عما تشاء.</p>
                <button onClick={onNewChat} className="mb-8 px-8 py-4 bg-zeus-gold text-black font-bold text-lg rounded-xl hover:bg-yellow-400 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,215,0,0.4)] flex items-center gap-3">
                    <i className="fas fa-plus"></i> بدء محادثة جديدة
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden md:mx-4 md:mb-4 glass-gold md:rounded-2xl border-0 md:border border-zeus-gold/20 shadow-none md:shadow-2xl relative">
            <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 md:space-y-8 custom-scrollbar">
                {isLoadingHistory && (
                    <div className="flex justify-center py-2">
                        <div className="w-6 h-6 border-2 border-zeus-gold border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
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
                        forceThinkEnabled={isThinkingEnabled} 
                        settings={settings}
                        onAttachmentClick={setViewingAttachment}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-black/40 backdrop-blur-md border-t border-zeus-gold/20 z-10 relative">
                {showScrollButton && (
                    <button onClick={() => scrollToBottom('smooth')} className="absolute bottom-full right-4 md:right-8 mb-4 z-20 w-8 h-8 md:w-12 md:h-12 bg-black/70 backdrop-blur-md border border-zeus-gold/50 rounded-full flex items-center justify-center text-zeus-gold shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:scale-110 hover:bg-zeus-gold hover:text-black transition-all duration-300 animate-bounce group" title="الذهاب للأحدث">
                        <i className="fas fa-arrow-down text-xs md:text-lg group-hover:animate-pulse"></i>
                    </button>
                )}

                {attachments.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                        {attachments.map((att, i) => (
                            <div key={i} className="relative bg-zeus-surface border border-zeus-gold/30 rounded-lg p-2 flex items-center gap-2 group min-w-[120px]">
                                <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="absolute -top-2 -left-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md">
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

                <div className="relative flex items-end bg-black/60 border border-zeus-gold/30 rounded-2xl shadow-[0_0_15px_rgba(255,215,0,0.05)] transition-all focus-within:shadow-[0_0_20px_rgba(255,215,0,0.1)] overflow-hidden">
                    <button onClick={() => fileInputRef.current?.click()} className="h-11 w-11 md:h-14 md:w-14 text-gray-400 hover:text-zeus-gold hover:bg-white/5 transition-colors flex-shrink-0 flex items-center justify-center border-l border-zeus-gold/30" title="أرفق ملفاً">
                        <i className="fas fa-paperclip text-lg md:text-xl"></i>
                    </button>
                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect}/>

                    <button 
                        onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                        className={`h-11 w-11 md:h-14 md:w-14 transition-colors flex-shrink-0 flex items-center justify-center border-l border-zeus-gold/30 ${isThinkingEnabled ? 'text-zeus-gold bg-zeus-gold/10' : 'text-gray-400 hover:text-zeus-gold hover:bg-white/5'}`}
                        title={isThinkingEnabled ? "وضع التفكير العميق مفعل (اضغط للتعطيل)" : "تفعيل التفكير العميق"}
                    >
                        <i className={`fas fa-brain text-lg md:text-xl ${isThinkingEnabled ? 'animate-pulse' : ''}`}></i>
                    </button>

                    <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={isThinkingEnabled ? "اسأل بعمق... (وضع التفكير مفعل)" : "اسأل أي شيء..."}
                        dir={textDirection}
                        className="flex-1 bg-transparent border-none outline-none text-white resize-none py-3 px-3 md:py-4 md:px-4 placeholder-gray-500 font-sans text-sm md:text-lg scrollbar-thin"
                        style={{ height: 'auto', maxHeight: '200px', overflowY: 'hidden' }}
                        rows={1}
                    />

                    {isStreaming ? (
                        <button 
                            onClick={onStop} // استدعاء دالة الإيقاف
                            className="h-11 w-11 md:h-14 md:w-14 transition-all duration-300 flex-shrink-0 flex items-center justify-center border-r border-zeus-gold/30 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                            title="إيقاف التوليد"
                        >
                            <i className="fas fa-stop animate-pulse text-lg md:text-xl"></i>
                        </button>
                    ) : (
                        <button 
                            onClick={handleSubmit} 
                            disabled={!inputValue.trim() && attachments.length === 0} 
                            className={`h-11 w-11 md:h-14 md:w-14 transition-all duration-300 flex-shrink-0 flex items-center justify-center border-r border-zeus-gold/30 ${(!inputValue.trim() && attachments.length === 0) ? 'text-gray-600 cursor-not-allowed' : 'text-zeus-gold hover:bg-zeus-gold/10 hover:text-yellow-400'}`}
                        >
                            <i className="fas fa-paper-plane text-lg md:text-xl"></i>
                        </button>
                    )}
                </div>
                
                <div className="text-center mt-2 text-[10px] text-gray-500 font-sans">
                    زيوس قد يخطئ، راجع المعلومات المهمة.
                </div>
            </div>

            <AttachmentModal 
                attachment={viewingAttachment} 
                onClose={() => setViewingAttachment(null)} 
            />
        </div>
    );
}
export default ChatWindow;