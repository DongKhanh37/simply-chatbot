import React, { useEffect, useRef } from 'react';

export function MessageList({ messages, isTyping }) {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    return (
        <div className="chat-messages" id="chatMessages">
            {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.isUser ? 'user-message' : 'bot-message'}`}>
                    <div className="message-content">
                        <p>{msg.text}</p>
                        <span className="timestamp">{msg.time}</span>
                    </div>
                </div>
            ))}
            
            {isTyping && (
                <div className="message bot-message typing-container" id="typingIndicator">
                    <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
