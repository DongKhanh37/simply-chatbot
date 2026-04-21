import React, { useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

export function MessageInput({ onSend, disabled }) {
    const [text, setText] = useState('');

    const handleSend = () => {
        if (text.trim() && !disabled) {
            onSend(text.trim());
            setText('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className="chat-input-container">
            <div className="chat-input-wrapper">
                <input 
                    type="text" 
                    id="messageInput" 
                    placeholder={disabled ? "Đang xử lý..." : "Nhập tin nhắn..."} 
                    autoComplete="off"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                />
                <button className="send-btn" id="sendBtn" onClick={handleSend} disabled={disabled || !text.trim()}>
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
