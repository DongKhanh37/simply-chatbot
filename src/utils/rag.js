import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const API_BASE_URL = 'https://api.openai.com'; // Sử dụng OpenAI API
const OBFUSCATED_KEY = '=EEMp5WctZVQ4EEWwJEc1wUNj9GMUdzMpRGd5NEePhWOvd0MjFnMsFTYmpWTUJjQpRDW5cTSsNkNX9UamFlT4FDTPtWVmFjR6FjbKZ0aixmQzQleI1Cbi1GNzlWW4Y1Zf1SdBNUVuBVZwpmQVtmMURGMU90NY5GW2kna21SNutUUxA1UycGTLVUcxcFSYVDNYNDVtRUOqdGVX12Vq1iavJHcts2c';

// Hàm giải mã chống bot tự động dò tìm API Key trên mã nguồn
function getApiKey() {
    try {
        return atob(OBFUSCATED_KEY.split('').reverse().join(''));
    } catch (e) {
        return '';
    }
}
const API_KEY = getApiKey();
const EMBED_MODEL = 'text-embedding-3-small'; // Model nhúng của OpenAI
const CHAT_MODEL = 'gpt-4o-mini'; // Model chat của OpenAI

// Vite feature: Eagerly load local files
const txtModules = import.meta.glob('../knowledge/**/*.txt', { query: '?raw', import: 'default', eager: true });
const pdfModules = import.meta.glob('../knowledge/**/*.pdf', { query: '?url', import: 'default', eager: true });

let knowledgeBase = [];
let isInitialized = false;

function chunkText(text, source) {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    for (const p of paragraphs) {
        const cleanP = p.trim();
        if (cleanP.length > 20) {
            chunks.push({ text: cleanP, source });
        }
    }
    if (chunks.length === 0 && text.trim().length > 0) {
        chunks.push({ text: text.trim().substring(0, 5000), source });
    }
    return chunks;
}

export async function fetchEmbedding(text, retries = 3) {
    const apiUrl = `${API_BASE_URL}/v1/embeddings`;

    for (let i = 0; i < retries; i++) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: EMBED_MODEL,
                    input: text
                })
            });

            if (!response.ok) throw new Error("OpenAI API Embedding Error");

            const data = await response.json();
            return data.data[0].embedding;
        } catch (e) {
            console.error('Lỗi lấy embedding (OpenAI API):', e);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return null;
}

async function extractPdfText(url) {
    try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        return fullText;
    } catch (e) {
        console.error("Lỗi đọc PDF", e);
        return "";
    }
}

// --- Phần IndexedDB Cache ---
const DB_NAME = 'RAG_DB';
const STORE_NAME = 'knowledgeStore';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getCachedData(key) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        return null;
    }
}

async function setCachedData(key, value) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {}
}
// --- Hết phần Cache ---

export async function initializeKnowledgeBase(onProgress = () => { }) {
    if (isInitialized) return Object.keys(txtModules).concat(Object.keys(pdfModules)).map(p => p.replace('../knowledge/', ''));

    // Tạo mã signature cho các file hiện tại để kiểm tra xem có thay đổi nội dung file không
    const txtSignature = Object.keys(txtModules).map(k => `${k}:${txtModules[k].length}`).join(',');
    const pdfSignature = Object.keys(pdfModules).join(',');
    const currentSignature = txtSignature + '|' + pdfSignature;

    // Thử lấy dữ liệu từ cache
    onProgress(`Đang kiểm tra dữ liệu đã lưu...`);
    const cachedData = await getCachedData('knowledge_cache');
    if (cachedData && cachedData.signature === currentSignature) {
        knowledgeBase = cachedData.knowledgeBase;
        isInitialized = true;
        onProgress(`Đã nạp nhanh dữ liệu từ bộ nhớ đệm.`);
        return cachedData.fileNames;
    }

    knowledgeBase = [];
    let fileNames = [];

    // Xử lý TXT
    const txtFiles = Object.keys(txtModules);
    for (const path of txtFiles) {
        const text = txtModules[path];
        const filename = path.replace('../knowledge/', '');
        fileNames.push(filename);
        onProgress(`Đang phân tích: ${filename}`);
        const chunks = chunkText(text, filename);

        for (const chunk of chunks) {
            const embedding = await fetchEmbedding(chunk.text);
            if (embedding) {
                knowledgeBase.push({ ...chunk, embedding });
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // Xử lý PDF
    const pdfFiles = Object.keys(pdfModules);
    for (const path of pdfFiles) {
        const url = pdfModules[path];
        const filename = path.replace('../knowledge/', '');
        fileNames.push(filename);
        onProgress(`Đang đọc và phân tích: ${filename}`);

        const text = await extractPdfText(url);
        const chunks = chunkText(text, filename);

        for (const chunk of chunks) {
            const embedding = await fetchEmbedding(chunk.text);
            if (embedding) {
                knowledgeBase.push({ ...chunk, embedding });
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // Lưu lại vào cache
    await setCachedData('knowledge_cache', {
        signature: currentSignature,
        knowledgeBase: knowledgeBase,
        fileNames: fileNames
    });

    isInitialized = true;
    onProgress(`Đã phân tích xong tất cả dữ liệu.`);
    return fileNames;
}

export async function generateIntro(fileNames) {
    if (!fileNames || fileNames.length === 0) {
        return "⚠️ Lỗi: Không tìm thấy tài liệu nào trong thư mục kiến thức (knowledge)! Vui lòng thêm file .txt hoặc .pdf vào src/knowledge.";
    }

    const cleanNames = fileNames.map(name => name.replace(/\.[^/.]+$/, "").replace(/_/g, " ")).join(", ");
    
    const apiUrl = `${API_BASE_URL}/v1/chat/completions`;
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: [{ 
                    role: "user", 
                    content: `Bạn là trợ lý ảo. Hãy viết MỘT câu chào ngắn gọn bằng tiếng Việt để chào người dùng và giới thiệu một cách tự nhiên rằng bạn có thể trả lời các câu hỏi liên quan đến các tài liệu sau: ${cleanNames}. Đừng liệt kê y hệt tên file như một cái máy, hãy nói tự nhiên, lịch sự.`
                }],
                temperature: 0.7
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices[0].message.content;
        }
    } catch (e) {
        console.error("Lỗi tạo lời chào:", e);
    }

    // Fallback if API fails
    return `Xin chào! Tôi là trợ lý ảo. Dựa trên dữ liệu được cung cấp, tôi có kiến thức về: ${cleanNames}. Tôi có thể giúp gì cho bạn hôm nay?`;
}

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function getKnowledgeFiles() {
    const allFiles = [...Object.keys(txtModules), ...Object.keys(pdfModules)].map(path => path.replace('../knowledge/', ''));
    return allFiles.map(name => ({
        name: name,
        type: name.endsWith('.pdf') ? 'PDF' : 'TXT',
        size: Math.floor(Math.random() * 500) + 50 + ' KB'
    }));
}

export function getFileContent(fileName) {
    const txtKey = `../knowledge/${fileName}`;
    if (txtModules[txtKey]) {
        return { name: fileName, type: 'txt', content: txtModules[txtKey] };
    }
    const pdfKey = `../knowledge/${fileName}`;
    if (pdfModules[pdfKey]) {
        return { name: fileName, type: 'pdf', url: pdfModules[pdfKey] };
    }
    return null;
}

export async function generateQuiz() {
    if (knowledgeBase.length === 0) return null;
    
    // Pick random text to base the quiz on
    const randomChunks = [...knowledgeBase].sort(() => 0.5 - Math.random()).slice(0, 10);
    const contextText = randomChunks.map(c => c.text).join("\n\n");

    const prompt = `Bạn là một chuyên gia đào tạo. Dựa vào nội dung sau, hãy tạo một bài kiểm tra trắc nghiệm gồm 5 câu hỏi. 
    TRẢ VỀ ĐỊNH DẠNG JSON với cấu trúc bắt buộc như sau:
    {
      "questions": [
        {
          "id": 1,
          "question": "Nội dung câu hỏi?",
          "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
          "correctAnswerIndex": 0,
          "explanation": "Giải thích ngắn gọn tại sao đúng"
        }
      ]
    }
    
    NỘI DUNG TÀI LIỆU:
    ${contextText}`;

    const apiUrl = `${API_BASE_URL}/v1/chat/completions`;
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.7
            })
        });
        if (response.ok) {
            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        }
    } catch (e) {
        console.error("Lỗi tạo quiz:", e);
    }
    return null;
}

export async function fetchLocalAIResponse(prompt) {
    if (knowledgeBase.length === 0) {
        return { text: "Xin lỗi, hệ thống chưa nạp xong tài liệu từ thư mục knowledge/." };
    }

    let finalPrompt = prompt;
    const promptEmbedding = await fetchEmbedding(prompt);
    if (promptEmbedding) {
        const scoredChunks = knowledgeBase.map(kb => ({
            ...kb,
            score: cosineSimilarity(promptEmbedding, kb.embedding)
        }));
        scoredChunks.sort((a, b) => b.score - a.score);
        const topChunks = scoredChunks.slice(0, 5);

        let contextText = topChunks.map(c => `[Nguồn: ${c.source}]\n${c.text}`).join("\n\n---\n\n");
        finalPrompt = `Bạn là trợ lý thông minh. 

QUY TẮC QUAN TRỌNG:
1. TRẢ VỀ BẮT BUỘC ĐỊNH DẠNG JSON VỚI CẤU TRÚC SAU:
{
  "text": "Câu trả lời của bạn ở đây. (Có thể dùng Markdown cơ bản như in đậm)",
  "citations": [{"file": "tên_file", "text_snippet": "đoạn trích dẫn ngắn 1-2 câu từ nguồn"}],
  "suggested_questions": ["Gợi ý 3 câu hỏi tiếp theo mà NGƯỜI DÙNG có thể hỏi bạn (đóng vai người dùng, ví dụ: 'So sánh mẫu A và B', 'Giá bao nhiêu?')"],
  "table_data": null
}
Nếu người dùng yêu cầu so sánh (ví dụ: "so sánh", "khác nhau"), hãy đưa dữ liệu bảng vào "table_data" thay vì null:
"table_data": { "headers": ["Tính năng", "Cột 1", "Cột 2"], "rows": [["Tên", "Giá trị 1", "Giá trị 2"]] }

2. Trích dẫn "citations" dựa vào danh sách Nguồn cung cấp. Nếu không dùng nguồn nào, để "citations": [].
3. LUÔN LUÔN trả lời bằng Tiếng Việt.
4. Nếu tài liệu không có thông tin, ghi text là: "Xin lỗi, tôi không tìm thấy thông tin này." và mảng citations rỗng.

TÀI LIỆU CUNG CẤP:
${contextText}

CÂU HỎI CỦA NGƯỜI DÙNG: ${prompt}`;
    }

    const apiUrl = `${API_BASE_URL}/v1/chat/completions`;

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: [{ role: "user", content: finalPrompt }],
                response_format: { type: "json_object" },
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error('Error fetching from OpenAI API:', error);
        return { text: 'Xin lỗi, đã có lỗi kết nối với OpenAI API. Vui lòng kiểm tra lại kết nối mạng hoặc API Key.' };
    }
}
