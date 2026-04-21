import React, { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

export function MessageList({ messages, isTyping, onSendSuggestedQuestion }) {
    const messagesEndRef = useRef(null);
    const [selectedCitation, setSelectedCitation] = useState(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const renderTable = (tableData) => {
        if (!tableData || !tableData.headers || !tableData.rows) return null;
        return (
            <div className="message-table-wrapper">
                <table className="message-table">
                    <thead>
                        <tr>
                            {tableData.headers.map((h, i) => <th key={i}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.rows.map((row, i) => (
                            <tr key={i}>
                                {row.map((cell, j) => <td key={j}>{cell}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="chat-messages" id="chatMessages">
            {messages.map((msg, idx) => (
                <div key={idx} className={`message-wrapper ${msg.isUser ? 'user-wrapper' : 'bot-wrapper'}`}>
                    <div className={`message ${msg.isUser ? 'user-message' : 'bot-message'}`}>
                        <div className="message-content">
                            <p dangerouslySetInnerHTML={{ __html: msg.text ? msg.text.replace(/\n/g, '<br/>') : '' }}></p>
                            
                            {!msg.isUser && msg.table_data && renderTable(msg.table_data)}

                            {!msg.isUser && msg.citations && msg.citations.length > 0 && (
                                <div className="citations-list">
                                    {msg.citations.map((cit, cIdx) => (
                                        <div 
                                            key={cIdx} 
                                            className="citation-badge"
                                            onClick={() => setSelectedCitation(cit)}
                                        >
                                            <FileText size={14} />
                                            <span>{cit.file}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <span className="timestamp">{msg.time}</span>
                        </div>
                    </div>
                    
                    {!msg.isUser && msg.suggested_questions && msg.suggested_questions.length > 0 && idx === messages.length - 1 && (
                        <div className="suggested-questions">
                            {msg.suggested_questions.map((q, qIdx) => (
                                <button 
                                    key={qIdx} 
                                    className="suggestion-chip"
                                    onClick={() => onSendSuggestedQuestion(q)}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            
            {isTyping && (
                <div className="message-wrapper bot-wrapper">
                    <div className="message bot-message typing-container" id="typingIndicator">
                        <div className="typing-indicator">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />

            <BottomSheet 
                isOpen={!!selectedCitation} 
                onClose={() => setSelectedCitation(null)} 
                citation={selectedCitation} 
            />
        </div>
    );
}
