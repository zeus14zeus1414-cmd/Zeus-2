import React, { useRef, useEffect, useState, useMemo } from 'react';
import hljs from 'highlight.js';

// ==================== نظام إدارة النسخ والتحديثات ====================
class ArtifactVersionManager {
    constructor() {
        this.artifacts = new Map(); // identifier -> array of versions
    }

    /**
     * إنشاء artifact جديد أو الحصول على النسخة الأخيرة
     */
    processArtifact(data) {
        const { identifier, content, title, type, action } = data;
        
        if (!this.artifacts.has(identifier)) {
            // إنشاء جديد
            const version = {
                id: 1,
                content,
                title,
                type,
                timestamp: Date.now(),
                action: 'create'
            };
            this.artifacts.set(identifier, [version]);
            return version;
        }

        // التحديث
        const versions = this.artifacts.get(identifier);
        const lastVersion = versions[versions.length - 1];

        let newContent = content;

        // تطبيق الـ Diff إذا كان التحديث جزئياً
        if (action === 'diff' || action === 'update') {
            newContent = this.applyDiff(lastVersion.content, content);
        }

        const newVersion = {
            id: versions.length + 1,
            content: newContent,
            title: title || lastVersion.title,
            type: type || lastVersion.type,
            timestamp: Date.now(),
            action: action || 'update',
            diffContent: (action === 'diff' || action === 'update') ? content : null
        };

        versions.push(newVersion);
        this.artifacts.set(identifier, versions);

        return newVersion;
    }

    /**
     * محرك Diff ذكي - يدعم عدة أنماط
     */
    applyDiff(original, diffContent) {
        // Pattern 1: <<<<old====new>>>> blocks
        const blockPattern = /<<<<\s*([\s\S]*?)\s*====\s*([\s\S]*?)\s*>>>>/g;
        let result = original;
        let matches = [];
        let match;

        while ((match = blockPattern.exec(diffContent)) !== null) {
            matches.push({
                old: match[1],
                new: match[2]
            });
        }

        if (matches.length > 0) {
            // تطبيق كل الـ diffs
            matches.forEach(({ old, new: newText }) => {
                const trimmedOld = old.trim();
                const trimmedNew = newText.trim();
                
                if (trimmedOld && result.includes(trimmedOld)) {
                    result = result.replace(trimmedOld, trimmedNew);
                } else if (trimmedOld) {
                    // محاولة بدون المسافات الزائدة
                    const normalizedOld = trimmedOld.replace(/\s+/g, ' ');
                    const normalizedResult = result.replace(/\s+/g, ' ');
                    
                    if (normalizedResult.includes(normalizedOld)) {
                        // استبدال تقريبي
                        const index = normalizedResult.indexOf(normalizedOld);
                        if (index !== -1) {
                            result = result.substring(0, this.findActualIndex(result, index)) +
                                    trimmedNew +
                                    result.substring(this.findActualIndex(result, index + normalizedOld.length));
                        }
                    }
                }
            });
            return result;
        }

        // Pattern 2: JSON format
        try {
            const diffObj = JSON.parse(diffContent);
            if (diffObj.old && diffObj.new) {
                return result.replace(diffObj.old, diffObj.new);
            }
        } catch (e) {
            // Not JSON, continue
        }

        // Pattern 3: استبدال كامل (fallback)
        return diffContent;
    }

    findActualIndex(text, normalizedIndex) {
        let actual = 0;
        let normalized = 0;
        
        while (normalized < normalizedIndex && actual < text.length) {
            if (text[actual] !== ' ' || text[actual - 1] !== ' ') {
                normalized++;
            }
            actual++;
        }
        
        return actual;
    }

    getVersions(identifier) {
        return this.artifacts.get(identifier) || [];
    }

    getVersion(identifier, versionId) {
        const versions = this.getVersions(identifier);
        return versions.find(v => v.id === versionId);
    }

    getCurrentVersion(identifier) {
        const versions = this.getVersions(identifier);
        return versions[versions.length - 1];
    }
}

// Singleton instance
const versionManager = new ArtifactVersionManager();

// ==================== مكون العرض الرئيسي ====================
const ArtifactViewer = ({ 
    artifact, 
    onClose, 
    isOpen, 
    isFullscreen, 
    onToggleFullscreen 
}) => {
    const [currentMode, setCurrentMode] = useState('code'); // 'code' or 'preview'
    const [currentVersionId, setCurrentVersionId] = useState(null);
    const [copyState, setCopyState] = useState(false);
    const [shareState, setShareState] = useState(false);
    const codeRef = useRef(null);
    const iframeRef = useRef(null);
    const [processedArtifact, setProcessedArtifact] = useState(null);

    // معالجة الـ artifact الجديد أو المحدث
    useEffect(() => {
        if (artifact) {
            const processed = versionManager.processArtifact(artifact);
            setProcessedArtifact(processed);
            setCurrentVersionId(processed.id);
            
            // التبديل التلقائي للـ preview إذا كان HTML
            if (processed.type === 'text/html') {
                setCurrentMode('preview');
            }
        }
    }, [artifact]);

    // تمييز الكود
    useEffect(() => {
        if (processedArtifact && codeRef.current && currentMode === 'code') {
            delete codeRef.current.dataset.highlighted;
            hljs.highlightElement(codeRef.current);
        }
    }, [processedArtifact?.content, currentMode]);

    if (!artifact || !processedArtifact) return null;

    const versions = versionManager.getVersions(artifact.identifier);
    const currentVersion = currentVersionId 
        ? versionManager.getVersion(artifact.identifier, currentVersionId)
        : processedArtifact;

    if (!currentVersion) return null;

    // الحصول على اللغة
    const getLanguage = () => {
        const type = currentVersion.type;
        const title = currentVersion.title;
        
        if (type.includes('react') || title.endsWith('.jsx') || title.endsWith('.tsx')) return 'javascript';
        if (type.includes('html') || title.endsWith('.html')) return 'html';
        if (type.includes('python') || title.endsWith('.py')) return 'python';
        if (type.includes('css') || title.endsWith('.css')) return 'css';
        if (type.includes('json') || title.endsWith('.json')) return 'json';
        if (type.includes('typescript') || title.endsWith('.ts')) return 'typescript';
        if (type.includes('mermaid')) return 'mermaid';
        
        return 'plaintext';
    };

    const language = getLanguage();
    const canPreview = currentVersion.type === 'text/html';

    // دوال الإجراءات
    const handleCopy = async () => {
        await navigator.clipboard.writeText(currentVersion.content);
        setCopyState(true);
        setTimeout(() => setCopyState(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([currentVersion.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        let extension = 'txt';
        if (currentVersion.type.includes('html')) extension = 'html';
        else if (currentVersion.type.includes('react')) extension = 'jsx';
        else if (currentVersion.type.includes('python')) extension = 'py';
        else if (currentVersion.type.includes('javascript')) extension = 'js';
        else if (currentVersion.type.includes('typescript')) extension = 'ts';
        else if (currentVersion.type.includes('css')) extension = 'css';
        
        a.download = currentVersion.title.includes('.') 
            ? currentVersion.title 
            : `${currentVersion.title}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleShare = async () => {
        // في التطبيق الحقيقي، يتم رفع الملف والحصول على رابط
        const mockUrl = `${window.location.origin}/artifact/${artifact.identifier}`;
        await navigator.clipboard.writeText(mockUrl);
        setShareState(true);
        setTimeout(() => setShareState(false), 2000);
    };

    const handleVersionChange = (direction) => {
        const currentIndex = versions.findIndex(v => v.id === currentVersionId);
        if (direction === 'prev' && currentIndex > 0) {
            setCurrentVersionId(versions[currentIndex - 1].id);
        } else if (direction === 'next' && currentIndex < versions.length - 1) {
            setCurrentVersionId(versions[currentIndex + 1].id);
        }
    };

    const currentIndex = versions.findIndex(v => v.id === currentVersionId);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < versions.length - 1;

    // عرض الـ Preview
    const renderPreview = () => {
        if (currentVersion.type === 'text/html') {
            return (
                <iframe
                    ref={iframeRef}
                    srcDoc={currentVersion.content}
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    title="HTML Preview"
                />
            );
        }
        
        return (
            <div className="flex items-center justify-center h-full text-gray-500 bg-zinc-900">
                <div className="text-center p-8">
                    <i className="fas fa-eye-slash text-5xl mb-4 opacity-50"></i>
                    <p className="text-sm">Preview غير متوفر لهذا النوع من الملفات</p>
                    <p className="text-xs mt-2 opacity-70">استخدم وضع Code للعرض</p>
                </div>
            </div>
        );
    };

    return (
        <div className={`
            transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col bg-[#0d0d0d]
            ${isFullscreen 
                ? 'fixed inset-0 z-[100] w-full h-full' 
                : `fixed inset-0 z-[60] md:static md:z-auto md:inset-auto ${
                    isOpen 
                        ? 'translate-x-0 opacity-100 md:w-1/2 md:border-l md:border-zinc-800' 
                        : 'translate-x-full opacity-0 md:w-0 md:border-none md:overflow-hidden pointer-events-none'
                }`
            }
        `}>
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <button 
                        onClick={onClose} 
                        className="md:hidden text-gray-400 hover:text-white p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <i className="fas fa-arrow-right"></i>
                    </button>
                    
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center border border-yellow-500/20 shrink-0 shadow-lg">
                        <i className="fas fa-code text-black"></i>
                    </div>
                    
                    <div className="flex flex-col overflow-hidden">
                        <h3 className="text-sm font-bold text-white truncate w-full" dir="ltr">
                            {currentVersion.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                            <span>{language}</span>
                            {versions.length > 1 && (
                                <>
                                    <span>•</span>
                                    <i className="fas fa-clock"></i>
                                    <span>v{currentVersion.id} of {versions.length}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mode Toggle */}
                    <div className="hidden md:flex bg-zinc-800 rounded-lg p-1 border border-zinc-700">
                        <button 
                            onClick={() => setCurrentMode('code')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                                currentMode === 'code'
                                    ? 'bg-zinc-700 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <i className="fas fa-code"></i>
                            Code
                        </button>
                        <button 
                            onClick={() => canPreview && setCurrentMode('preview')}
                            disabled={!canPreview}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                                currentMode === 'preview'
                                    ? 'bg-zinc-700 text-white shadow-lg'
                                    : canPreview
                                        ? 'text-gray-400 hover:text-white'
                                        : 'text-gray-600 cursor-not-allowed opacity-50'
                            }`}
                            title={!canPreview ? 'Preview غير متوفر' : 'معاينة مباشرة'}
                        >
                            <i className="fas fa-eye"></i>
                            Preview
                        </button>
                    </div>

                    <div className="w-px h-6 bg-zinc-700 mx-1"></div>

                    {/* Fullscreen Toggle */}
                    <button 
                        onClick={onToggleFullscreen} 
                        className="hidden md:flex w-9 h-9 rounded-lg hover:bg-zinc-800 text-gray-400 hover:text-white transition-colors items-center justify-center" 
                        title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
                    >
                        <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
                    </button>

                    {/* Actions */}
                    <button 
                        onClick={handleCopy} 
                        className="w-9 h-9 rounded-lg hover:bg-zinc-800 text-gray-400 hover:text-white transition-colors flex items-center justify-center" 
                        title="نسخ"
                    >
                        <i className={`fas ${copyState ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                    </button>

                    <button 
                        onClick={handleDownload} 
                        className="w-9 h-9 rounded-lg hover:bg-zinc-800 text-gray-400 hover:text-white transition-colors flex items-center justify-center" 
                        title="تنزيل"
                    >
                        <i className="fas fa-download"></i>
                    </button>

                    <button 
                        onClick={handleShare} 
                        className="w-9 h-9 rounded-lg hover:bg-gradient-to-r hover:from-yellow-500 hover:to-orange-500 text-gray-400 hover:text-black transition-all flex items-center justify-center font-bold" 
                        title="مشاركة"
                    >
                        <i className={`fas ${shareState ? 'fa-check' : 'fa-share-alt'}`}></i>
                    </button>

                    <button 
                        onClick={onClose} 
                        className="hidden md:flex w-9 h-9 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors items-center justify-center" 
                        title="إغلاق"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto custom-scrollbar relative bg-[#0d0d0d]" dir="ltr">
                {currentMode === 'preview' && canPreview ? (
                    renderPreview()
                ) : (
                    <pre className="m-0 p-4 md:p-6 text-sm font-mono leading-relaxed">
                        <code ref={codeRef} className={`language-${language} bg-transparent p-0`}>
                            {currentVersion.content}
                        </code>
                    </pre>
                )}
            </div>

            {/* Footer with Version Control */}
            {versions.length > 1 && (
                <div className="h-12 border-t border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50 backdrop-blur-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleVersionChange('prev')}
                            disabled={!hasPrev}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                hasPrev
                                    ? 'hover:bg-zinc-800 text-gray-400 hover:text-white'
                                    : 'text-gray-600 cursor-not-allowed opacity-50'
                            }`}
                            title="النسخة السابقة"
                        >
                            <i className="fas fa-chevron-left"></i>
                        </button>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg border border-zinc-700">
                            <i className="fas fa-clock text-xs text-gray-500"></i>
                            <span className="text-xs font-mono text-gray-300">
                                {currentVersion.id} / {versions.length}
                            </span>
                        </div>

                        <button
                            onClick={() => handleVersionChange('next')}
                            disabled={!hasNext}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                hasNext
                                    ? 'hover:bg-zinc-800 text-gray-400 hover:text-white'
                                    : 'text-gray-600 cursor-not-allowed opacity-50'
                            }`}
                            title="النسخة التالية"
                        >
                            <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>

                    <div className="text-[10px] text-gray-500 font-mono">
                        {new Date(currentVersion.timestamp).toLocaleString('ar-IQ', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'short'
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArtifactViewer;
