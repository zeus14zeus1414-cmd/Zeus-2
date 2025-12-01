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
    onStop?: () => void;
    settings: Settings;
}

// نظام الـ Artifacts المحسّن - يطابق سلوك Claude تماماً
interface ArtifactVersion {
    content: string;
    timestamp: number;
    changeDescription?: string;
}

interface ArtifactData {
    identifier: string;
    type: string;
    title: string;
    content: string;
    language: string;
    versions: ArtifactVersion[];
    currentVersion: number;
}

// مدير الـ Artifacts العالمي - يحفظ كل الإصدارات والتعديلات
class ArtifactsManager {
    private artifacts: Map<string, ArtifactData> = new Map();
    
    // إنشاء أو تحديث artifact
    updateArtifact(identifier: string, content: string, type: string, title: string): ArtifactData {
        const existing = this.artifacts.get(identifier);
        const language = this.detectLanguage(type, title);
        
        if (existing) {
            // إضافة نسخة جديدة
            const newVersion: ArtifactVersion = {
                content,
                timestamp: Date.now(),
            };
            
            existing.versions.push(newVersion);
            existing.currentVersion = existing.versions.length - 1;
            existing.content = content;
            existing.title = title;
            existing.type = type;
            
            return { ...existing };
        } else {
            // إنشاء artifact جديد
            const newArtifact: ArtifactData = {
                identifier,
                type,
                title,
                content,
                language,
                versions: [{ content, timestamp: Date.now() }],
                currentVersion: 0,
            };
            
            this.artifacts.set(identifier, newArtifact);
            return { ...newArtifact };
        }
    }
    
    // الحصول على artifact
    getArtifact(identifier: string): ArtifactData | null {
        const artifact = this.artifacts.get(identifier);
        return artifact ? { ...artifact } : null;
    }
    
    // الانتقال إلى نسخة محددة
    goToVersion(identifier: string, versionIndex: number): ArtifactData | null {
        const artifact = this.artifacts.get(identifier);
        if (!artifact || versionIndex < 0 || versionIndex >= artifact.versions.length) {
            return null;
        }
        
        artifact.currentVersion = versionIndex;
        artifact.content = artifact.versions[versionIndex].content;
        return { ...artifact };
    }
    
    private detectLanguage(type: string, title: string): string {
        const lowerTitle = title.toLowerCase();
        if (type.includes('react') || lowerTitle.endsWith('.tsx') || lowerTitle.endsWith('.jsx')) return 'javascript';
        if (type.includes('html') || lowerTitle.endsWith('.html')) return 'html';
        if (type.includes('css') || lowerTitle.endsWith('.css')) return 'css';
        if (type.includes('python') || lowerTitle.endsWith('.py')) return 'python';
        if (type.includes('json') || lowerTitle.endsWith('.json')) return 'json';
        if (type.includes('markdown') || lowerTitle.endsWith('.md')) return 'markdown';
        if (type.includes('typescript') || lowerTitle.endsWith('.ts')) return 'typescript';
        if (type.includes('mermaid')) return 'mermaid';
        return 'plaintext';
    }
    
    // إعادة تعيين كل شيء (عند تغيير المحادثة)
    reset() {
        this.artifacts.clear();
    }
    
    // الحصول على جميع الـ artifacts
    getAllArtifacts(): ArtifactData[] {
        return Array.from(this.artifacts.values()).map(a => ({ ...a }));
    }
}

type MessageBlock = 
    | { type: 'text'; content: string }
    | { type: 'artifact'; identifier: string };

const MAX_COLLAPSED_LENGTH_CHARS = 350;

// تحليل محتوى الرسالة وفصل النص عن الـ artifacts
const parseMessageContent = (content: string, manager: ArtifactsManager): MessageBlock[] => {
    const blocks: MessageBlock[] = [];
    const artifactRegex = /<antArtifact\s+identifier="([^"]*)"\s+type="([^"]*)"\s+title="([^"]*)"(?:\s+action="([^"]*)")?\s*>([\s\S]*?)<\/antArtifact>/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = artifactRegex.exec(content)) !== null) {
        // إضافة النص قبل الـ artifact
        const textBefore = content.slice(lastIndex, match.index).trim();
        if (textBefore) {
            blocks.push({ type: 'text', content: textBefore });
        }
        
        // معالجة الـ artifact
        const [, identifier, type, title, , artifactContent] = match;
        manager.updateArtifact(identifier, artifactContent.trim(), type, title);
        blocks.push({ type: 'artifact', identifier });
        
        lastIndex = match.index + match[0].length;
    }
    
    // إضافة النص المتبقي
    const textAfter = content.slice(lastIndex).trim();
    if (textAfter) {
        blocks.push({ type: 'text', content: textAfter });
    }
    
    return blocks;
};

// --- مكون عارض الـ Artifact (اللوحة الجانبية) ---
const ArtifactViewer = ({ 
    artifact, 
    onClose, 
    isOpen, 
    onVersionChange,
    onExport 
}: { 
    artifact: ArtifactData | null;
    onClose: () => void;
    isOpen: boolean;
    onVersionChange: (versionIndex: number) => void;
    onExport: (format: 'copy' | 'download') => void;
}) => {
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
    const [copyState, setCopyState] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showVersions, setShowVersions] = useState(false);
    const codeRef = useRef<HTMLElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // تطبيق syntax highlighting
    useEffect(() => {
        if (artifact && codeRef.current && activeTab === 'code') {
            delete (codeRef.current as any).dataset.highlighted;
            hljs.highlightElement(codeRef.current);
        }
    }, [artifact?.content, activeTab, artifact?.language]);

    // تحديث المعاينة للـ HTML/React
    useEffect(() => {
        if (artifact && activeTab === 'preview' && iframeRef.current) {
            const iframe = iframeRef.current;
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            
            if (doc && (artifact.type.includes('html') || artifact.type.includes('react'))) {
                doc.open();
                doc.write(artifact.content);
                doc.close();
            }
        }
    }, [artifact?.content, activeTab, artifact?.type]);

    if (!artifact) return null;

    const canPreview = artifact.type.includes('html') || artifact.type.includes('react') || artifact.type.includes('mermaid');

    const handleCopy = () => {
        navigator.clipboard.writeText(artifact.content);
        setCopyState(true);
        setTimeout(() => setCopyState(false), 2000);
        onExport('copy');
    };

    const handleDownload = () => {
        onExport('download');
    };

    return (
        <>
            {/* Overlay للموبايل */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden"
                    onClick={onClose}
                />
            )}
            
            {/* اللوحة الجانبية */}
            <div className={`
                fixed md:static inset-y-0 right-0 z-[60] flex flex-col bg-[#0a0a0a]
                border-l border-zeus-gold/20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]
                transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                ${isFullscreen ? 'fixed inset-0 z-[100] w-screen' : ''}
                ${isOpen && !isFullscreen ? 'translate-x-0 w-[90vw] md:w-[600px] lg:w-[700px]' : 'translate-x-full w-0'}
            `}>
                
                {/* Header */}
                <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 border-b border-zeus-gold/20 bg-gradient-to-r from-[#0a0a0a] to-[#111]">
                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-zeus-gold/20 to-yellow-600/20 flex items-center justify-center border border-zeus-gold/30 flex-shrink-0 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
                            <i className="fas fa-file-code text-zeus-gold"></i>
                        </div>
                        <div className="flex flex-col overflow-hidden min-w-0">
                            <h3 className="text-sm font-bold text-white truncate" dir="ltr">
                                {artifact.title}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-mono uppercase">
                                    {artifact.language}
                                </span>
                                {artifact.versions.length > 1 && (
                                    <>
                                        <span className="text-gray-600">•</span>
                                        <button 
                                            onClick={() => setShowVersions(!showVersions)}
                                            className="text-[10px] text-zeus-gold/80 hover:text-zeus-gold font-mono flex items-center gap-1"
                                        >
                                            <i className="fas fa-history"></i>
                                            v{artifact.currentVersion + 1}/{artifact.versions.length}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Tabs */}
                        <div className="hidden md:flex bg-black/50 rounded-lg p-1 border border-white/5 mr-2">
                            <button 
                                onClick={() => setActiveTab('code')}
                                className={`px-3 py-1.5 text-xs rounded-md transition-all font-medium ${
                                    activeTab === 'code' 
                                        ? 'bg-zeus-gold text-black' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <i className="fas fa-code mr-1"></i>
                                Code
                            </button>
                            <button 
                                onClick={() => canPreview && setActiveTab('preview')}
                                className={`px-3 py-1.5 text-xs rounded-md transition-all font-medium ${
                                    !canPreview 
                                        ? 'text-gray-600 cursor-not-allowed opacity-40' 
                                        : activeTab === 'preview'
                                        ? 'bg-zeus-gold text-black'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                                disabled={!canPreview}
                            >
                                <i className="fas fa-eye mr-1"></i>
                                Preview
                            </button>
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1"></div>

                        {/* Actions */}
                        <button 
                            onClick={() => setIsFullscreen(!isFullscreen)} 
                            className="w-9 h-9 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center"
                            title={isFullscreen ? "تصغير" : "ملء الشاشة"}
                        >
                            <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-sm`}></i>
                        </button>

                        <button 
                            onClick={handleCopy}
                            className="w-9 h-9 rounded-lg hover:bg-white/10 text-gray-400 hover:text-zeus-gold transition-all flex items-center justify-center"
                            title="نسخ الكود"
                        >
                            <i className={`fas ${copyState ? 'fa-check text-green-500' : 'fa-copy'} text-sm`}></i>
                        </button>

                        <button 
                            onClick={handleDownload}
                            className="w-9 h-9 rounded-lg hover:bg-white/10 text-gray-400 hover:text-zeus-gold transition-all flex items-center justify-center"
                            title="تنزيل الملف"
                        >
                            <i className="fas fa-download text-sm"></i>
                        </button>

                        <div className="w-px h-6 bg-white/10 mx-1"></div>

                        <button 
                            onClick={onClose}
                            className="w-9 h-9 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center"
                            title="إغلاق"
                        >
                            <i className="fas fa-times text-sm"></i>
                        </button>
                    </div>
                </div>

                {/* قائمة الإصدارات */}
                {showVersions && artifact.versions.length > 1 && (
                    <div className="border-b border-zeus-gold/20 bg-[#0d0d0d] max-h-48 overflow-y-auto custom-scrollbar">
                        <div className="p-3 space-y-1">
                            {artifact.versions.map((version, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        onVersionChange(index);
                                        setShowVersions(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-xs ${
                                        index === artifact.currentVersion
                                            ? 'bg-zeus-gold/20 text-zeus-gold border border-zeus-gold/30'
                                            : 'bg-black/30 text-gray-400 hover:bg-white/5 hover:text-white border border-white/5'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold">النسخة {index + 1}</span>
                                        <span className="text-[10px] opacity-60">
                                            {new Date(version.timestamp).toLocaleTimeString('ar-SA', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    {version.changeDescription && (
                                        <p className="text-[10px] opacity-70 mt-1">{version.changeDescription}</p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* المحتوى */}
                <div className="flex-1 overflow-hidden relative bg-[#0d0d0d]">
                    {activeTab === 'code' ? (
                        <div className="h-full overflow-auto custom-scrollbar">
                            <pre className="m-0 p-6 text-sm font-mono leading-relaxed" dir="ltr">
                                <code 
                                    ref={codeRef} 
                                    className={`language-${artifact.language} bg-transparent`}
                                >
                                    {artifact.content}
                                </code>
                            </pre>
                        </div>
                    ) : (
                        <div className="h-full overflow-auto">
                            {artifact.type.includes('mermaid') ? (
                                <div className="flex items-center justify-center h-full p-6 bg-white">
                                    <div className="text-center">
                                        <i className="fas fa-diagram-project text-6xl text-gray-400 mb-4"></i>
                                        <p className="text-gray-600">معاينة Mermaid قريباً</p>
                                    </div>
                                </div>
                            ) : (
                                <iframe
                                    ref={iframeRef}
                                    className="w-full h-full border-0 bg-white"
                                    sandbox="allow-scripts allow-same-origin"
                                    title="Preview"
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Footer - معلومات إضافية */}
                <div className="h-10 flex-shrink-0 flex items-center justify-between px-4 border-t border-zeus-gold/20 bg-[#0a0a0a] text-[10px] text-gray-500">
                    <span>{artifact.content.split('\n').length} سطر</span>
                    <span>{artifact.content.length.toLocaleString()} حرف</span>
                </div>
            </div>
        </>
    );
};

// --- بطاقة الـ Artifact في المحادثة ---
const ArtifactCard = ({ 
    identifier, 
    manager, 
    onClick,
    isLatest 
}: { 
    identifier: string;
    manager: ArtifactsManager;
    onClick: () => void;
    isLatest: boolean;
}) => {
    const artifact = manager.getArtifact(identifier);
    
    if (!artifact) return null;

    const hasMultipleVersions = artifact.versions.length > 1;
    
    return (
        <div 
            onClick={onClick}
            className="my-4 group/card cursor-pointer bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-zeus-gold/30 hover:border-zeus-gold rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] hover:scale-[1.02] w-full max-w-2xl"
        >
            <div className="p-5 flex items-center gap-4">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-zeus-gold/20 to-yellow-600/20 flex items-center justify-center border border-zeus-gold/40 group-hover/card:scale-110 group-hover/card:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all flex-shrink-0">
                    <i className={`fas ${
                        artifact.language === 'javascript' || artifact.language === 'typescript' 
                            ? 'fa-react text-blue-400' 
                            : artifact.language === 'python'
                            ? 'fa-python text-green-400'
                            : artifact.language === 'html'
                            ? 'fa-html5 text-orange-400'
                            : 'fa-code text-zeus-gold'
                    } text-2xl`}></i>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-white text-base truncate" dir="ltr">
                            {artifact.title}
                        </h4>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-black/50 text-gray-400 border border-white/10 font-mono uppercase">
                            {artifact.language}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <i className="fas fa-code text-zeus-gold/50"></i>
                            {artifact.content.split('\n').length} سطر
                        </span>
                        {hasMultipleVersions && (
                            <span className="flex items-center gap-1 text-zeus-gold/80">
                                <i className="fas fa-history"></i>
                                {artifact.versions.length} نسخة
                            </span>
                        )}
                        {isLatest && (
                            <span className="flex items-center gap-1 text-green-400 animate-pulse">
                                <i className="fas fa-circle text-[6px]"></i>
                                محدّث الآن
                            </span>
                        )}
                    </div>
                </div>

                {/* Arrow */}
                <div className="w-10 h-10 rounded-full bg-zeus-gold/10 border border-zeus-gold/30 flex items-center justify-center text-zeus-gold group-hover/card:bg-zeus-gold group-hover/card:text-black transition-all flex-shrink-0">
                    <i className="fas fa-arrow-left group-hover/card:scale-110 transition-transform"></i>
                </div>
            </div>

            {/* شريط التحميل للـ artifacts قيد الإنشاء */}
            {isLatest && (
                <div className="h-1 w-full bg-zeus-gold/20 overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-transparent via-zeus-gold to-transparent animate-shimmer"></div>
                </div>
            )}
        </div>
    );
};

// --- مكون الرسالة ---
const MessageItem = React.memo(({ 
    msg, 
    isLast, 
    isStreaming,
    forceThinkEnabled,
    settings,
    onAttachmentClick,
    onOpenArtifact,
    manager
}: { 
    msg: Message;
    isLast: boolean;
    isStreaming: boolean;
    forceThinkEnabled: boolean;
    settings: Settings;
    onAttachmentClick: (att: Attachment) => void;
    onOpenArtifact: (identifier: string) => void;
    manager: ArtifactsManager;
}) => {
    const isUser = msg.role === 'user';
    const [isExpanded, setIsExpanded] = useState(false);
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
    const [blocks, setBlocks] = useState<MessageBlock[]>([]);
    const [thinkContent, setThinkContent] = useState('');

    // تحليل المحتوى
    useEffect(() => {
        let text = msg.content || '';
        let extractedThink = '';
        
        // استخراج محتوى التفكير
        const completeThinkRegex = /<(?:think|فكّر|تفكير)>([\s\S]*?)<\/(?:think|فكّر|تفكير)>/gi;
        let match;
        while ((match = completeThinkRegex.exec(text)) !== null) {
            extractedThink += (extractedThink ? '\n\n---\n\n' : '') + match[1].trim();
        }
        text = text.replace(completeThinkRegex, '').trim();
        
        const openTagRegex = /<(?:think|فكّر|تفكير)>/i;
        const openMatch = text.match(openTagRegex);
        if (openMatch) {
            const pendingThink = text.slice(openMatch.index! + openMatch[0].length);
            extractedThink += (extractedThink ? '\n' : '') + pendingThink;
            text = text.slice(0, openMatch.index).trim();
        }
        
        setThinkContent(extractedThink.trim());
        
        if (msg.role === 'user') {
            setBlocks([{ type: 'text', content: text }]);
        } else {
            const parsedBlocks = parseMessageContent(text, manager);
            setBlocks(parsedBlocks);
            
            // فتح آخر artifact تلقائياً
            if (isLast && isStreaming && parsedBlocks.length > 0) {
                const lastBlock = parsedBlocks[parsedBlocks.length - 1];
                if (lastBlock.type === 'artifact') {
                    onOpenArtifact(lastBlock.identifier);
                }
            }
        }
    }, [msg.content, isLast, isStreaming, onOpenArtifact, msg.role, manager]);

    const fullTextAnswer = useMemo(() => {
        return blocks.filter(b => b.type === 'text').map(b => (b as any).content).join('\n');
    }, [blocks]);

    const isWaitingForFirstToken = !isUser && isLast && isStreaming && blocks.length === 0 && thinkContent.length === 0;
    const isDeepThinkMode = thinkContent.length > 0 || (isWaitingForFirstToken && forceThinkEnabled);

    const thinkHtmlContent = useMemo(() => {
        if (!thinkContent) return '';
        return marked.parse(thinkContent) as string;
    }, [thinkContent]);

    const shouldCollapse = useMemo(() => {
        if (!settings.collapseLongMessages) return false;
        if (isUser && settings.collapseTarget === 'assistant') return false;
        if (!isUser && settings.collapseTarget === 'user') return false;
        if (isLast && isStreaming && !isUser) return false;

        const lines = fullTextAnswer.split('\n').length;
        return fullTextAnswer.length > MAX_COLLAPSED_LENGTH_CHARS || lines > settings.maxCollapseLines;
    }, [fullTextAnswer, isLast, isStreaming, isUser, settings]);

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group animate-fade-in px-2`}>
            <div className={`
                relative transition-all duration-300 flex flex-col min-w-[50px] overflow-hidden
                ${isUser 
                    ? 'max-w-[85%] bg-gradient-to-br from-zeus-surface to-gray-900 border border-zeus-gold/30 text-white rounded-2xl rounded-tr-sm p-5 shadow-[0_4px_20px_rgba(255,215,0,0.1)]' 
                    : `max-w-[90%] bg-black/40 backdrop-blur-sm border border-zeus-gold/20 text-gray-100
                       ${isWaitingForFirstToken 
                            ? 'rounded-full py-3 px-6 items-center justify-center' 
                            : 'rounded-2xl rounded-tl-sm p-5' 
                       }`
                }
            `}>
                
                {/* عنوان التفكير العميق */}
                {!isUser && isDeepThinkMode && !isWaitingForFirstToken && (
                    <div 
                        className="flex items-center gap-3 mb-4 pb-3 border-b border-zeus-gold/20 cursor-pointer hover:bg-white/5 -mx-2 px-2 py-1 rounded-lg transition-colors"
                        onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zeus-gold/20 to-yellow-600/20 border border-zeus-gold/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
                            <i className="fas fa-brain text-zeus-gold text-sm"></i>
                        </div>
                        <div className="flex-1">
                            <span className="text-sm font-bold text-zeus-gold">عملية التفكير العميق</span>
                        </div>
                        <i className={`fas fa-chevron-down text-xs text-gray-500 transition-transform ${isThinkingExpanded ? 'rotate-180' : ''}`}></i>
                    </div>
                )}

                {/* محتوى التفكير */}
                {!isUser && isDeepThinkMode && isThinkingExpanded && thinkContent && (
                    <div className="mb-4 p-4 bg-black/30 border border-zeus-gold/10 rounded-xl">
                        <div 
                            className="markdown-body text-gray-300 text-sm leading-relaxed opacity-90" 
                            dangerouslySetInnerHTML={{ __html: thinkHtmlContent }} 
                        />
                    </div>
                )}

                {/* حالة الانتظار */}
                {isWaitingForFirstToken && (
                    <div className="flex items-center gap-3">
                        <div className="relative w-5 h-5">
                            <svg className="absolute inset-0 w-full h-full text-zeus-gold" viewBox="0 0 50 50">
                                <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="animate-dash-flow" strokeDasharray="28 6 28 6 28 30" />
                            </svg>
                            <i className="fas fa-bolt text-[8px] text-zeus-gold absolute inset-0 flex items-center justify-center"></i>
                        </div>
                        <span className="text-sm font-medium text-zeus-gold animate-pulse">
                            {isDeepThinkMode ? 'جاري التفكير العميق...' : 'لحظة من فضلك...'}
                        </span>
                    </div>
                )}

                {/* عنوان المستخدم */}
                {isUser && (
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                            <i className="fas fa-user text-blue-400 text-xs"></i>
                        </div>
                        <span className="text-xs font-bold text-zeus-goldDim">أنت</span>
                    </div>
                )}

                {/* المرفقات */}
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-4">
                        {msg.attachments.map((att, i) => (
                            <div key={i} className="animate-scale-up" style={{animationDelay: `${i * 100}ms`}}>
                                {att.dataType === 'image' ? (
                                    <div 
                                        onClick={() => onAttachmentClick(att)} 
                                        className="relative w-40 h-40 rounded-xl overflow-hidden group/img cursor-pointer border border-white/20 hover:border-zeus-gold/50 shadow-lg transition-all duration-300 hover:scale-105 bg-black/50"
                                    >
                                        <img 
                                            src={`data:${att.mimeType};base64,${att.content}`} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" 
                                            alt={att.name} 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity">
                                            <div className="absolute bottom-2 left-2 right-2">
                                                <p className="text-white text-xs font-medium truncate" dir="ltr">{att.name}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => onAttachmentClick(att)} 
                                        className="group/file cursor-pointer flex items-center gap-3 bg-[#0d0d0d] hover:bg-zeus-gold/5 border border-white/20 hover:border-zeus-gold/40 rounded-xl p-4 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,215,0,0.1)] min-w-[220px]"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-white/10 group-hover/file:border-zeus-gold/30 group-hover/file:scale-110 transition-all shadow-inner">
                                            <i className="fas fa-file-code text-2xl text-blue-400 group-hover/file:text-zeus-gold transition-colors"></i>
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-sm font-bold text-gray-200 truncate" dir="ltr">{att.name}</span>
                                            <span className="text-xs text-gray-500">{(att.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* محتوى الرسالة */}
                {!isWaitingForFirstToken && (
                    <>
                        {shouldCollapse && !isExpanded ? (
                            <div 
                                className="markdown-body leading-relaxed break-words mask-bottom" 
                                style={{ fontSize: 'var(--message-font-size)' }} 
                                dangerouslySetInnerHTML={{ __html: marked.parse(fullTextAnswer.slice(0, MAX_COLLAPSED_LENGTH_CHARS) + '...') as string }} 
                            />
                        ) : (
                            blocks.map((block, idx) => {
                                if (block.type === 'text') {
                                    return (
                                        <div 
                                            key={idx} 
                                            className="markdown-body leading-relaxed break-words" 
                                            style={{ fontSize: 'var(--message-font-size)' }} 
                                            dangerouslySetInnerHTML={{ __html: marked.parse(block.content) as string }} 
                                        />
                                    );
                                } else if (block.type === 'artifact') {
                                    return (
                                        <ArtifactCard 
                                            key={idx} 
                                            identifier={block.identifier} 
                                            manager={manager}
                                            onClick={() => onOpenArtifact(block.identifier)}
                                            isLatest={isLast && isStreaming && idx === blocks.length - 1}
                                        />
                                    );
                                }
                                return null;
                            })
                        )}

                        {/* زر التوسيع/الطي */}
                        {shouldCollapse && (
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)} 
                                className="w-full mt-3 py-2.5 text-xs font-bold text-zeus-gold bg-zeus-gold/5 hover:bg-zeus-gold/10 border border-zeus-gold/30 hover:border-zeus-gold/50 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {isExpanded ? (
                                    <>
                                        <i className="fas fa-chevron-up"></i> 
                                        طي الرسالة
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-chevron-down"></i> 
                                        عرض المزيد ({fullTextAnswer.length.toLocaleString()} حرف)
                                    </>
                                )}
                            </button>
                        )}

                        {/* مؤشر الكتابة */}
                        {!isUser && isLast && isStreaming && blocks.length > 0 && blocks[blocks.length - 1].type !== 'artifact' && (
                            <span className="inline-block w-2 h-4 bg-zeus-gold ml-1 animate-pulse"></span>
                        )}
                    </>
                )}

                {/* Footer */}
                {!isWaitingForFirstToken && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[10px] text-gray-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity" dir="ltr">
                            {new Date(msg.timestamp).toLocaleTimeString('ar-SA', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })}
                        </span>
                        {fullTextAnswer && (
                            <button 
                                onClick={() => navigator.clipboard.writeText(fullTextAnswer)} 
                                className="text-gray-500 hover:text-zeus-gold transition-colors p-1.5 rounded hover:bg-white/5"
                                title="نسخ"
                            >
                                <i className="fas fa-copy text-xs"></i>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

// --- المكون الرئيسي ---
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
    const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(null);
    
    // نظام الـ Artifacts
    const [artifactsManager] = useState(() => new ArtifactsManager());
    const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
    const [isArtifactOpen, setIsArtifactOpen] = useState(false);

    const isAtBottomRef = useRef(true);
    const [visibleCount, setVisibleCount] = useState(50);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const prevScrollHeightRef = useRef<number>(0);

    const activeArtifact = activeArtifactId ? artifactsManager.getArtifact(activeArtifactId) : null;

    // التمرير للأسفل
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior
            });
            isAtBottomRef.current = true;
            setShowScrollButton(false);
        }
    };

    // إعادة تعيين عند تغيير المحادثة
    useEffect(() => {
        setVisibleCount(50);
        setIsLoadingHistory(false);
        setShowScrollButton(false);
        isAtBottomRef.current = true;
        
        // إعادة تعيين الـ artifacts
        artifactsManager.reset();
        setActiveArtifactId(null);
        setIsArtifactOpen(false);

        // إعادة بناء الـ artifacts من تاريخ المحادثة
        if (chat?.messages) {
            chat.messages.forEach(msg => {
                if (msg.role !== 'user') {
                    parseMessageContent(msg.content, artifactsManager);
                }
            });
        }

        setTimeout(() => scrollToBottom('instant'), 50);
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

    // معالجة التمرير
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const isAtBottom = distanceFromBottom < 100;
        isAtBottomRef.current = isAtBottom;
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

    // التمرير التلقائي أثناء البث
    const lastMessage = displayedMessages[displayedMessages.length - 1];
    const lastMessageContentLength = lastMessage?.content?.length || 0;

    useEffect(() => {
        if (chat && chat.messages.length > 0) {
            if (isStreaming && isAtBottomRef.current) {
                scrollToBottom('auto');
            } else if (!isStreaming && isAtBottomRef.current) {
                scrollToBottom('smooth');
            }
        }
    }, [lastMessageContentLength, isStreaming, displayedMessages.length]);

    // ضبط ارتفاع textarea
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

    // إعداد marked
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
        renderer.link = ({ href, title, text }) => 
            `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer" class="text-zeus-gold hover:underline">${text}</a>`;
        marked.setOptions({ renderer, gfm: true, breaks: true });
    }, []);

    // معالجة الملفات
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
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

    const readFile = (file: File): Promise<string> => {
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

    const handleOpenArtifact = (identifier: string) => {
        setActiveArtifactId(identifier);
        setIsArtifactOpen(true);
    };

    const handleVersionChange = (versionIndex: number) => {
        if (activeArtifactId) {
            artifactsManager.goToVersion(activeArtifactId, versionIndex);
            setActiveArtifactId(activeArtifactId); // تحديث الحالة
        }
    };

    const handleExport = (format: 'copy' | 'download') => {
        if (!activeArtifact) return;

        if (format === 'download') {
            const extension = activeArtifact.language === 'python' ? 'py' 
                : activeArtifact.language === 'javascript' ? 'js'
                : activeArtifact.language === 'typescript' ? 'ts'
                : activeArtifact.language === 'html' ? 'html'
                : 'txt';
            
            const filename = activeArtifact.title.includes('.') 
                ? activeArtifact.title 
                : `${activeArtifact.title}.${extension}`;

            const blob = new Blob([activeArtifact.content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    // شاشة البداية
    if (!chat) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                <div className="w-32 h-32 rounded-full border-2 border-zeus-gold bg-gradient-to-br from-black to-gray-900 flex items-center justify-center mb-6 animate-float shadow-[0_0_40px_rgba(255,215,0,0.3)]">
                    <i className="fas fa-bolt text-6xl text-zeus-gold drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]"></i>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg">
                    مرحباً بك في عرش زيوس
                </h2>
                <p className="text-zeus-gold/80 max-w-lg text-lg mb-8 leading-relaxed">
                    إله الرعد والحكمة في خدمتك. اختر نموذجاً، أرفق ملفاتك، واسأل عما تشاء.
                </p>
                <button 
                    onClick={onNewChat} 
                    className="px-10 py-4 bg-gradient-to-r from-zeus-gold to-yellow-500 text-black font-bold text-lg rounded-xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,215,0,0.4)] hover:shadow-[0_0_40px_rgba(255,215,0,0.6)] flex items-center gap-3"
                >
                    <i className="fas fa-plus"></i>
                    بدء محادثة جديدة
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex overflow-hidden md:mx-4 md:mb-4 glass-gold md:rounded-2xl border-0 md:border border-zeus-gold/20 shadow-2xl relative">
            {/* منطقة المحادثة */}
            <div className={`flex flex-col h-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isArtifactOpen ? 'w-full md:w-[calc(100%-600px)] lg:w-[calc(100%-700px)]' : 'w-full'}`}>
                
                {/* منطقة الرسائل */}
                <div 
                    ref={containerRef} 
                    onScroll={handleScroll} 
                    className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6 custom-scrollbar"
                >
                    {isLoadingHistory && (
                        <div className="flex justify-center py-4">
                            <div className="w-7 h-7 border-3 border-zeus-gold border-t-transparent rounded-full animate-spin"></div>
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
                            onOpenArtifact={handleOpenArtifact}
                            manager={artifactsManager}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* منطقة الإدخال */}
                <div className="p-4 md:p-5 bg-black/50 backdrop-blur-xl border-t border-zeus-gold/20 relative">
                    {/* زر العودة للأسفل */}
                    {showScrollButton && (
                        <button 
                            onClick={() => scrollToBottom('smooth')} 
                            className="absolute bottom-full right-6 mb-4 w-12 h-12 bg-black/80 backdrop-blur-md border-2 border-zeus-gold/50 rounded-full flex items-center justify-center text-zeus-gold shadow-[0_0_25px_rgba(255,215,0,0.4)] hover:scale-110 hover:bg-zeus-gold hover:text-black transition-all duration-300 animate-bounce"
                            title="العودة للأحدث"
                        >
                            <i className="fas fa-arrow-down text-lg"></i>
                        </button>
                    )}

                    {/* المرفقات المعلقة */}
                    {attachments.length > 0 && (
                        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                            {attachments.map((att, i) => (
                                <div 
                                    key={i} 
                                    className="relative bg-zeus-surface/50 backdrop-blur-sm border border-zeus-gold/30 rounded-xl p-3 flex items-center gap-3 group min-w-[140px]"
                                >
                                    <button 
                                        onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} 
                                        className="absolute -top-2 -left-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-all shadow-lg z-10"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                    <i className={`fas ${att.dataType === 'image' ? 'fa-image text-purple-400' : 'fa-file-alt text-blue-400'} text-xl`}></i>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-xs text-white font-medium truncate" dir="ltr">{att.name}</span>
                                        <span className="text-[10px] text-gray-400">{(att.size / 1024).toFixed(1)} KB</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* شريط الإدخال */}
                    <div className="relative flex items-end bg-black/70 backdrop-blur-sm border-2 border-zeus-gold/30 rounded-2xl shadow-[0_0_20px_rgba(255,215,0,0.08)] transition-all focus-within:shadow-[0_0_25px_rgba(255,215,0,0.15)] focus-within:border-zeus-gold/50 overflow-hidden">
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="h-14 w-14 text-gray-400 hover:text-zeus-gold hover:bg-white/5 transition-all flex items-center justify-center border-l border-zeus-gold/30"
                            title="إرفاق ملف"
                        >
                            <i className="fas fa-paperclip text-xl"></i>
                        </button>
                        <input 
                            type="file" 
                            multiple 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileSelect}
                        />

                        <button 
                            onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                            className={`h-14 w-14 transition-all flex items-center justify-center border-l border-zeus-gold/30 ${
                                isThinkingEnabled 
                                    ? 'text-zeus-gold bg-zeus-gold/15 shadow-inner' 
                                    : 'text-gray-400 hover:text-zeus-gold hover:bg-white/5'
                            }`}
                            title={isThinkingEnabled ? "وضع التفكير العميق مفعّل" : "تفعيل التفكير العميق"}
                        >
                            <i className={`fas fa-brain text-xl ${isThinkingEnabled ? 'animate-pulse' : ''}`}></i>
                        </button>

                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={isThinkingEnabled ? "اسأل بعمق... 🧠" : "اسأل أي شيء..."}
                            dir={textDirection}
                            className="flex-1 bg-transparent border-none outline-none text-white resize-none py-4 px-4 placeholder-gray-500 text-base scrollbar-thin"
                            style={{ height: 'auto', maxHeight: '200px', overflowY: 'hidden' }}
                            rows={1}
                        />

                        {isStreaming ? (
                            <button 
                                onClick={onStop}
                                className="h-14 w-14 transition-all flex items-center justify-center border-r border-zeus-gold/30 text-red-500 hover:bg-red-500/15 hover:text-red-400"
                                title="إيقاف التوليد"
                            >
                                <i className="fas fa-stop text-xl animate-pulse"></i>
                            </button>
                        ) : (
                            <button 
                                onClick={handleSubmit}
                                disabled={!inputValue.trim() && attachments.length === 0}
                                className={`h-14 w-14 transition-all flex items-center justify-center border-r border-zeus-gold/30 ${
                                    (!inputValue.trim() && attachments.length === 0)
                                        ? 'text-gray-600 cursor-not-allowed'
                                        : 'text-zeus-gold hover:bg-zeus-gold/15 hover:text-yellow-400 hover:scale-110'
                                }`}
                            >
                                <i className="fas fa-paper-plane text-xl"></i>
                            </button>
                        )}
                    </div>

                    <div className="text-center mt-2 text-[10px] text-gray-500">
                        زيوس قد يخطئ، راجع المعلومات المهمة.
                    </div>
                </div>
            </div>

            {/* عارض الـ Artifacts */}
            <ArtifactViewer
                artifact={activeArtifact}
                isOpen={isArtifactOpen}
                onClose={() => setIsArtifactOpen(false)}
                onVersionChange={handleVersionChange}
                onExport={handleExport}
            />

            {/* نافذة عرض المرفقات */}
            <AttachmentModal
                attachment={viewingAttachment}
                onClose={() => setViewingAttachment(null)}
            />
        </div>
    );
};

export default ChatWindow;