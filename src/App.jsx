import React, { useState, useEffect } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { KnowledgeLibrary } from './components/KnowledgeLibrary';
import { QuizMode } from './components/QuizMode';
import { initializeKnowledgeBase, fetchLocalAIResponse, generateIntro } from './utils/rag';

function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
}

function App() {
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [initProgress, setInitProgress] = useState('Đang đọc thư mục...');
    const [initialIntro, setInitialIntro] = useState(`Xin chào! Tôi có thể giúp gì cho bạn hôm nay?`);
    const [viewMode, setViewMode] = useState('chat'); // 'chat', 'library', 'quiz'

    useEffect(() => {
        const initRAG = async () => {
            try {
                const fileNames = await initializeKnowledgeBase((progress) => setInitProgress(progress));
                if (!fileNames || fileNames.length === 0) {
                    const errorMsg = `⚠️ Lỗi: Không tìm thấy tài liệu nào trong thư mục kiến thức (knowledge)! Vui lòng thêm file .txt hoặc .pdf vào src/knowledge.`;
                    setMessages([{ text: errorMsg, isUser: false, time: getCurrentTime() }]);
                    setInitialIntro(errorMsg);
                } else {
                    setInitProgress('Đang tạo lời chào...');
                    const introText = await generateIntro(fileNames);
                    setMessages([{ text: introText, isUser: false, time: getCurrentTime() }]);
                    setInitialIntro(introText);
                }
            } catch (err) {
                console.error("Lỗi khởi tạo RAG", err);
                const errorMsg = `Có lỗi khi khởi tạo RAG. Vui lòng kiểm tra lại.`;
                setMessages([{ text: errorMsg, isUser: false, time: getCurrentTime() }]);
                setInitialIntro(errorMsg);
            } finally {
                setIsInitializing(false);
            }
        };
        initRAG();
    }, []);

    const handleSendMessage = async (text) => {
        // Thêm tin nhắn của user
        const userMsg = { text, isUser: true, time: getCurrentTime() };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        // Gọi API Local AI (LM Studio) kết hợp RAG
        const botReply = await fetchLocalAIResponse(text);
        
        setIsTyping(false);
        // botReply is parsed JSON: { text, citations, suggested_questions, table_data }
        // If it failed and returned string, we handle it as fallback
        const botMsg = typeof botReply === 'string' ? { text: botReply } : botReply;
        
        setMessages(prev => [...prev, { ...botMsg, isUser: false, time: getCurrentTime() }]);
    };

    const handleClearChat = () => {
        setMessages([{
            text: initialIntro,
            isUser: false,
            time: getCurrentTime()
        }]);
    };

    const handleUndoChat = () => {
        setMessages(prev => {
            if (prev.length <= 1) return prev;
            
            let newMessages = [...prev];
            // Pop the bot response if it's the last message
            if (newMessages.length > 0 && !newMessages[newMessages.length - 1].isUser) {
                newMessages.pop();
            }
            // Pop the user prompt
            if (newMessages.length > 0 && newMessages[newMessages.length - 1].isUser) {
                newMessages.pop();
            }
            
            return newMessages.length > 0 ? newMessages : [{
                text: initialIntro,
                isUser: false,
                time: getCurrentTime()
            }];
        });
    };

    return (
        <div className="chat-wrapper">
            <div className="chat-container">
                <ChatHeader 
                    isInitializing={isInitializing} 
                    initProgress={initProgress} 
                    onClearChat={handleClearChat} 
                    onUndoChat={handleUndoChat} 
                    onOpenLibrary={() => setViewMode('library')}
                    onOpenQuiz={() => setViewMode('quiz')}
                />
                
                {viewMode === 'chat' && (
                    <>
                        <MessageList 
                            messages={messages} 
                            isTyping={isTyping} 
                            onSendSuggestedQuestion={handleSendMessage} 
                        />
                        <MessageInput onSend={handleSendMessage} disabled={isInitializing || isTyping} />
                    </>
                )}

                {viewMode === 'library' && <KnowledgeLibrary onClose={() => setViewMode('chat')} />}
                {viewMode === 'quiz' && <QuizMode onClose={() => setViewMode('chat')} />}
            </div>
        </div>
    );
}

export default App;
