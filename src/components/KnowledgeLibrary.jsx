import React, { useState, useEffect } from 'react';
import { X, Search, File, FileText, Database } from 'lucide-react';
import { getKnowledgeFiles } from '../utils/rag';

export function KnowledgeLibrary({ onClose }) {
    const [files, setFiles] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        setFiles(getKnowledgeFiles());
    }, []);

    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="modal-overlay">
            <div className="library-modal">
                <div className="modal-header">
                    <h2><Database size={20} /> Thư viện tài liệu</h2>
                    <button className="close-btn" onClick={onClose}><X size={24} /></button>
                </div>
                <div className="modal-search">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm tài liệu..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="file-list">
                    {filteredFiles.map((file, idx) => (
                        <div key={idx} className="file-card">
                            <div className="file-icon">
                                {file.type === 'PDF' ? <File size={24} className="pdf-icon" /> : <FileText size={24} className="txt-icon" />}
                            </div>
                            <div className="file-info">
                                <h3>{file.name}</h3>
                                <span>{file.type} • {file.size}</span>
                            </div>
                            <button className="view-btn">Xem</button>
                        </div>
                    ))}
                    {filteredFiles.length === 0 && (
                        <div className="no-results">Không tìm thấy tài liệu nào.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
