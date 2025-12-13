import React from 'react';

interface LoginScreenProps {
    onSignIn: () => void;
    isLoading?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSignIn, isLoading }) => {
    return (
        <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white relative overflow-hidden font-sans" dir="rtl">
            {/* خلفية متحركة */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zeus-gold/10 via-black to-black animate-pulse-slow"></div>
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
            
            <div className="z-10 bg-zeus-surface/80 backdrop-blur-xl p-10 rounded-3xl border border-zeus-gold/20 shadow-[0_0_100px_rgba(255,215,0,0.15)] text-center max-w-md w-full mx-4 transform transition-all hover:scale-[1.01] duration-500">
                <div className="relative w-28 h-28 mx-auto mb-8">
                    <div className="absolute inset-0 bg-zeus-gold/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-full h-full rounded-full bg-black border-2 border-zeus-gold flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.3)] animate-float">
                        <i className="fas fa-bolt text-6xl text-zeus-gold filter drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]"></i>
                    </div>
                </div>
                
                <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white via-zeus-gold to-white bg-clip-text text-transparent">
                    زيوس
                </h1>
                <p className="text-gray-400 mb-10 text-sm tracking-wide">بوابتك إلى الذكاء الاصطناعي المتقدم</p>
                
                {isLoading ? (
                    <div className="flex justify-center items-center py-4">
                        <div className="w-8 h-8 border-2 border-zeus-gold border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <button 
                        onClick={onSignIn}
                        className="group w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zeus-gold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transform hover:-translate-y-1"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 group-hover:brightness-0 transition-all" />
                        <span className="text-lg">تسجيل الدخول عبر Google</span>
                    </button>
                )}

                <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-gray-600 font-mono border-t border-white/5 pt-6">
                    <i className="fas fa-shield-alt"></i>
                    <span>Powered by Google Gemini & Firebase</span>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;