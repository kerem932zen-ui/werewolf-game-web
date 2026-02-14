import { useState, useRef, useEffect } from 'react';
import './ChatBox.css';

export default function ChatBox({ messages, onSend }) {
    const [text, setText] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef(null);

    // Yeni mesaj gelince aşağı scroll
    useEffect(() => {
        if (scrollRef.current && isOpen) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length, isOpen]);

    function handleSend() {
        if (!text.trim()) return;
        onSend(text);
        setText('');
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
        // W/A/S/D tuşlarını engelle (oyun hareketi ile çakışmasın)
        e.stopPropagation();
    }

    // Chat mesajlarını filtrele (sadece chat ve system)
    const chatMessages = messages.filter((m) => m.type === 'chat' || m.type === 'system' || m.type === 'vote');

    if (!isOpen) {
        return (
            <button className="chat-toggle-btn" onClick={() => setIsOpen(true)}>
                💬
                {chatMessages.length > 0 && <span className="chat-badge">{Math.min(chatMessages.length, 99)}</span>}
            </button>
        );
    }

    return (
        <div className="chatbox">
            <div className="chatbox-header">
                <span>💬 Sohbet</span>
                <button className="chatbox-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>
            <div className="chatbox-messages" ref={scrollRef}>
                {chatMessages.length === 0 && (
                    <div className="chat-empty">Henüz mesaj yok...</div>
                )}
                {chatMessages.map((m, i) => (
                    <div key={i} className={`chat-msg chat-msg-${m.type}`}>
                        {m.type === 'chat' && <span className="chat-user">{m.username}:</span>}
                        <span className="chat-text">{m.text}</span>
                    </div>
                ))}
            </div>
            <div className="chatbox-input">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Mesaj yaz..."
                    maxLength={100}
                    autoComplete="off"
                />
                <button className="chat-send-btn" onClick={handleSend}>➤</button>
            </div>
        </div>
    );
}
