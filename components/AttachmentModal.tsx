import React, { useState, useEffect } from 'react';
import { Attachment } from '../types';

interface Props {
    attachment: Attachment | null;
    onClose: () => void;
}

const AttachmentModal: React.FC<Props> = ({ attachment, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    useEffect(() => {
        if (!attachment) {
            setIsClosing(false);
            setCopyStatus('idle');
        }
    }, [attachment]);

    if (!attachment && !isClosing) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setCopyStatus('idle');
        }, 300);
    };

    const handleDownload = () => {
        if (!attachment) return;
        
        let href = '';
        if (attachment.dataType === 'image') {
            href = `data:${attachment.mimeType};base64,${attachment.content}`;
        } else {
            const blob = new Blob([attachment.content], { type: attachment.type || 'text/plain' });
            href = URL.createObjectURL(blob);
        }
        
        const link = document.createElement('a');
        link.href = href;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (attachment.dataType !== 'image') URL.revokeObjectURL(href);
    };

    const handleCopy = () => {
        if (!attachment || attachment.dataType !== 'text') return;
        navigator.clipboard.writeText(attachment.content).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };

    // Prevent propagation to close when clicking content
    const stopProp = (e: React.MouseEvent) => e.stopPropagation();

    const isImage = attachment?.dataType === 'image';

    return (
        <div 
            className={`fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center transition-all duration-300 ${isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            onClick={handleClose}
            dir="rtl"
        >
            {/* Header / Toolbar */}
            <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent z-20 pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto bg-black/40 backdrop-blur-md p-2 pr-3 rounded-full border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-zeus-gold/10 flex items-center justify-center border border-zeus-gold/20 text-zeus-gold shadow-[0_0_15px_rgba(255,215,0,0.1)]">
                        <i className={`fas ${isImage ? 'fa-image' : 'fa-file-code'}`}></i>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm md:text-base max-w-[150px] md:max-w-xs truncate" dir="ltr">{attachment?.name}</h3>
                        <p className="text-[10px] text-gray-400 font-mono">{(attachment?.size || 0 / 1024).toFixed(1)} KB</p>
                    </div>
                </div>
                
                <button 
                    onClick={handleClose}
                    className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 hover:rotate-90 hover:scale-110 flex items-center justify-center text-white transition-all pointer-events-auto border border-white/5"
                >
                    <i className="fas fa-times text-lg"></i>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 w-full h-full overflow-hidden flex items-center justify-center p-4 md:p-10 relative">
                <div 
                    className={`relative max-w-full max-h-full transition-all duration-500 ease-out flex flex-col ${isClosing ? 'scale-90 opacity-0 translate-y-10' : 'scale-100 opacity-100 translate-y-0'}`}
                    onClick={stopProp}
                >
                    {isImage ? (
                        <div className="relative group rounded-lg overflow-hidden shadow-2xl shadow-black/50">
                            <div className="absolute inset-0 bg-zeus-gold/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none mix-blend-overlay"></div>
                            <img 
                                src={`data:${attachment.mimeType};base64,${attachment.content}`} 
                                alt={attachment.name}
                                className="max-w-full max-h-[75vh] md:max-h-[80vh] object-contain rounded-lg border border-white/10"
                            />
                        </div>
                    ) : (
                        <div className="w-[90vw] md:w-[60vw] max-h-[75vh] flex flex-col rounded-xl overflow-hidden border border-zeus-gold/20 bg-[#0d0d0d] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                             {/* Mac-style Window Header */}
                             <div className="bg-[#1a1a1a] px-4 py-3 border-b border-white/5 flex items-center justify-between select-none">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors"></div>
                                </div>
                                <span className="text-xs text-gray-500 font-mono">READ ONLY</span>
                             </div>
                             
                             <div className="flex-1 overflow-auto custom-scrollbar relative">
                                 <pre className="p-6 text-sm md:text-base font-mono text-gray-300 leading-relaxed" dir="ltr">
                                    <code>{attachment?.content}</code>
                                 </pre>
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Action Bar */}
            <div 
                className={`absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#111]/90 backdrop-blur-md border border-zeus-gold/30 p-2 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)] z-30 flex items-center gap-2 transition-all duration-500 ${isClosing ? 'translate-y-20 opacity-0' : 'translate-y-0 opacity-100'}`} 
                onClick={stopProp}
            >
                <button 
                    onClick={handleDownload}
                    className="flex flex-col items-center justify-center w-16 h-14 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-zeus-gold/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                    <i className="fas fa-download text-lg mb-1 relative z-10 group-hover:-translate-y-1 transition-transform"></i>
                    <span className="text-[9px] font-bold relative z-10 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1">تنزيل</span>
                </button>

                {!isImage && (
                    <>
                        <div className="w-px h-8 bg-white/10"></div>
                        <button 
                            onClick={handleCopy}
                            className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl hover:bg-white/10 transition-all group relative overflow-hidden ${copyStatus === 'copied' ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}
                        >
                             <div className={`absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform ${copyStatus === 'copied' ? 'bg-green-500/10' : 'bg-zeus-gold/10'}`}></div>
                            <i className={`fas ${copyStatus === 'copied' ? 'fa-check' : 'fa-copy'} text-lg mb-1 relative z-10 group-hover:-translate-y-1 transition-transform`}></i>
                            <span className="text-[9px] font-bold relative z-10 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1">
                                {copyStatus === 'copied' ? 'تم' : 'نسخ'}
                            </span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default AttachmentModal;