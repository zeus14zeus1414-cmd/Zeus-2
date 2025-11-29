import React, { useState, useEffect, useRef } from 'react';

interface DeleteModalProps {
    isOpen: boolean;
    chatTitle: string;
    onClose: () => void;
    onConfirm: () => void;
}

interface RenameModalProps {
    isOpen: boolean;
    initialTitle: string;
    onClose: () => void;
    onRename: (newTitle: string) => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, chatTitle, onClose, onConfirm }) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
        }
    }, [isOpen]);

    if (!isOpen && !isClosing) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    const handleConfirm = () => {
        setIsClosing(true);
        setTimeout(() => {
            onConfirm();
            setIsClosing(false);
        }, 300);
    };

    return (
        <div 
            className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} 
            dir="rtl"
            onClick={handleClose}
        >
            {/* Modal Content */}
            <div 
                className={`relative bg-zeus-surface border border-red-500/30 w-full max-w-md rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.2)] p-6 overflow-hidden ${isClosing ? 'animate-scale-down' : 'animate-scale-up'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-3xl rounded-full pointer-events-none"></div>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                        <i className="fas fa-trash-alt text-2xl text-red-500"></i>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">حذف المحادثة؟</h3>
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                        هل أنت متأكد من رغبتك في حذف <span className="text-zeus-gold font-bold">"{chatTitle}"</span>؟
                        <br />
                        لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.
                    </p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={handleClose}
                            className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors border border-white/5"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold transition-all shadow-lg shadow-red-900/40 transform hover:scale-[1.02]"
                        >
                            نعم، احذف
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const RenameModal: React.FC<RenameModalProps> = ({ isOpen, initialTitle, onClose, onRename }) => {
    const [title, setTitle] = useState(initialTitle);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setTitle(initialTitle);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialTitle]);

    if (!isOpen && !isClosing) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (title.trim()) {
            setIsClosing(true);
            setTimeout(() => {
                onRename(title.trim());
                setIsClosing(false);
            }, 300);
        }
    };

    return (
        <div 
            className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} 
            dir="rtl"
            onClick={handleClose}
        >
            {/* Modal Content */}
            <div 
                className={`relative bg-[#0a0a0a] border border-zeus-gold/30 w-full max-w-md rounded-2xl shadow-[0_0_40px_rgba(255,215,0,0.15)] p-6 overflow-hidden ${isClosing ? 'animate-scale-down' : 'animate-scale-up'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decoration */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-zeus-gold/5 blur-3xl rounded-full pointer-events-none"></div>

                <div className="flex flex-col relative z-10">
                    <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                        <div className="w-10 h-10 rounded-lg bg-zeus-gold/10 flex items-center justify-center border border-zeus-gold/20">
                            <i className="fas fa-pen text-zeus-gold"></i>
                        </div>
                        <h3 className="text-xl font-bold text-white">إعادة تسمية المحادثة</h3>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold mr-1">العنوان الجديد</label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 focus:border-zeus-gold/60 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:shadow-[0_0_15px_rgba(255,215,0,0.1)] transition-all text-lg font-sans"
                                placeholder="أدخل اسماً للمحادثة..."
                            />
                        </div>

                        <div className="flex gap-3 w-full mt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors border border-white/5"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={!title.trim()}
                                className={`
                                    flex-1 py-3 px-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-lg
                                    ${title.trim() 
                                        ? 'bg-zeus-gold text-black hover:bg-yellow-400 shadow-zeus-gold/20' 
                                        : 'bg-white/5 text-gray-500 cursor-not-allowed'
                                    }
                                `}
                            >
                                حفظ التغييرات
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};