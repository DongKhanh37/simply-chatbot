import React, { useState, useRef, useEffect } from 'react';
import { Bot, MoreVertical, RefreshCw, Undo2, Book, Gamepad2 } from 'lucide-react';

export function ChatHeader({ isInitializing, initProgress, onClearChat, onUndoChat, onOpenLibrary, onOpenQuiz }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Đóng menu khi click ra ngoài
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    return (
        <div className="chat-header">
            <div className="user-info">
                <div className="avatar">
                    <img src="https://ui-avatars.com/api/?name=AI&background=6366f1&color=fff&rounded=true" alt="AI Avatar" />
                    <span className="status-dot online"></span>
                </div>
                <div className="user-details">
                    <h2>Trợ lý AI</h2>
                    <p>{isInitializing ? initProgress : 'Trực tuyến'}</p>
                </div>
            </div>
            <div className="header-actions" ref={menuRef}>
                <button 
                    className="action-btn" 
                    title="Thư viện tài liệu" 
                    onClick={onOpenLibrary}
                >
                    <Book size={20} />
                </button>
                <button 
                    className="action-btn" 
                    title="Luyện tập (Quiz)" 
                    onClick={onOpenQuiz}
                >
                    <Gamepad2 size={20} />
                </button>
                <button 
                    className="action-btn" 
                    title="Cài đặt" 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <MoreVertical size={20} />
                </button>
                
                {isMenuOpen && (
                    <div className="dropdown-menu">
                        <div 
                            className="dropdown-item" 
                            onClick={() => {
                                onClearChat();
                                setIsMenuOpen(false);
                            }}
                        >
                            <RefreshCw size={16} /> Làm mới chat
                        </div>
                        <div 
                            className="dropdown-item danger" 
                            onClick={() => {
                                onUndoChat();
                                setIsMenuOpen(false);
                            }}
                        >
                            <Undo2 size={16} /> Undo chat gần nhất
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
