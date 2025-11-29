
import React, { useRef, useState } from 'react';
import { Chat } from '../types';

interface Props {
    chats: Record<string, Chat>;
    currentChatId: string | null;
    onSelectChat: (id: string) => void;
    onNewChat: () => void;
    onDeleteChat: (id: string) => void;
    onEditTitle: (id: string, newTitle: string) => void;
    onClose: () => void;
    onReorder: (newOrder: Chat[]) => void; 
}

const Sidebar: React.FC<Props> = ({ 
    chats, currentChatId, onSelectChat, onNewChat, onDeleteChat, onEditTitle, onClose, onReorder 
}) => {
    const [draggedItem, setDraggedItem] = useState<Chat | null>(null);
    const dragOverItem = useRef<Chat | null>(null);

    // ترتيب المحادثات للعرض
    const sortedChats = (Object.values(chats) as Chat[]).sort((a, b) => b.order - a.order);

    const handleSort = () => {
        const chatsClone = [...sortedChats];
        
        const draggedIdx = chatsClone.findIndex(c => c.id === draggedItem?.id);
        const overIdx = chatsClone.findIndex(c => c.id === dragOverItem.current?.id);

        if (draggedIdx === -1 || overIdx === -1 || draggedIdx === overIdx) return;

        const draggedChat = chatsClone[draggedIdx];
        chatsClone.splice(draggedIdx, 1);
        chatsClone.splice(overIdx, 0, draggedChat);

        onReorder(chatsClone);
        setDraggedItem(null);
        dragOverItem.current = null;
    };

    return (
        <div className="flex flex-col h-full p-4 bg-zeus-surface border-l border-white/5">
            <div className="flex items-center justify-between mb-6 md:hidden">
                <h2 className="text-xl font-bold text-zeus-gold">السجل</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><i className="fas fa-times"></i></button>
            </div>

            <button 
                onClick={onNewChat}
                className="w-full py-3 px-4 mb-6 bg-zeus-gold text-black rounded-xl hover:bg-yellow-400 shadow-lg shadow-zeus-gold/20 transition-all flex items-center justify-center gap-2 group font-bold"
            >
                <i className="fas fa-plus transition-transform"></i>
                <span>محادثة جديدة</span>
            </button>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {sortedChats.length === 0 ? (
                    <div className="text-center text-gray-600 mt-10 text-sm flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                             <i className="fas fa-comments text-2xl opacity-50"></i>
                        </div>
                        <p>لا يوجد سجل محادثات</p>
                    </div>
                ) : (
                    sortedChats.map((chat) => (
                        <div 
                            key={chat.id}
                            draggable
                            onDragStart={() => setDraggedItem(chat)}
                            onDragEnter={() => (dragOverItem.current = chat)}
                            onDragEnd={handleSort}
                            onDragOver={(e) => e.preventDefault()}
                            className={`
                                group relative p-3 rounded-xl cursor-pointer border transition-all duration-200 flex flex-col
                                ${chat.id === currentChatId 
                                    ? 'bg-white/10 border-zeus-gold/40 shadow-[0_0_15px_rgba(255,215,0,0.05)]' 
                                    : 'bg-transparent border-transparent hover:bg-white/5'
                                }
                                ${draggedItem?.id === chat.id ? 'opacity-50 border-dashed border-white' : ''}
                            `}
                            onClick={() => onSelectChat(chat.id)}
                        >
                            <div className="flex justify-between items-start gap-2 w-full">
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-medium truncate ${chat.id === currentChatId ? 'text-zeus-gold' : 'text-gray-300'}`}>
                                        {chat.title}
                                    </h3>
                                    <p className="text-[10px] text-gray-500 truncate mt-1 font-mono">
                                        {chat.messages[chat.messages.length - 1]?.content.slice(0, 30) || '...'}
                                    </p>
                                </div>
                            </div>

                            {/* أزرار التحكم - تظهر فقط عند التحويم أو النشاط */}
                            <div className={`
                                flex items-center gap-2 mt-3 pt-2 border-t border-white/5 justify-end
                                ${chat.id === currentChatId ? 'flex' : 'hidden group-hover:flex'}
                            `}>
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const newTitle = prompt("تعديل العنوان", chat.title);
                                        if (newTitle) onEditTitle(chat.id, newTitle);
                                    }}
                                    className="p-1.5 px-3 rounded-md bg-black/40 hover:bg-blue-500/20 hover:text-blue-400 text-gray-400 text-xs transition-colors flex items-center gap-1"
                                    title="تعديل الاسم"
                                >
                                    <i className="fas fa-pen"></i>
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if(confirm('هل أنت متأكد من حذف هذه المحادثة؟')) onDeleteChat(chat.id);
                                    }}
                                    className="p-1.5 px-3 rounded-md bg-black/40 hover:bg-red-500/20 hover:text-red-400 text-gray-400 text-xs transition-colors flex items-center gap-1"
                                    title="حذف"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-zeus-gold/10 text-xs text-center text-gray-600 font-mono">
                ZEUS 2.0
            </div>
        </div>
    );
};

export default Sidebar;
