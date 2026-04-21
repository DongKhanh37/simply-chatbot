import React from 'react';
import { X, FileText } from 'lucide-react';

export function BottomSheet({ isOpen, onClose, citation }) {
    if (!isOpen || !citation) return null;

    return (
        <div className={`bottom-sheet-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div className={`bottom-sheet ${isOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
                <div className="bottom-sheet-header">
                    <div className="sheet-title">
                        <FileText size={18} />
                        <span>{citation.file}</span>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="bottom-sheet-content">
                    <div className="citation-snippet">
                        <p>"{citation.text_snippet}"</p>
                    </div>
                    <div className="full-doc-placeholder">
                        <button className="primary-btn outline">Mở toàn bộ tài liệu</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
