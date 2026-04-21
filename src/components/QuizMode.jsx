import React, { useState, useEffect } from 'react';
import { X, BrainCircuit, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { generateQuiz } from '../utils/rag';

export function QuizMode({ onClose }) {
    const [quizData, setQuizData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        const loadQuiz = async () => {
            const data = await generateQuiz();
            if (data && data.questions && data.questions.length > 0) {
                setQuizData(data);
            }
            setLoading(false);
        };
        loadQuiz();
    }, []);

    if (loading) {
        return (
            <div className="quiz-container loading">
                <Loader2 size={40} className="spinner" />
                <p>Đang tạo câu hỏi trắc nghiệm...</p>
                <button className="close-quiz-btn outline" onClick={onClose}>Hủy</button>
            </div>
        );
    }

    if (!quizData) {
        return (
            <div className="quiz-container error">
                <BrainCircuit size={40} />
                <p>Không thể tạo bài tập lúc này. Xin thử lại sau.</p>
                <button className="primary-btn" onClick={onClose}>Quay lại Chat</button>
            </div>
        );
    }

    if (isFinished) {
        return (
            <div className="quiz-container results">
                <h2>Hoàn thành!</h2>
                <div className="score-circle">
                    <span>{score}</span> / {quizData.questions.length}
                </div>
                <p>Bạn đã trả lời đúng {score} trên {quizData.questions.length} câu hỏi.</p>
                <button className="primary-btn" onClick={onClose}>Quay lại Chat</button>
            </div>
        );
    }

    const currentQuestion = quizData.questions[currentQIndex];
    const hasAnswered = selectedOption !== null;

    const handleSelect = (index) => {
        if (hasAnswered) return;
        setSelectedOption(index);
        if (index === currentQuestion.correctAnswerIndex) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentQIndex < quizData.questions.length - 1) {
            setCurrentQIndex(prev => prev + 1);
            setSelectedOption(null);
        } else {
            setIsFinished(true);
        }
    };

    return (
        <div className="quiz-container">
            <div className="quiz-header">
                <div className="quiz-progress">
                    Câu {currentQIndex + 1} / {quizData.questions.length}
                </div>
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
            </div>

            <div className="quiz-content">
                <h3 className="question-text">{currentQuestion.question}</h3>
                <div className="options-list">
                    {currentQuestion.options.map((opt, idx) => {
                        let statusClass = '';
                        if (hasAnswered) {
                            if (idx === currentQuestion.correctAnswerIndex) statusClass = 'correct';
                            else if (idx === selectedOption) statusClass = 'incorrect';
                        }
                        return (
                            <button 
                                key={idx} 
                                className={`option-btn ${statusClass} ${selectedOption === idx ? 'selected' : ''}`}
                                onClick={() => handleSelect(idx)}
                                disabled={hasAnswered}
                            >
                                <span className="opt-text">{opt}</span>
                                {statusClass === 'correct' && <CheckCircle2 size={18} className="icon-correct" />}
                                {statusClass === 'incorrect' && <XCircle size={18} className="icon-incorrect" />}
                            </button>
                        );
                    })}
                </div>
                {hasAnswered && (
                    <div className="explanation-box">
                        <p>{currentQuestion.explanation}</p>
                    </div>
                )}
            </div>

            <div className="quiz-footer">
                <button 
                    className="primary-btn next-btn" 
                    disabled={!hasAnswered} 
                    onClick={handleNext}
                >
                    {currentQIndex < quizData.questions.length - 1 ? 'Tiếp tục' : 'Xem kết quả'}
                </button>
            </div>
        </div>
    );
}
