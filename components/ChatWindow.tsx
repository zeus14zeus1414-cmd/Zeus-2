// ... (الاستيرادات كما هي)

const MessageItem = React.memo(({ msg, isLast, isStreaming, forceThinkEnabled, settings }: { msg: Message, isLast: boolean, isStreaming: boolean, forceThinkEnabled: boolean, settings: Settings }) => {
    const isUser = msg.role === 'user';
    const [isExpanded, setIsExpanded] = useState(false);
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
    
    const parsedContent = useMemo(() => {
        let text = msg.content || '';
        let thinkContent = '';
        let finalAnswer = text;

        // البحث عن وسم البداية بأي صيغة
        const startTagMatch = text.match(/<(?:think|فكّر|تفكير)>/i);
        
        if (startTagMatch) {
            const startIndex = startTagMatch.index!;
            const startTagLength = startTagMatch[0].length;
            
            // البحث عن وسم النهاية بعد وسم البداية
            const contentAfterStart = text.slice(startIndex + startTagLength);
            const endTagMatch = contentAfterStart.match(/<\/(?:think|فكّر|تفكير)>/i);

            if (endTagMatch) {
                // الحالة 1: التفكير مكتمل ومغلق
                // التفكير هو ما بين الوسمين
                thinkContent = contentAfterStart.slice(0, endTagMatch.index).trim();
                
                // الإجابة هي ما قبل وسم البداية + ما بعد وسم النهاية
                // (عادة لا يوجد شيء قبل البداية، لكن للاحتياط)
                const beforeThink = text.slice(0, startIndex).trim();
                const afterThink = contentAfterStart.slice(endTagMatch.index! + endTagMatch[0].length).trim();
                finalAnswer = (beforeThink + (beforeThink && afterThink ? '\n\n' : '') + afterThink).trim();
            } else {
                // الحالة 2: التفكير مفتوح (أثناء الستريمنج أو الموديل نسي الإغلاق)
                // كل شيء بعد وسم البداية يعتبر تفكيراً!
                thinkContent = contentAfterStart.trim();
                
                // الإجابة هي فقط ما قبل وسم البداية (وغالباً تكون فارغة)
                finalAnswer = text.slice(0, startIndex).trim();

                // منطق الإنقاذ: إذا انتهى الستريمنج ولم يغلق الوسم، نحاول فصل آخر جزء كنص
                if (!isStreaming && isLast && thinkContent.length > 0) {
                     // نحاول البحث عن نمط يدل على بداية الإجابة داخل التفكير المزعوم
                     // مثلاً فاصل سطرين كبيرين
                     const parts = thinkContent.split(/\n\s*\n/);
                     if (parts.length > 1) {
                         // نفترض أن آخر كتلة نصية هي الإجابة
                         finalAnswer = parts.pop() || "";
                         thinkContent = parts.join('\n\n');
                     }
                }
            }
        }

        return { thinkContent, finalAnswer };
    }, [msg.content, isLast, isStreaming, isUser]);

    const { thinkContent, finalAnswer } = parsedContent;

    // ... (باقي الكود للعرض كما هو في النسخة السابقة تماماً)
    // فقط تأكد من نسخ باقي دالة MessageItem من الكود السابق
    // ...

    const isWaitingForFirstToken = !isUser && isLast && isStreaming && finalAnswer.length === 0 && thinkContent.length === 0;
    const isDeepThinkMode = thinkContent.length > 0 || (isWaitingForFirstToken && forceThinkEnabled);
    const loadingText = isDeepThinkMode ? 'جاري التفكير العميق...' : 'لحظة من فضلك...';
    const showHeader = isDeepThinkMode || isWaitingForFirstToken;
    const hasContent = finalAnswer.length > 0 || thinkContent.length > 0;
    const showBody = isUser || hasContent;
    
    // ... (أكمل باقي الـ return كما هو)
    const shouldCollapse = useMemo(() => {
        if (!settings.collapseLongMessages) return false;
        if (isUser && settings.collapseTarget === 'assistant') return false;
        if (!isUser && settings.collapseTarget === 'user') return false;
        if (isLast && isStreaming && !isUser) return false;
        const lines = finalAnswer.split('\n').length;
        return finalAnswer.length > MAX_COLLAPSED_LENGTH_CHARS || lines > settings.maxCollapseLines;
    }, [finalAnswer, isLast, isStreaming, isUser, settings]);

    const htmlContent = useMemo(() => {
        let content = finalAnswer || ' '; 
        if (shouldCollapse && !isExpanded) {
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

                 {/* باقي الكود للمرفقات والنص Body كما هو بالضبط */}
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 justify-end">
                       {/* ... Attachments code ... */}
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

                {showBody && (
                    <div 
                        className={`markdown-body leading-relaxed min-w-0 break-words ${shouldCollapse && !isExpanded ? 'mask-bottom' : ''} animate-fade-in`}
                        style={{ fontSize: 'var(--message-font-size)' }}
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                )}
                
                {/* ... Buttons copy/collapse ... */}
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
});
// ... باقي مكون ChatWindow كما هو