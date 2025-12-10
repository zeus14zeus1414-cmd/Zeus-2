import React, { useState, useEffect } from 'react';

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
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
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} 
            dir="rtl"
            onClick={handleClose}
        >
            <div 
                className={`relative bg-zeus-surface border border-red-500/30 w-full max-w-sm rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.15)] p-6 overflow-hidden transition-all duration-300 ${isClosing ? 'scale-95 translate-y-4' : 'scale-100 translate-y-0'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full pointer-events-none"></div>

                <div className="flex flex-col items-center text-center relative z-10">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                        <i className="fas fa-sign-out-alt text-2xl text-red-500 pl-1"></i>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">تسجيل الخروج</h3>
                    <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                        هل أنت متأكد من رغبتك في تسجيل الخروج؟ <br/>
                        سيتم حفظ محادثاتك بأمان.
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
                            تأكيد الخروج
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
